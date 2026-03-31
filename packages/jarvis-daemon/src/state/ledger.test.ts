import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskLedger } from "./ledger.js";
import type { LedgerEntry } from "@jarvis/shared";

describe("TaskLedger", () => {
	let ledger: TaskLedger;

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
	});

	afterEach(() => {
		ledger.close();
	});

	it("creates SQLite table on init", () => {
		// If we got here without error, the table was created.
		// Verify by recording an entry.
		const id = ledger.record({
			task_name: "test_task",
			status: "success",
			started_at: new Date().toISOString(),
			duration_ms: 100,
		});
		expect(id).toBeGreaterThan(0);
	});

	it("record() inserts a LedgerEntry and returns the id", () => {
		const entry: LedgerEntry = {
			task_name: "email_triage",
			status: "success",
			started_at: "2026-03-31T10:07:00Z",
			duration_ms: 4500,
			cost_usd: 0.001,
			input_tokens: 100,
			output_tokens: 50,
		};
		const id = ledger.record(entry);
		expect(typeof id).toBe("number");
		expect(id).toBeGreaterThan(0);
	});

	it("getRecent() returns N most recent entries for a task, newest first", () => {
		for (let i = 0; i < 5; i++) {
			ledger.record({
				task_name: "email_triage",
				status: "success",
				started_at: `2026-03-31T10:0${i}:00Z`,
				duration_ms: 1000 + i,
			});
		}
		// Add a different task
		ledger.record({
			task_name: "other_task",
			status: "success",
			started_at: "2026-03-31T11:00:00Z",
			duration_ms: 500,
		});

		const recent = ledger.getRecent("email_triage", 3);
		expect(recent).toHaveLength(3);
		// Newest first
		expect(recent[0].started_at).toBe("2026-03-31T10:04:00Z");
		expect(recent[1].started_at).toBe("2026-03-31T10:03:00Z");
		expect(recent[2].started_at).toBe("2026-03-31T10:02:00Z");
	});

	it("getRecent() defaults to limit 10", () => {
		for (let i = 0; i < 15; i++) {
			ledger.record({
				task_name: "test",
				status: "success",
				started_at: `2026-03-31T${String(i).padStart(2, "0")}:00:00Z`,
				duration_ms: 100,
			});
		}
		const recent = ledger.getRecent("test");
		expect(recent).toHaveLength(10);
	});

	it("getConsecutiveFailures() returns count of failures since last success", () => {
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: "2026-03-31T10:00:00Z",
			duration_ms: 100,
		});
		ledger.record({
			task_name: "email_triage",
			status: "failure",
			started_at: "2026-03-31T10:01:00Z",
			duration_ms: 100,
			error: "timeout",
		});
		ledger.record({
			task_name: "email_triage",
			status: "failure",
			started_at: "2026-03-31T10:02:00Z",
			duration_ms: 100,
			error: "timeout",
		});

		expect(ledger.getConsecutiveFailures("email_triage")).toBe(2);
	});

	it("getConsecutiveFailures() returns 0 when last entry is success", () => {
		ledger.record({
			task_name: "email_triage",
			status: "failure",
			started_at: "2026-03-31T10:00:00Z",
			duration_ms: 100,
			error: "err",
		});
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: "2026-03-31T10:01:00Z",
			duration_ms: 100,
		});

		expect(ledger.getConsecutiveFailures("email_triage")).toBe(0);
	});

	it("getConsecutiveFailures() returns 0 for unknown task", () => {
		expect(ledger.getConsecutiveFailures("nonexistent")).toBe(0);
	});

	it("prune() deletes entries older than N days", () => {
		const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
		const recent = new Date().toISOString();

		ledger.record({
			task_name: "test",
			status: "success",
			started_at: old,
			duration_ms: 100,
		});
		ledger.record({
			task_name: "test",
			status: "success",
			started_at: recent,
			duration_ms: 100,
		});

		const pruned = ledger.prune(30);
		expect(pruned).toBe(1);

		const remaining = ledger.getRecent("test");
		expect(remaining).toHaveLength(1);
	});
});
