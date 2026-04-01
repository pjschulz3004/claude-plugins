import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskLedger } from "./ledger.js";
import { CorrectionStore } from "./telemetry.js";
import { RegressionDetector } from "./regression.js";
import type { RateSnapshot } from "./regression.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("RegressionDetector", () => {
	let ledger: TaskLedger;
	let corrections: CorrectionStore;
	let tmpDir: string;
	let gitCommands: string[][];

	const mockExecFn = (args: string[]): string => {
		gitCommands.push(args);
		if (args[0] === "revert") return "";
		if (args[0] === "rev-parse") return "abc1234";
		return "";
	};

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
		corrections = new CorrectionStore(ledger.database);
		tmpDir = mkdtempSync(join(tmpdir(), "regression-test-"));
		gitCommands = [];
	});

	afterEach(() => {
		ledger.close();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	function insertDecisions(taskName: string, count: number): void {
		const now = new Date();
		const stmt = ledger.database.prepare(
			"INSERT INTO task_runs (task_name, status, started_at, duration_ms, decision_summary) VALUES (?, ?, ?, ?, ?)",
		);
		for (let i = 0; i < count; i++) {
			stmt.run(
				taskName,
				"success",
				new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
				1000,
				"some_decision",
			);
		}
	}

	function insertCorrections(taskName: string, count: number): void {
		const now = new Date();
		for (let i = 0; i < count; i++) {
			corrections.recordCorrection({
				task_name: taskName,
				original_decision: "wrong",
				corrected_decision: "right",
				decided_at: new Date(now.getTime() - (i + 2) * 3600000).toISOString(),
				corrected_at: new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
			});
		}
	}

	describe("snapshotRates()", () => {
		it("captures correct rates from CorrectionStore", () => {
			insertDecisions("email_triage", 10);
			insertCorrections("email_triage", 2);

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: ["email_triage"] },
				mockExecFn,
			);

			const snapshot = detector.snapshotRates();
			expect(snapshot.rates.get("email_triage")).toBeCloseTo(0.2);
			expect(snapshot.capturedAt).toBeTruthy();
			expect(new Date(snapshot.capturedAt).getTime()).toBeLessThanOrEqual(Date.now());
		});
	});

	describe("checkForRegression()", () => {
		it("detects rate increase -> regressed=true", () => {
			insertDecisions("email_triage", 10);
			// Snapshot with 1 correction (rate = 0.1)
			insertCorrections("email_triage", 1);

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: ["email_triage"] },
				mockExecFn,
			);

			// Create snapshot at rate=0.1
			const snapshot: RateSnapshot = {
				rates: new Map([["email_triage", 0.1]]),
				capturedAt: new Date().toISOString(),
			};

			// Current rate is 0.1 (1/10), but we faked the snapshot lower
			// Actually insert more corrections to make current rate higher
			insertCorrections("email_triage", 2); // now 3 corrections / 10 decisions = 0.3

			const result = detector.checkForRegression(snapshot);
			expect(result.regressed).toBe(true);
			expect(result.details.length).toBeGreaterThan(0);
			const detail = result.details.find((d) => d.taskName === "email_triage");
			expect(detail).toBeDefined();
			expect(detail!.delta).toBeGreaterThan(0);
		});

		it("stable/decreased rate -> regressed=false", () => {
			insertDecisions("email_triage", 10);
			insertCorrections("email_triage", 2);

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: ["email_triage"] },
				mockExecFn,
			);

			// Snapshot with higher rate than current
			const snapshot: RateSnapshot = {
				rates: new Map([["email_triage", 0.5]]),
				capturedAt: new Date().toISOString(),
			};

			const result = detector.checkForRegression(snapshot);
			expect(result.regressed).toBe(false);
		});
	});

	describe("revertCommit()", () => {
		it("validates hash format (rejects injection attempts)", () => {
			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: [] },
				mockExecFn,
			);

			expect(() => detector.revertCommit("foo; rm -rf /")).toThrow();
			expect(() => detector.revertCommit("")).toThrow();
			expect(() => detector.revertCommit("ZZZZZZZZ")).toThrow();
		});

		it("constructs correct git args for valid hash", () => {
			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: [] },
				mockExecFn,
			);

			const revertHash = detector.revertCommit("abc1234");
			expect(gitCommands[0]).toEqual(["revert", "--no-edit", "abc1234"]);
			expect(gitCommands[1]).toEqual(["rev-parse", "HEAD"]);
			expect(revertHash).toBe("abc1234");
		});
	});

	describe("logRegression()", () => {
		it("writes correct markdown format to GROWTH_LOG.md", () => {
			const logPath = join(tmpDir, "GROWTH_LOG.md");
			writeFileSync(logPath, "# Growth Log\n\n## Sessions\n");

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: [] },
				mockExecFn,
			);

			detector.logRegression(
				{
					regressed: true,
					details: [
						{ taskName: "email_triage", rateBefore: 0.1, rateAfter: 0.3, delta: 0.2 },
					],
				},
				"bad1234",
				"rev5678",
			);

			const content = readFileSync(logPath, "utf8");
			expect(content).toContain("Regression Detected");
			expect(content).toContain("bad1234");
			expect(content).toContain("rev5678");
			expect(content).toContain("email_triage");
			expect(content).toContain("0.100");
			expect(content).toContain("0.300");
		});
	});

	describe("markBacklogReverted()", () => {
		it("modifies the correct line in GROWTH_BACKLOG.md", () => {
			const backlogPath = join(tmpDir, "GROWTH_BACKLOG.md");
			writeFileSync(
				backlogPath,
				"# Growth Backlog\n\n### GB-001 Fix email_triage intermittent failures\n**Status:** queued\n",
			);

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: [] },
				mockExecFn,
			);

			detector.markBacklogReverted("Fix email_triage intermittent failures", "rate increase in email_triage");

			const content = readFileSync(backlogPath, "utf8");
			expect(content).toContain("[REVERTED: rate increase in email_triage]");
		});

		it("handles missing file gracefully", () => {
			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: [] },
				mockExecFn,
			);

			// Should not throw
			expect(() =>
				detector.markBacklogReverted("nonexistent item", "reason"),
			).not.toThrow();
		});
	});

	describe("full integration flow", () => {
		it("snapshot -> insert corrections -> check -> revert -> log -> mark", () => {
			// Setup: 10 decisions, 1 correction for email_triage
			insertDecisions("email_triage", 10);
			insertCorrections("email_triage", 1);

			// Create GROWTH_LOG.md and GROWTH_BACKLOG.md
			writeFileSync(join(tmpDir, "GROWTH_LOG.md"), "# Growth Log\n");
			writeFileSync(
				join(tmpDir, "GROWTH_BACKLOG.md"),
				"# Growth Backlog\n\n### GB-001 Tune email prompts\n**Status:** in-progress\n",
			);

			const detector = new RegressionDetector(
				{ corrections, repoRoot: tmpDir, taskNames: ["email_triage"] },
				mockExecFn,
			);

			// 1. Snapshot before commit
			const snapshot = detector.snapshotRates();
			expect(snapshot.rates.get("email_triage")).toBeCloseTo(0.1);

			// 2. Simulate growth commit causing regression (add more corrections)
			insertCorrections("email_triage", 3); // now 4/10 = 0.4

			// 3. Check for regression
			const result = detector.checkForRegression(snapshot);
			expect(result.regressed).toBe(true);

			// 4. Revert
			const revertHash = detector.revertCommit("deadbeef");
			expect(revertHash).toBe("abc1234");

			// 5. Log
			detector.logRegression(result, "deadbeef", revertHash);
			const logContent = readFileSync(join(tmpDir, "GROWTH_LOG.md"), "utf8");
			expect(logContent).toContain("deadbeef");

			// 6. Mark backlog
			detector.markBacklogReverted("Tune email prompts", "regression detected");
			const backlogContent = readFileSync(join(tmpDir, "GROWTH_BACKLOG.md"), "utf8");
			expect(backlogContent).toContain("[REVERTED: regression detected]");
		});
	});
});
