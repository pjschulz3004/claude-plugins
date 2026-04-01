import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskLedger } from "./state/ledger.js";
import { collectWeeklyDigest, formatWeeklyDigest } from "./weekly-digest.js";

function recentIso(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return d.toISOString();
}

describe("collectWeeklyDigest", () => {
	let ledger: TaskLedger;

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
	});

	afterEach(() => {
		ledger.close();
	});

	it("returns zero stats when ledger is empty", () => {
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.runs).toBe(0);
		expect(stats.failures).toBe(0);
		expect(stats.actions).toEqual({ trash: 0, flag: 0, read: 0, notify: 0 });
		expect(stats.cleanupTrashed).toBe(0);
	});

	it("excludes entries older than daysBack", () => {
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: recentIso(10), // 10 days ago, outside 7-day window
			duration_ms: 1000,
		});
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.runs).toBe(0);
	});

	it("counts successes and failures correctly", () => {
		for (let i = 0; i < 5; i++) {
			ledger.record({
				task_name: "email_triage",
				status: "success",
				started_at: recentIso(1),
				duration_ms: 1000,
			});
		}
		ledger.record({
			task_name: "email_triage",
			status: "failure",
			started_at: recentIso(2),
			duration_ms: 0,
			error: "timeout",
		});
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.runs).toBe(6);
		expect(stats.failures).toBe(1);
	});

	it("parses action counts from decision_summary", () => {
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: recentIso(1),
			duration_ms: 1000,
			decision_summary: JSON.stringify({
				decisions: [
					{ action: "trash" },
					{ action: "flag" },
					{ action: "read" },
					{ action: "read" },
					{ action: "notify" },
				],
			}),
		});
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.actions.trash).toBe(1);
		expect(stats.actions.flag).toBe(1);
		expect(stats.actions.read).toBe(2);
		expect(stats.actions.notify).toBe(1);
	});

	it("sums cleanup trashed count from email_cleanup entries", () => {
		ledger.record({
			task_name: "email_cleanup",
			status: "success",
			started_at: recentIso(1),
			duration_ms: 500,
			decision_summary: JSON.stringify({ trashed: 4, ids: ["a", "b", "c", "d"] }),
		});
		ledger.record({
			task_name: "email_cleanup",
			status: "success",
			started_at: recentIso(3),
			duration_ms: 500,
			decision_summary: JSON.stringify({ trashed: 2, ids: ["e", "f"] }),
		});
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.cleanupTrashed).toBe(6);
	});

	it("skips malformed decision_summary without throwing", () => {
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: recentIso(1),
			duration_ms: 1000,
			decision_summary: "not valid json {{{",
		});
		const stats = collectWeeklyDigest(ledger, 7);
		expect(stats.runs).toBe(1);
		expect(stats.actions).toEqual({ trash: 0, flag: 0, read: 0, notify: 0 });
	});
});

describe("formatWeeklyDigest", () => {
	it("returns no-runs message when runs = 0", () => {
		const msg = formatWeeklyDigest({
			runs: 0,
			failures: 0,
			actions: { trash: 0, flag: 0, read: 0, notify: 0 },
			cleanupTrashed: 0,
		});
		expect(msg).toContain("no triage runs");
	});

	it("includes success rate and action counts", () => {
		const msg = formatWeeklyDigest({
			runs: 100,
			failures: 5,
			actions: { trash: 10, flag: 8, read: 60, notify: 12 },
			cleanupTrashed: 3,
		});
		expect(msg).toContain("95% success");
		expect(msg).toContain("10 trashed");
		expect(msg).toContain("8 flagged");
		expect(msg).toContain("3 auto-deleted");
	});

	it("includes failure note when failures > 0", () => {
		const msg = formatWeeklyDigest({
			runs: 10,
			failures: 2,
			actions: { trash: 0, flag: 0, read: 0, notify: 0 },
			cleanupTrashed: 0,
		});
		expect(msg).toContain("2 failed runs");
	});

	it("omits failure note when failures = 0", () => {
		const msg = formatWeeklyDigest({
			runs: 10,
			failures: 0,
			actions: { trash: 5, flag: 2, read: 3, notify: 0 },
			cleanupTrashed: 1,
		});
		expect(msg).not.toContain("failed");
	});
});
