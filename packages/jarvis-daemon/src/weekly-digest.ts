/**
 * Weekly triage digest — native summary of the past 7 days of triage activity.
 *
 * Runs Sunday evenings. Queries the ledger directly (no Claude dispatch).
 * Surfaces triage volume, failure rate, and action breakdown so Paul can spot
 * drift before correction rates degrade.
 */

import type { TaskLedger } from "./state/ledger.js";
import type { LedgerEntry } from "@jarvis/shared";

export interface WeeklyDigestStats {
	runs: number;
	failures: number;
	actions: { trash: number; flag: number; read: number; notify: number };
	cleanupTrashed: number;
}

/** ISO cutoff date string for `daysBack` days ago. */
function sinceIso(daysBack: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysBack);
	return d.toISOString();
}

function parseTriageActions(
	entries: LedgerEntry[],
): WeeklyDigestStats["actions"] {
	const counts = { trash: 0, flag: 0, read: 0, notify: 0 };
	for (const entry of entries) {
		if (!entry.decision_summary) continue;
		try {
			const parsed = JSON.parse(entry.decision_summary) as {
				decisions?: Array<{ action: string }>;
			};
			for (const d of parsed.decisions ?? []) {
				const action = d.action as keyof typeof counts;
				if (action in counts) counts[action]++;
			}
		} catch (err) {
			console.warn("[weekly-digest] Malformed decision_summary JSON:", (err as Error).message);
		}
	}
	return counts;
}

function sumCleanupTrashed(entries: LedgerEntry[]): number {
	let total = 0;
	for (const entry of entries) {
		if (!entry.decision_summary) continue;
		try {
			const parsed = JSON.parse(entry.decision_summary) as {
				trashed?: number;
			};
			total += parsed.trashed ?? 0;
		} catch (err) {
			console.warn("[weekly-digest] Malformed cleanup JSON:", (err as Error).message);
		}
	}
	return total;
}

export function collectWeeklyDigest(
	ledger: TaskLedger,
	daysBack = 7,
): WeeklyDigestStats {
	const since = sinceIso(daysBack);

	// Fetch more than 7 days * 16 runs = 112 max; 200 is safe headroom
	const triageEntries = ledger
		.getRecent("email_triage", 200)
		.filter((e) => e.started_at >= since);
	const cleanupEntries = ledger
		.getRecent("email_cleanup", 50)
		.filter((e) => e.started_at >= since);

	const successEntries = triageEntries.filter((e) => e.status === "success");

	return {
		runs: triageEntries.length,
		failures: triageEntries.filter((e) => e.status === "failure").length,
		actions: parseTriageActions(successEntries),
		cleanupTrashed: sumCleanupTrashed(cleanupEntries),
	};
}

export function formatWeeklyDigest(stats: WeeklyDigestStats): string {
	const { runs, failures, actions, cleanupTrashed } = stats;

	if (runs === 0) {
		return "Weekly triage digest: no triage runs recorded in the last 7 days.";
	}

	const successRate = Math.round(((runs - failures) / runs) * 100);
	const actioned = actions.trash + actions.flag + actions.read + actions.notify;

	const lines: string[] = [
		"Weekly triage digest (last 7 days)",
		`${runs} runs, ${successRate}% success`,
		`${actioned} emails processed: ${actions.trash} trashed, ${actions.flag} flagged, ${actions.read + actions.notify} read`,
		`${cleanupTrashed} auto-deleted by cleanup`,
	];

	if (failures > 0) {
		lines.push(`${failures} failed run${failures > 1 ? "s" : ""} — check ledger for details`);
	}

	return lines.join("\n");
}
