import { readFileSync, statSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { Cron } from "croner";
import type { Dispatcher, DispatchOptions } from "./dispatcher.js";
import { addJitter } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import type { BreakerManager } from "./state/breakers.js";
import { sendNotification, type NotifyChannel } from "./notify.js";
import { dispatchHealing } from "./healing.js";
import type { PromptVersioner } from "./prompt-versioner.js";

interface HeartbeatTask {
	schedule: string;
	hours?: string;
	service?: string;
	autonomy?: string;
	model?: string;
	max_turns?: number;
	timeout_ms?: number;
	retries?: number;
	plugin_dirs?: string[];
	prompt: string;
}

interface HeartbeatConfig {
	tasks: Record<string, HeartbeatTask>;
}

export interface SchedulerConfig {
	yamlPath: string;
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	breakers: BreakerManager;
	notifyChannels?: NotifyChannel[];
	promptVersioner?: PromptVersioner;
}

export class Scheduler {
	private readonly config: SchedulerConfig;
	private jobs: Map<string, Cron> = new Map();
	private tasks: Map<string, HeartbeatTask> = new Map();
	private yamlMtime = 0;

	constructor(config: SchedulerConfig) {
		this.config = config;
	}

	start(): void {
		const raw = readFileSync(this.config.yamlPath, "utf-8");
		const parsed = parseYaml(raw) as HeartbeatConfig;
		this.yamlMtime = statSync(this.config.yamlPath).mtimeMs;

		for (const [name, task] of Object.entries(parsed.tasks)) {
			this.tasks.set(name, task);
			const job = new Cron(task.schedule, () => {
				// Fire with jitter (DAEMON-09)
				const jitterMs = addJitter(0, 60_000);
				setTimeout(() => {
					this.fireTask(name).catch((err) => {
						console.error(`[jarvis] Scheduler error for ${name}:`, err);
					});
				}, jitterMs);
			});
			this.jobs.set(name, job);
		}
	}

	stop(): void {
		for (const [, job] of this.jobs) {
			job.stop();
		}
		this.jobs.clear();
		this.tasks.clear();
	}

	getTaskNames(): string[] {
		return Array.from(this.tasks.keys());
	}

	/**
	 * Hot-reload heartbeat.yaml if it has changed on disk since last load.
	 * Cron schedules are not affected — only task configs (prompt, model, turns, timeout).
	 * Called lazily at the start of each fireTask to pick up growth improvements
	 * without requiring a daemon restart.
	 */
	private reloadIfChanged(): void {
		try {
			const { mtimeMs } = statSync(this.config.yamlPath);
			if (mtimeMs <= this.yamlMtime) return;

			const raw = readFileSync(this.config.yamlPath, "utf-8");
			const parsed = parseYaml(raw) as HeartbeatConfig;

			for (const [name, task] of Object.entries(parsed.tasks)) {
				this.tasks.set(name, task);
			}

			this.yamlMtime = mtimeMs;
			console.log("[jarvis] Reloaded heartbeat.yaml (config updated)");
		} catch (err) {
			// Non-fatal: keep running with existing config
			console.warn("[jarvis] heartbeat.yaml reload failed:", (err as Error).message);
		}
	}

	/**
	 * Evaluate prompt A/B test and promote/revert if conclusive (PROMPT-05).
	 */
	private maybeEvaluatePrompt(taskName: string): void {
		const { promptVersioner } = this.config;
		if (!promptVersioner) return;

		try {
			const result = promptVersioner.evaluate(taskName);
			if (!result) return; // Not enough runs yet

			if (result.winner === "candidate") {
				promptVersioner.promote(taskName);
				console.log(`[jarvis] Prompt A/B: promoted candidate for ${taskName} (${result.reason})`);
			} else {
				promptVersioner.revert(taskName);
				console.log(`[jarvis] Prompt A/B: reverted candidate for ${taskName} (${result.reason})`);
			}
		} catch (err) {
			console.error(`[jarvis] Prompt A/B evaluate error for ${taskName}:`, err);
		}
	}

	/**
	 * Manually fire a task (used by tests and for on-demand dispatch).
	 * Checks breaker, dispatches, records outcome.
	 */
	async fireTask(taskName: string): Promise<void> {
		this.reloadIfChanged();

		const task = this.tasks.get(taskName);
		if (!task) {
			throw new Error(`Unknown task: ${taskName}`);
		}

		// Check hours restriction
		if (task.hours) {
			const [startHour, endHour] = task.hours.split("-").map(Number);
			const currentHour = new Date().getHours();
			if (currentHour < startHour || currentHour > endHour) {
				return; // Outside hours window, skip silently
			}
		}

		const { ledger, breakers, dispatcher } = this.config;

		// Check breaker
		const service = task.service ?? taskName;
		if (!breakers.shouldAllow(service)) {
			ledger.record({
				task_name: taskName,
				status: "skipped",
				started_at: new Date().toISOString(),
				duration_ms: 0,
				error: `Circuit breaker open for ${service}`,
			});
			return;
		}

		const startedAt = new Date().toISOString();
		const startTime = Date.now();

		// Select prompt version (A/B testing via PromptVersioner)
		const { promptVersioner } = this.config;
		let promptToUse = task.prompt;
		let promptVersion = 0;
		if (promptVersioner) {
			try {
				const selection = promptVersioner.selectPrompt(taskName);
				promptToUse = selection.prompt;
				promptVersion = selection.version;
			} catch {
				// Fall back to task.prompt on any error
			}
		}

		try {
			const opts: DispatchOptions = {
				model: task.model,
				maxTurns: task.max_turns,
				timeoutMs: task.timeout_ms,
				retries: task.retries,
				pluginDirs: task.plugin_dirs,
			};

			const result = await dispatcher.dispatch(promptToUse, opts);

			// Extract JSON decision block from result (email triage outputs ```json{decisions:...}```)
			let decisionSummary: string | undefined;
			const jsonMatch = result.result.match(
				/```json\s*\n?([\s\S]*?)\n?\s*```/,
			);
			if (jsonMatch?.[1]) {
				decisionSummary = jsonMatch[1].trim();
			}

			const runId = ledger.record({
				task_name: taskName,
				status: "success",
				started_at: startedAt,
				duration_ms: Date.now() - startTime,
				cost_usd: result.total_cost_usd,
				input_tokens: result.usage.input_tokens,
				output_tokens: result.usage.output_tokens,
				decision_summary: decisionSummary,
			});
			breakers.recordSuccess(service);

			// Record per-version metrics (PROMPT-02)
			if (promptVersioner && promptVersion > 0) {
				const totalTokens = (result.usage.input_tokens ?? 0) + (result.usage.output_tokens ?? 0);
				promptVersioner.store.recordMetric(taskName, promptVersion, runId, true, Date.now() - startTime, totalTokens);
				this.maybeEvaluatePrompt(taskName);
			}

			// Notify on success (non-urgent -- suppressed during quiet hours)
			if (task.autonomy === "notify" && this.config.notifyChannels?.length) {
				const summary = `Task "${taskName}" completed successfully.\n\n${result.result.slice(0, 500)}`;
				await sendNotification(this.config.notifyChannels, summary, {
					urgent: false,
				});
			}
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			const runId = ledger.record({
				task_name: taskName,
				status: "failure",
				started_at: startedAt,
				duration_ms: Date.now() - startTime,
				error,
			});
			breakers.recordFailure(service);

			// Record per-version failure metric (PROMPT-02)
			if (promptVersioner && promptVersion > 0) {
				promptVersioner.store.recordMetric(taskName, promptVersion, runId, false, Date.now() - startTime, 0);
				this.maybeEvaluatePrompt(taskName);
			}

			// Notify on failure (urgent -- bypasses quiet hours)
			if (task.autonomy === "notify" && this.config.notifyChannels?.length) {
				const summary = `Task "${taskName}" failed: ${error.slice(0, 300)}`;
				await sendNotification(this.config.notifyChannels, summary, {
					urgent: true,
				});
			}

			// Dispatch healing if 3+ consecutive failures (INTEL-01)
			const consecutiveFailures = ledger.getConsecutiveFailures(taskName);
			if (consecutiveFailures >= 3) {
				dispatchHealing({
					taskName,
					ledger,
					dispatcher,
					notifyChannels: this.config.notifyChannels,
				}).catch((healErr) => {
					console.error(`[jarvis] Healing dispatch error for ${taskName}:`, healErr);
				});
			}
		}
	}
}
