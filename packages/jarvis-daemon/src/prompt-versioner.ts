import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { PromptVersionStore } from "./state/prompt-versions.js";
import { createLogger } from "./logger.js";

const log = createLogger("prompt-versioner");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptSelection {
	prompt: string;
	version: number;
}

export interface EvaluationResult {
	winner: "current" | "candidate";
	reason: string;
}

interface HeartbeatTask {
	schedule: string;
	hours?: string;
	service?: string;
	autonomy?: string;
	model?: string;
	max_turns?: number;
	timeout_ms?: number;
	plugin_dirs?: string[];
	prompt: string;
}

interface HeartbeatConfig {
	tasks: Record<string, HeartbeatTask>;
}

// ---------------------------------------------------------------------------
// PromptVersioner
// ---------------------------------------------------------------------------

export class PromptVersioner {
	readonly store: PromptVersionStore;
	private readonly yamlPath: string;

	constructor(store: PromptVersionStore, yamlPath: string) {
		this.store = store;
		this.yamlPath = yamlPath;
	}

	/**
	 * Extract version number from `# version: N` comment in the task's prompt.
	 * Returns 0 if no version comment is found.
	 */
	parseVersion(taskName: string): number {
		const raw = readFileSync(this.yamlPath, "utf-8");
		const parsed = parseYaml(raw) as HeartbeatConfig;
		const task = parsed.tasks[taskName];
		if (!task?.prompt) return 0;

		const match = task.prompt.match(/# version:\s*(\d+)/);
		return match ? Number.parseInt(match[1], 10) : 0;
	}

	/**
	 * Select which prompt version to use for a task.
	 * If no candidate exists, returns the current version.
	 * If a candidate exists, alternates based on total run count parity.
	 */
	selectPrompt(taskName: string): PromptSelection {
		const current = this.store.getCurrentVersion(taskName);
		const candidate = this.store.getCandidateVersion(taskName);

		if (!current) {
			// No versions registered -- fall back to YAML
			const raw = readFileSync(this.yamlPath, "utf-8");
			const parsed = parseYaml(raw) as HeartbeatConfig;
			const task = parsed.tasks[taskName];
			return { prompt: task?.prompt ?? "", version: 0 };
		}

		if (!candidate) {
			log.info("prompt_selected", { task: taskName, version: current.version, role: "current" });
			return { prompt: current.prompt_text, version: current.version };
		}

		// Alternate based on candidate run count parity to avoid bias
		// from pre-existing current runs before the candidate was registered
		const candidateRuns = this.store.getTotalRunCount(taskName, candidate.version);

		if (candidateRuns % 2 === 0) {
			log.info("prompt_selected", { task: taskName, version: current.version, role: "current" });
			return { prompt: current.prompt_text, version: current.version };
		}
		log.info("prompt_selected", { task: taskName, version: candidate.version, role: "candidate" });
		return { prompt: candidate.prompt_text, version: candidate.version };
	}

	/**
	 * Register a new candidate prompt version for a task.
	 */
	registerCandidate(taskName: string, promptText: string, version: number): void {
		this.store.registerVersion(taskName, version, promptText, "candidate");
	}

	/**
	 * Evaluate current vs candidate after sufficient runs.
	 * Returns null if either side has fewer than minRuns.
	 * Returns the winner and reason if evaluation is conclusive.
	 */
	evaluate(taskName: string, minRuns = 10): EvaluationResult | null {
		const current = this.store.getCurrentVersion(taskName);
		const candidate = this.store.getCandidateVersion(taskName);

		if (!current || !candidate) return null;

		const currentMetrics = this.store.getMetrics(taskName, current.version);
		const candidateMetrics = this.store.getMetrics(taskName, candidate.version);

		if (currentMetrics.runs < minRuns || candidateMetrics.runs < minRuns) {
			return null;
		}

		// Compare success rates first
		const successDiff = candidateMetrics.successRate - currentMetrics.successRate;
		const EPSILON = 0.001;

		if (successDiff > EPSILON) {
			const result = {
				winner: "candidate" as const,
				reason: `Higher success rate: ${(candidateMetrics.successRate * 100).toFixed(1)}% vs ${(currentMetrics.successRate * 100).toFixed(1)}%`,
			};
			log.info("prompt_evaluated", { task: taskName, winner: "candidate", currentRate: currentMetrics.successRate, candidateRate: candidateMetrics.successRate });
			return result;
		}

		if (successDiff < -EPSILON) {
			const result = {
				winner: "current" as const,
				reason: `Higher success rate: ${(currentMetrics.successRate * 100).toFixed(1)}% vs ${(candidateMetrics.successRate * 100).toFixed(1)}%`,
			};
			log.info("prompt_evaluated", { task: taskName, winner: "current", currentRate: currentMetrics.successRate, candidateRate: candidateMetrics.successRate });
			return result;
		}

		// Success rates equal -- use token efficiency as tiebreak
		if (candidateMetrics.avgTokens < currentMetrics.avgTokens) {
			return {
				winner: "candidate",
				reason: `Equal success rate, fewer tokens: ${candidateMetrics.avgTokens.toFixed(0)} vs ${currentMetrics.avgTokens.toFixed(0)}`,
			};
		}

		if (currentMetrics.avgTokens < candidateMetrics.avgTokens) {
			return {
				winner: "current",
				reason: `Equal success rate, fewer tokens: ${currentMetrics.avgTokens.toFixed(0)} vs ${candidateMetrics.avgTokens.toFixed(0)}`,
			};
		}

		// Completely tied -- current wins (incumbent advantage)
		return {
			winner: "current",
			reason: "Tied on all metrics; incumbent retained",
		};
	}

	/**
	 * Promote the candidate to current, retire the old current.
	 * Updates heartbeat.yaml on disk with the new prompt text and version.
	 */
	promote(taskName: string): void {
		const current = this.store.getCurrentVersion(taskName);
		const candidate = this.store.getCandidateVersion(taskName);

		if (!candidate) return;

		// Update statuses in DB
		if (current) {
			this.store.updateStatus(taskName, current.version, "retired");
		}
		this.store.updateStatus(taskName, candidate.version, "current");

		// Update heartbeat.yaml on disk
		const raw = readFileSync(this.yamlPath, "utf-8");
		const parsed = parseYaml(raw) as HeartbeatConfig;
		const task = parsed.tasks[taskName];

		if (task) {
			task.prompt = candidate.prompt_text;
			writeFileSync(this.yamlPath, stringifyYaml(parsed, { lineWidth: 0 }));
		}
		log.info("prompt_promoted", { task: taskName, version: candidate.version });
	}

	/**
	 * Revert the candidate to retired, keeping the current version.
	 */
	revert(taskName: string): void {
		const candidate = this.store.getCandidateVersion(taskName);
		if (candidate) {
			this.store.updateStatus(taskName, candidate.version, "retired");
			log.warn("prompt_reverted", { task: taskName, version: candidate.version, reason: "evaluation_lost" });
		}
	}

	/**
	 * Get a performance summary string for inclusion in the growth prompt.
	 */
	getPerformanceSummary(taskName: string): string {
		const current = this.store.getCurrentVersion(taskName);
		const candidate = this.store.getCandidateVersion(taskName);

		if (!current) return `${taskName}: no versioned prompts`;

		const cm = this.store.getMetrics(taskName, current.version);
		let summary = `${taskName} v${current.version} (current): ${cm.runs} runs, ${(cm.successRate * 100).toFixed(1)}% success, avg ${cm.avgTokens.toFixed(0)} tokens`;

		if (candidate) {
			const candM = this.store.getMetrics(taskName, candidate.version);
			summary += `\n${taskName} v${candidate.version} (candidate): ${candM.runs} runs, ${(candM.successRate * 100).toFixed(1)}% success, avg ${candM.avgTokens.toFixed(0)} tokens`;
		}

		return summary;
	}
}
