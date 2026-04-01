import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CorrectionStore } from "./telemetry.js";
import { createLogger } from "../logger.js";

const log = createLogger("regression");

/** Dependency injection for git operations (testable). */
export type ExecFn = (args: string[]) => string;

export interface RegressionDetectorDeps {
	corrections: CorrectionStore;
	repoRoot: string;
	taskNames: string[];
}

export interface RateSnapshot {
	rates: Map<string, number>;
	capturedAt: string;
}

export interface RegressionDetail {
	taskName: string;
	rateBefore: number;
	rateAfter: number;
	delta: number;
}

export interface RegressionCheckResult {
	regressed: boolean;
	details: RegressionDetail[];
}

const COMMIT_HASH_RE = /^[a-f0-9]{7,40}$/;

export class RegressionDetector {
	private readonly deps: RegressionDetectorDeps;
	private readonly exec: ExecFn;

	constructor(deps: RegressionDetectorDeps, execFn?: ExecFn) {
		this.deps = deps;
		// Default uses execFileSync (NOT execSync) to prevent shell injection.
		// The ExecFn parameter allows test injection without touching git.
		this.exec =
			execFn ??
			((args: string[]) =>
				execFileSync("git", args, { cwd: deps.repoRoot })
					.toString()
					.trim());
	}

	/** Capture current 7-day correction rates per task type. */
	snapshotRates(): RateSnapshot {
		const rates = new Map<string, number>();
		for (const taskName of this.deps.taskNames) {
			rates.set(
				taskName,
				this.deps.corrections.rollingCorrectionRate(taskName, 7),
			);
		}
		return {
			rates,
			capturedAt: new Date().toISOString(),
		};
	}

	/** Compare current rates to snapshot. Any increase means regression. */
	checkForRegression(snapshot: RateSnapshot): RegressionCheckResult {
		const details: RegressionDetail[] = [];
		let regressed = false;

		for (const taskName of this.deps.taskNames) {
			const rateBefore = snapshot.rates.get(taskName) ?? 0;
			const rateAfter = this.deps.corrections.rollingCorrectionRate(
				taskName,
				7,
			);
			const delta = rateAfter - rateBefore;

			details.push({ taskName, rateBefore, rateAfter, delta });

			if (delta > 0.05) {
				regressed = true;
				log.warn("regression_detected", { task: taskName, before: rateBefore, after: rateAfter, delta });
			}
		}

		const rates: Record<string, number> = {};
		for (const d of details) { rates[d.taskName] = d.rateAfter; }
		log.info("regression_snapshot", { taskCount: details.length, rates });

		return { regressed, details };
	}

	/** Revert a commit by hash. Returns the new revert commit hash. */
	revertCommit(commitHash: string): string {
		if (!COMMIT_HASH_RE.test(commitHash)) {
			throw new Error(
				`Invalid commit hash: "${commitHash}" — must match /^[a-f0-9]{7,40}$/`,
			);
		}

		this.exec(["revert", "--no-edit", commitHash]);
		const revertHash = this.exec(["rev-parse", "HEAD"]);
		log.info("regression_reverted", { commitHash, revertHash });
		return revertHash;
	}

	/** Append regression details to GROWTH_LOG.md. */
	logRegression(
		result: RegressionCheckResult,
		commitHash: string,
		revertHash: string,
	): void {
		const timestamp = new Date().toISOString();
		const affectedLines = result.details
			.filter((d) => d.delta > 0)
			.map(
				(d) =>
					`- ${d.taskName}: ${d.rateBefore.toFixed(3)} -> ${d.rateAfter.toFixed(3)} (+${d.delta.toFixed(3)})`,
			)
			.join("\n");

		const entry = `
## Regression Detected -- ${timestamp}

**Reverted commit:** ${commitHash} -> ${revertHash}
**Affected tasks:**
${affectedLines}

**Action:** Auto-reverted. Backlog item marked as reverted.
`;

		const logPath = join(this.deps.repoRoot, "GROWTH_LOG.md");
		appendFileSync(logPath, entry, "utf8");
	}

	/** Find an item in GROWTH_BACKLOG.md and mark it as reverted. */
	markBacklogReverted(itemDescription: string, reason: string): void {
		const backlogPath = join(this.deps.repoRoot, "GROWTH_BACKLOG.md");

		if (!existsSync(backlogPath)) {
			log.warn("backlog_not_found", { path: backlogPath });
			return;
		}

		try {
			const content = readFileSync(backlogPath, "utf8");
			const needle = itemDescription.toLowerCase();
			const lines = content.split("\n");
			let found = false;

			for (let i = 0; i < lines.length; i++) {
				if (lines[i].toLowerCase().includes(needle)) {
					lines[i] = `${lines[i]} [REVERTED: ${reason}]`;
					found = true;
					break;
				}
			}

			if (!found) {
				log.warn("backlog_item_not_found", { item: itemDescription });
				return;
			}

			writeFileSync(backlogPath, lines.join("\n"), "utf8");
		} catch (err) {
			log.warn("backlog_update_failed", { error: (err as Error).message });
		}
	}
}
