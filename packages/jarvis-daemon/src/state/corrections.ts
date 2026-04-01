import type { TaskLedger } from "./ledger.js";
import type { CorrectionStore } from "./telemetry.js";

/**
 * Dependency injection interface for correction detection.
 * Uses simple lookup functions rather than full backend classes,
 * making it trivial to mock in tests and wire to real backends later.
 */
export interface CorrectionDetectionDeps {
	ledger: TaskLedger;
	corrections: CorrectionStore;
	emailLookup?: (
		uid: string,
	) => Promise<{ folder: string; flags: string[] }>;
	budgetLookup?: (
		transactionId: string,
	) => Promise<{ category_name: string }>;
}

interface EmailDecision {
	email_id: string;
	from: string;
	subject: string;
	action: string;
	reason: string;
}

interface BudgetDecision {
	transaction_id: string;
	original_category: string;
	assigned_category: string;
}

/**
 * Map triage actions to expected email states.
 * Returns what we expect to see if the user did NOT correct Jarvis.
 */
function expectedEmailState(action: string): {
	folder?: string;
	requiredFlags?: string[];
} {
	switch (action) {
		case "TRASH":
			return { folder: "Trash" };
		case "IMPORTANT":
			return { requiredFlags: ["\\Flagged"] };
		case "NEWSLETTER":
			// Newsletter = mark as read, stays in INBOX. No flags expected.
			return { folder: "INBOX" };
		case "INVOICE":
			return { requiredFlags: ["\\Flagged"] };
		default:
			return {};
	}
}

/**
 * Infer what the user wanted based on current email state.
 */
function inferCorrectedAction(
	folder: string,
	flags: string[],
): string {
	if (flags.includes("\\Flagged")) return "IMPORTANT";
	if (folder === "Trash") return "TRASH";
	return folder; // e.g. "INBOX"
}

/**
 * Detect email corrections by comparing triage decisions against current email state.
 *
 * Queries task_runs for recent email_triage entries with decision_summary (last 24h),
 * then checks current state of each email via the emailLookup function.
 * If the current state differs from what Jarvis decided, records a correction.
 *
 * @returns Number of corrections detected and recorded.
 */
export async function detectEmailCorrections(
	deps: CorrectionDetectionDeps,
): Promise<number> {
	if (!deps.emailLookup) return 0;

	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const recentRuns = deps.ledger.getRecent("email_triage", 50);
	const relevantRuns = recentRuns.filter(
		(r) => r.started_at > cutoff && r.decision_summary,
	);

	let count = 0;

	for (const run of relevantRuns) {
		let parsed: { decisions: EmailDecision[] };
		try {
			parsed = JSON.parse(run.decision_summary!);
		} catch {
			continue;
		}

		if (!parsed.decisions || !Array.isArray(parsed.decisions)) continue;

		for (const decision of parsed.decisions) {
			const expected = expectedEmailState(decision.action);
			if (!expected.folder && !expected.requiredFlags) continue;

			let current: { folder: string; flags: string[] };
			try {
				current = await deps.emailLookup(decision.email_id);
			} catch {
				continue; // Email may have been permanently deleted
			}

			let corrected = false;

			if (expected.folder && current.folder !== expected.folder) {
				corrected = true;
			}

			if (
				expected.requiredFlags &&
				!expected.requiredFlags.every((f) => current.flags.includes(f))
			) {
				corrected = true;
			}

			// For NEWSLETTER: if user flagged it, that's a correction too
			if (
				decision.action === "NEWSLETTER" &&
				current.flags.includes("\\Flagged")
			) {
				corrected = true;
			}

			if (corrected) {
				const correctedAction = inferCorrectedAction(
					current.folder,
					current.flags,
				);
				deps.corrections.recordCorrection({
					task_name: "email_triage",
					original_decision: decision.action,
					corrected_decision: correctedAction,
					decided_at: run.started_at,
					corrected_at: new Date().toISOString(),
				});
				count++;
			}
		}
	}

	return count;
}

/**
 * Detect budget corrections by comparing auto-categorisation against current YNAB categories.
 *
 * Queries task_runs for recent budget entries with decision_summary (last 24h),
 * then checks current category of each transaction via the budgetLookup function.
 * If the category changed, records a correction.
 *
 * @returns Number of corrections detected and recorded.
 */
export async function detectBudgetCorrections(
	deps: CorrectionDetectionDeps,
): Promise<number> {
	if (!deps.budgetLookup) return 0;

	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const recentRuns = deps.ledger.getRecent("budget", 50);
	const relevantRuns = recentRuns.filter(
		(r) => r.started_at > cutoff && r.decision_summary,
	);

	let count = 0;

	for (const run of relevantRuns) {
		let parsed: { decisions: BudgetDecision[] };
		try {
			parsed = JSON.parse(run.decision_summary!);
		} catch {
			continue;
		}

		if (!parsed.decisions || !Array.isArray(parsed.decisions)) continue;

		for (const decision of parsed.decisions) {
			let current: { category_name: string };
			try {
				current = await deps.budgetLookup(decision.transaction_id);
			} catch {
				continue;
			}

			if (current.category_name !== decision.assigned_category) {
				deps.corrections.recordCorrection({
					task_name: "budget",
					original_decision: decision.assigned_category,
					corrected_decision: current.category_name,
					decided_at: run.started_at,
					corrected_at: new Date().toISOString(),
				});
				count++;
			}
		}
	}

	return count;
}
