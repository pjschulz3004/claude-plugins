import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { Cron } from "croner";
import type { Dispatcher, DispatchOptions } from "./dispatcher.js";
import { addJitter } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import type { BreakerManager } from "./state/breakers.js";
import { sendNotification, type NotifyChannel } from "./notify.js";
import { dispatchHealing } from "./healing.js";

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

export interface SchedulerConfig {
	yamlPath: string;
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	breakers: BreakerManager;
	notifyChannels?: NotifyChannel[];
}

export class Scheduler {
	private readonly config: SchedulerConfig;
	private jobs: Map<string, Cron> = new Map();
	private tasks: Map<string, HeartbeatTask> = new Map();

	constructor(config: SchedulerConfig) {
		this.config = config;
	}

	start(): void {
		const raw = readFileSync(this.config.yamlPath, "utf-8");
		const parsed = parseYaml(raw) as HeartbeatConfig;

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
	 * Manually fire a task (used by tests and for on-demand dispatch).
	 * Checks breaker, dispatches, records outcome.
	 */
	async fireTask(taskName: string): Promise<void> {
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

		try {
			const opts: DispatchOptions = {
				model: task.model,
				maxTurns: task.max_turns,
				timeoutMs: task.timeout_ms,
				pluginDirs: task.plugin_dirs,
			};

			const result = await dispatcher.dispatch(task.prompt, opts);

			// Extract JSON decision block from result (email triage outputs ```json{decisions:...}```)
			let decisionSummary: string | undefined;
			const jsonMatch = result.result.match(
				/```json\s*\n?([\s\S]*?)\n?\s*```/,
			);
			if (jsonMatch?.[1]) {
				decisionSummary = jsonMatch[1].trim();
			}

			ledger.record({
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

			// Notify on success (non-urgent -- suppressed during quiet hours)
			if (task.autonomy === "notify" && this.config.notifyChannels?.length) {
				const summary = `Task "${taskName}" completed successfully.\n\n${result.result.slice(0, 500)}`;
				await sendNotification(this.config.notifyChannels, summary, {
					urgent: false,
				});
			}
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			ledger.record({
				task_name: taskName,
				status: "failure",
				started_at: startedAt,
				duration_ms: Date.now() - startTime,
				error,
			});
			breakers.recordFailure(service);

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
