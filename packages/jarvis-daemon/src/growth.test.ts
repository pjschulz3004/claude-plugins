import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock council module BEFORE importing growth
vi.mock("./council.js", () => ({
	assembleCouncil: vi.fn(() => [{ name: "MockReviewer", chat: vi.fn() }]),
	conveneCouncil: vi.fn(),
}));

import {
	runGrowthLoop,
	buildReflectionPrompt,
	type GrowthConfig,
	type GrowthSessionResult,
} from "./growth.js";
import { conveneCouncil, assembleCouncil } from "./council.js";
import type { CouncilVerdict } from "./council.js";
import type { ClaudeResult } from "./dispatcher.js";
import type { CorrectionStore } from "./state/telemetry.js";

const MOCK_CLAUDE_RESULT: ClaudeResult = {
	type: "result",
	subtype: "success",
	result: "Improved email triage prompt for better classification.",
	session_id: "test-session",
	total_cost_usd: 0.05,
	duration_ms: 30000,
	usage: { input_tokens: 5000, output_tokens: 2000, cache_read_input_tokens: 0 },
};

const APPROVED_VERDICT: CouncilVerdict = {
	approved: true,
	approvalCount: 2,
	totalMembers: 2,
	rounds: [],
	summary: "Council approved unanimously.",
};

const REJECTED_VERDICT: CouncilVerdict = {
	approved: false,
	approvalCount: 0,
	totalMembers: 2,
	rounds: [],
	summary: "Council REJECTED. Concerns: over-engineering.",
};

function makeGitExecFn(opts: {
	headBefore?: string;
	headAfter?: string;
	diff?: string;
	npmTestOutput?: string;
}) {
	const headBefore = opts.headBefore ?? "aaa1111";
	const headAfter = opts.headAfter ?? "bbb2222";
	const diff = opts.diff ?? "diff --git a/foo.ts\n+console.log('hello')";
	let callCount = 0;
	const calls: string[][] = [];

	const fn = (args: string[]): string => {
		calls.push([...args]);
		if (args[0] === "rev-parse" && args[1] === "HEAD") {
			callCount++;
			// First call = headBefore, second call = headAfter, subsequent = headAfter
			return callCount === 1 ? headBefore : headAfter;
		}
		if (args[0] === "diff") return diff;
		if (args[0] === "revert") return "";
		return "";
	};

	return { fn, calls };
}

function makeConfig(overrides: Partial<GrowthConfig> = {}): GrowthConfig {
	// Mock isWithinWindow by using startHour=0, endHour=24
	// and controlling via maxRounds or breaking after 1 round
	const mockDispatcher = {
		dispatch: vi.fn().mockResolvedValue(MOCK_CLAUDE_RESULT),
	} as any;

	const mockLedger = {
		record: vi.fn(),
		getRecentAll: vi.fn(() => []),
	} as any;

	const mockCorrections = {
		rollingCorrectionRate: vi.fn(() => 0.05),
	} as unknown as CorrectionStore;

	return {
		dispatcher: mockDispatcher,
		ledger: mockLedger,
		corrections: mockCorrections,
		taskNames: ["email_triage", "budget_review"],
		repoRoot: "/tmp/test-repo",
		startHour: 0,
		endHour: 24,
		pauseBetweenRoundsMs: 0,
		maxTurnsPerRound: 5,
		timeoutPerRoundMs: 60_000,
		maxRounds: 1, // Limit to 1 round for testing
		...overrides,
	} as any;
}

describe("growth engine", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Default: council approves
		vi.mocked(conveneCouncil).mockResolvedValue(APPROVED_VERDICT);
		vi.mocked(assembleCouncil).mockReturnValue([
			{ name: "MockReviewer", chat: vi.fn() },
		]);
	});

	describe("council integration", () => {
		it("Test 1: calls conveneCouncil with git diff after successful round", async () => {
			const { fn: gitExec, calls: gitCalls } = makeGitExecFn({});
			const cfg = makeConfig({ gitExecFn: gitExec } as any);

			await runGrowthLoop(cfg);

			expect(conveneCouncil).toHaveBeenCalledTimes(1);
			const callArgs = vi.mocked(conveneCouncil).mock.calls[0];
			// Second arg is ReviewContext
			expect(callArgs[1].diff).toContain("diff --git");
		});

		it("Test 2: reverts commit when council rejects", async () => {
			vi.mocked(conveneCouncil).mockResolvedValue(REJECTED_VERDICT);
			const { fn: gitExec, calls: gitCalls } = makeGitExecFn({});
			const cfg = makeConfig({ gitExecFn: gitExec } as any);

			const result = await runGrowthLoop(cfg);

			// Should have called git revert
			const revertCall = gitCalls.find((c) => c[0] === "revert");
			expect(revertCall).toBeDefined();
			expect(revertCall).toEqual(["revert", "--no-edit", "HEAD"]);

			// Summary should mention rejection
			expect(result.roundSummaries[0]).toContain("COUNCIL REJECTED");
		});

		it("Test 5: commit stands when council approves and no regression", async () => {
			vi.mocked(conveneCouncil).mockResolvedValue(APPROVED_VERDICT);
			const { fn: gitExec, calls: gitCalls } = makeGitExecFn({});
			const cfg = makeConfig({ gitExecFn: gitExec } as any);

			const result = await runGrowthLoop(cfg);

			// No revert should have been called
			const revertCall = gitCalls.find((c) => c[0] === "revert");
			expect(revertCall).toBeUndefined();

			// Result should be successful
			expect(result.roundsExecuted).toBe(1);
			expect(result.roundSummaries.length).toBe(1);
			expect(result.roundSummaries[0]).not.toContain("REJECTED");
			expect(result.roundSummaries[0]).not.toContain("REGRESSION");
		});
	});

	describe("regression detection", () => {
		it("Test 3: snapshots rates before dispatch and checks after commit", async () => {
			const mockCorrections = {
				rollingCorrectionRate: vi.fn(() => 0.05),
			} as unknown as CorrectionStore;

			const { fn: gitExec } = makeGitExecFn({});
			const cfg = makeConfig({
				corrections: mockCorrections,
				gitExecFn: gitExec,
			} as any);

			await runGrowthLoop(cfg);

			// rollingCorrectionRate should be called multiple times:
			// once during snapshotRates (before dispatch), once for prompt building,
			// and once during checkForRegression (after commit)
			expect(mockCorrections.rollingCorrectionRate).toHaveBeenCalled();
		});

		it("Test 4: reverts + logs + marks backlog on regression", async () => {
			// Create a real temp dir so logRegression can write GROWTH_LOG.md
			const tmpDir = mkdtempSync(join(tmpdir(), "growth-test-"));
			writeFileSync(join(tmpDir, "GROWTH_LOG.md"), "# Growth Log\n");
			writeFileSync(join(tmpDir, "GROWTH_BACKLOG.md"), "# Backlog\n\n### growth round 1\n");
			// Also need packages/jarvis/ dir for readFileOrDefault
			mkdirSync(join(tmpDir, "packages", "jarvis"), { recursive: true });

			// Create a correction store where rates INCREASE after dispatch
			let callCount = 0;
			const mockCorrections = {
				rollingCorrectionRate: vi.fn(() => {
					callCount++;
					// First calls (snapshot + prompt building) = low rate, later calls (check) = high rate
					return callCount <= 4 ? 0.05 : 0.5;
				}),
			} as unknown as CorrectionStore;

			const { fn: gitExec, calls: gitCalls } = makeGitExecFn({});
			const cfg = makeConfig({
				corrections: mockCorrections,
				gitExecFn: gitExec,
				repoRoot: tmpDir,
			} as any);

			const result = await runGrowthLoop(cfg);

			// Should have reverted due to regression
			const revertCall = gitCalls.find((c) => c[0] === "revert");
			expect(revertCall).toBeDefined();

			// Summary should mention regression
			expect(result.roundSummaries[0]).toContain("REGRESSION");
		});
	});

	describe("prompt enrichment", () => {
		it("Test 6: buildReflectionPrompt includes improve skill procedure", () => {
			const prompt = buildReflectionPrompt(
				"I am Jarvis",
				"all tasks ok",
				"backlog items",
				"previous log",
				1,
				"email_triage: 5.0%",
				"Step 1: Reflect\nStep 2: Pick",
			);

			expect(prompt).toContain("<procedure>");
			expect(prompt).toContain("Step 1: Reflect");
			expect(prompt).toContain("Step 2: Pick");
		});

		it("Test 7: buildReflectionPrompt includes correction rates", () => {
			const prompt = buildReflectionPrompt(
				"I am Jarvis",
				"all tasks ok",
				"backlog items",
				"previous log",
				1,
				"email_triage: 5.0%\nbudget_review: 2.3%",
				"some procedure",
			);

			expect(prompt).toContain("<correction_rates>");
			expect(prompt).toContain("email_triage: 5.0%");
			expect(prompt).toContain("budget_review: 2.3%");
		});

		it("prompt mandates running npm test before committing", () => {
			const prompt = buildReflectionPrompt(
				"mission",
				"ledger",
				"backlog",
				"log",
				1,
				"rates",
				"procedure",
			);

			expect(prompt).toContain("npm test");
			expect(prompt).toContain("npm run build");
			expect(prompt).toContain("MANDATORY");
		});
	});

	describe("session result", () => {
		it("Test 8: returns GrowthSessionResult with accumulated summaries", async () => {
			const { fn: gitExec } = makeGitExecFn({});
			const cfg = makeConfig({
				maxRounds: 2,
				gitExecFn: gitExec,
			} as any);

			const result = await runGrowthLoop(cfg);

			expect(result).toHaveProperty("roundsExecuted");
			expect(result).toHaveProperty("roundSummaries");
			expect(result).toHaveProperty("totalCostUsd");
			expect(typeof result.roundsExecuted).toBe("number");
			expect(Array.isArray(result.roundSummaries)).toBe(true);
			expect(typeof result.totalCostUsd).toBe("number");
		});
	});
});
