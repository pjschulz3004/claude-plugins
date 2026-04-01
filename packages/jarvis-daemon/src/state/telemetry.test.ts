import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskLedger } from "./ledger.js";
import { CorrectionStore } from "./telemetry.js";
import type { CorrectionEvent } from "./telemetry.js";

describe("CorrectionStore", () => {
	let ledger: TaskLedger;
	let store: CorrectionStore;

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
		store = new CorrectionStore(ledger.database);
	});

	afterEach(() => {
		ledger.close();
	});

	it("creates correction_events table on init", () => {
		const id = store.recordCorrection({
			task_name: "email_triage",
			original_decision: "archive",
			corrected_decision: "reply",
			decided_at: "2026-04-01T10:00:00Z",
			corrected_at: "2026-04-01T10:05:00Z",
		});
		expect(id).toBeGreaterThan(0);
	});

	it("recordCorrection() inserts a row and returns the id", () => {
		const event: CorrectionEvent = {
			task_name: "email_triage",
			original_decision: "archive",
			corrected_decision: "reply",
			decided_at: "2026-04-01T10:00:00Z",
			corrected_at: "2026-04-01T10:05:00Z",
		};
		const id = store.recordCorrection(event);
		expect(typeof id).toBe("number");
		expect(id).toBeGreaterThan(0);
	});

	it("getCorrections(taskName) returns corrections filtered by task_name, newest first", () => {
		store.recordCorrection({
			task_name: "email_triage",
			original_decision: "archive",
			corrected_decision: "reply",
			decided_at: "2026-04-01T10:00:00Z",
			corrected_at: "2026-04-01T10:01:00Z",
		});
		store.recordCorrection({
			task_name: "email_triage",
			original_decision: "skip",
			corrected_decision: "forward",
			decided_at: "2026-04-01T11:00:00Z",
			corrected_at: "2026-04-01T11:05:00Z",
		});
		store.recordCorrection({
			task_name: "other_task",
			original_decision: "a",
			corrected_decision: "b",
			decided_at: "2026-04-01T12:00:00Z",
			corrected_at: "2026-04-01T12:01:00Z",
		});

		const results = store.getCorrections("email_triage");
		expect(results).toHaveLength(2);
		expect(results[0].corrected_at).toBe("2026-04-01T11:05:00Z");
		expect(results[1].corrected_at).toBe("2026-04-01T10:01:00Z");
		expect(results.every((r) => r.task_name === "email_triage")).toBe(true);
	});

	it("getCorrections() with no filter returns all corrections", () => {
		store.recordCorrection({
			task_name: "email_triage",
			original_decision: "archive",
			corrected_decision: "reply",
			decided_at: "2026-04-01T10:00:00Z",
			corrected_at: "2026-04-01T10:01:00Z",
		});
		store.recordCorrection({
			task_name: "calendar_check",
			original_decision: "skip",
			corrected_decision: "attend",
			decided_at: "2026-04-01T11:00:00Z",
			corrected_at: "2026-04-01T11:01:00Z",
		});

		const results = store.getCorrections();
		expect(results).toHaveLength(2);
	});

	it("rollingCorrectionRate() returns corrections/decisions ratio for last 7 days", () => {
		const now = new Date();

		// Insert 4 decisions (task_runs with decision_summary)
		const insertRun = ledger.database.prepare(
			"INSERT INTO task_runs (task_name, status, started_at, duration_ms, decision_summary) VALUES (?, ?, ?, ?, ?)",
		);
		for (let i = 0; i < 4; i++) {
			insertRun.run(
				"email_triage",
				"success",
				new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
				1000,
				"archive",
			);
		}

		// Insert 1 correction
		store.recordCorrection({
			task_name: "email_triage",
			original_decision: "archive",
			corrected_decision: "reply",
			decided_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
			corrected_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
		});

		const rate = store.rollingCorrectionRate("email_triage", 7);
		expect(rate).toBeCloseTo(0.25); // 1 correction / 4 decisions
	});

	it("rollingCorrectionRate() with 30-day window works", () => {
		const now = new Date();

		// 10 decisions spread over 25 days
		const insertRun = ledger.database.prepare(
			"INSERT INTO task_runs (task_name, status, started_at, duration_ms, decision_summary) VALUES (?, ?, ?, ?, ?)",
		);
		for (let i = 0; i < 10; i++) {
			insertRun.run(
				"email_triage",
				"success",
				new Date(now.getTime() - (i + 1) * 2 * 86400000).toISOString(),
				1000,
				"archive",
			);
		}

		// 2 corrections within 30 days
		for (let i = 0; i < 2; i++) {
			store.recordCorrection({
				task_name: "email_triage",
				original_decision: "archive",
				corrected_decision: "reply",
				decided_at: new Date(now.getTime() - (i + 1) * 3 * 86400000).toISOString(),
				corrected_at: new Date(now.getTime() - i * 3 * 86400000).toISOString(),
			});
		}

		const rate = store.rollingCorrectionRate("email_triage", 30);
		expect(rate).toBeCloseTo(0.2); // 2 corrections / 10 decisions
	});

	it("rollingCorrectionRate() returns 0 when no decisions exist", () => {
		const rate = store.rollingCorrectionRate("email_triage", 7);
		expect(rate).toBe(0);
	});

	it("rollingCorrectionRate() returns 0 when no corrections exist", () => {
		const now = new Date();
		const insertRun = ledger.database.prepare(
			"INSERT INTO task_runs (task_name, status, started_at, duration_ms, decision_summary) VALUES (?, ?, ?, ?, ?)",
		);
		insertRun.run(
			"email_triage",
			"success",
			new Date(now.getTime() - 86400000).toISOString(),
			1000,
			"archive",
		);

		const rate = store.rollingCorrectionRate("email_triage", 7);
		expect(rate).toBe(0);
	});
});
