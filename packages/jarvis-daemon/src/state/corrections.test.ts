import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskLedger } from "./ledger.js";
import { CorrectionStore } from "./telemetry.js";
import {
	detectEmailCorrections,
	detectBudgetCorrections,
	type CorrectionDetectionDeps,
} from "./corrections.js";

describe("detectEmailCorrections", () => {
	let ledger: TaskLedger;
	let corrections: CorrectionStore;

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
		corrections = new CorrectionStore(ledger.database);
	});

	afterEach(() => {
		ledger.close();
	});

	it("returns 0 when no recent triage decisions exist", async () => {
		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			emailLookup: async () => ({ folder: "INBOX", flags: [] }),
		};
		const count = await detectEmailCorrections(deps);
		expect(count).toBe(0);
	});

	it("returns 0 when email is still in expected folder", async () => {
		// Record a triage decision that moved email to Trash
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: new Date().toISOString(),
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						email_id: "uid-1",
						from: "spam@example.com",
						subject: "Spam",
						action: "TRASH",
						reason: "Spam email",
					},
				],
			}),
		});

		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			emailLookup: async () => ({ folder: "Trash", flags: [] }),
		};
		const count = await detectEmailCorrections(deps);
		expect(count).toBe(0);
		expect(corrections.getCorrections("email_triage")).toHaveLength(0);
	});

	it("records correction when email triaged as TRASH is now in INBOX", async () => {
		const decidedAt = new Date(Date.now() - 3600000).toISOString();
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: decidedAt,
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						email_id: "uid-2",
						from: "friend@example.com",
						subject: "Hello",
						action: "TRASH",
						reason: "Unwanted",
					},
				],
			}),
		});

		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			emailLookup: async () => ({ folder: "INBOX", flags: [] }),
		};
		const count = await detectEmailCorrections(deps);
		expect(count).toBe(1);

		const recorded = corrections.getCorrections("email_triage");
		expect(recorded).toHaveLength(1);
		expect(recorded[0].original_decision).toBe("TRASH");
		expect(recorded[0].corrected_decision).toBe("INBOX");
	});

	it("records correction when email triaged as NEWSLETTER (mark_read) but user flagged it", async () => {
		const decidedAt = new Date(Date.now() - 3600000).toISOString();
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: decidedAt,
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						email_id: "uid-3",
						from: "news@example.com",
						subject: "Newsletter",
						action: "NEWSLETTER",
						reason: "Regular newsletter",
					},
				],
			}),
		});

		// User flagged it -- means they considered it important, not just a newsletter
		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			emailLookup: async () => ({
				folder: "INBOX",
				flags: ["\\Flagged"],
			}),
		};
		const count = await detectEmailCorrections(deps);
		expect(count).toBe(1);

		const recorded = corrections.getCorrections("email_triage");
		expect(recorded).toHaveLength(1);
		expect(recorded[0].original_decision).toBe("NEWSLETTER");
		expect(recorded[0].corrected_decision).toBe("IMPORTANT");
	});
});

describe("detectBudgetCorrections", () => {
	let ledger: TaskLedger;
	let corrections: CorrectionStore;

	beforeEach(() => {
		ledger = new TaskLedger(":memory:");
		corrections = new CorrectionStore(ledger.database);
	});

	afterEach(() => {
		ledger.close();
	});

	it("returns 0 when no recent budget decisions exist", async () => {
		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			budgetLookup: async () => ({ category_name: "Groceries" }),
		};
		const count = await detectBudgetCorrections(deps);
		expect(count).toBe(0);
	});

	it("returns 0 when transaction category matches original", async () => {
		ledger.record({
			task_name: "budget",
			status: "success",
			started_at: new Date().toISOString(),
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						transaction_id: "txn-1",
						original_category: "Groceries",
						assigned_category: "Groceries",
					},
				],
			}),
		});

		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			budgetLookup: async () => ({ category_name: "Groceries" }),
		};
		const count = await detectBudgetCorrections(deps);
		expect(count).toBe(0);
	});

	it("records correction when transaction recategorised by user", async () => {
		const decidedAt = new Date(Date.now() - 3600000).toISOString();
		ledger.record({
			task_name: "budget",
			status: "success",
			started_at: decidedAt,
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						transaction_id: "txn-2",
						original_category: "Groceries",
						assigned_category: "Groceries",
					},
				],
			}),
		});

		const deps: CorrectionDetectionDeps = {
			ledger,
			corrections,
			budgetLookup: async () => ({ category_name: "Dining Out" }),
		};
		const count = await detectBudgetCorrections(deps);
		expect(count).toBe(1);

		const recorded = corrections.getCorrections("budget");
		expect(recorded).toHaveLength(1);
		expect(recorded[0].original_decision).toBe("Groceries");
		expect(recorded[0].corrected_decision).toBe("Dining Out");
	});

	it("both detection functions call recordCorrection for each found correction", async () => {
		const decidedAt = new Date(Date.now() - 3600000).toISOString();

		// Two email decisions -- both corrected
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: decidedAt,
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						email_id: "uid-10",
						from: "a@b.com",
						subject: "A",
						action: "TRASH",
						reason: "x",
					},
					{
						email_id: "uid-11",
						from: "c@d.com",
						subject: "B",
						action: "IMPORTANT",
						reason: "y",
					},
				],
			}),
		});

		// uid-10 moved back to INBOX (correction), uid-11 still flagged (no correction)
		const emailLookup = async (uid: string) => {
			if (uid === "uid-10")
				return { folder: "INBOX", flags: [] };
			if (uid === "uid-11")
				return { folder: "INBOX", flags: ["\\Flagged"] };
			return { folder: "INBOX", flags: [] };
		};

		const emailCount = await detectEmailCorrections({
			ledger,
			corrections,
			emailLookup,
		});
		expect(emailCount).toBe(1); // Only uid-10 was corrected

		// One budget decision -- corrected
		ledger.record({
			task_name: "budget",
			status: "success",
			started_at: decidedAt,
			duration_ms: 100,
			decision_summary: JSON.stringify({
				decisions: [
					{
						transaction_id: "txn-20",
						original_category: "Transport",
						assigned_category: "Transport",
					},
				],
			}),
		});

		const budgetCount = await detectBudgetCorrections({
			ledger,
			corrections,
			budgetLookup: async () => ({ category_name: "Subscriptions" }),
		});
		expect(budgetCount).toBe(1);

		// Total corrections: 1 email + 1 budget = 2
		const allCorrections = corrections.getCorrections();
		expect(allCorrections).toHaveLength(2);
	});
});
