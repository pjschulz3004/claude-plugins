import type { Dispatcher, DispatchOptions } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import { sendNotification, type NotifyChannel } from "./notify.js";

/** Set of task names currently undergoing healing -- prevents duplicate dispatch. */
const healingInProgress = new Set<string>();

/** Check if a task is currently being healed. */
export function isHealing(taskName: string): boolean {
	return healingInProgress.has(taskName);
}

export interface HealingOpts {
	taskName: string;
	ledger: TaskLedger;
	dispatcher: Dispatcher;
	notifyChannels?: NotifyChannel[];
}

/**
 * Dispatch the healing agent for a repeatedly-failing task.
 *
 * Guards:
 * - Returns early if consecutive failures < 3
 * - Returns early if healing is already in progress for this task
 *
 * Builds an error-context prompt and dispatches claude -p with the healing agent.
 * On completion, sends a non-urgent notification with the result.
 * On failure, sends an urgent notification -- never throws.
 */
export async function dispatchHealing(opts: HealingOpts): Promise<void> {
	const { taskName, ledger, dispatcher, notifyChannels } = opts;

	// Guard: threshold not met
	const consecutiveFailures = ledger.getConsecutiveFailures(taskName);
	if (consecutiveFailures < 3) return;

	// Guard: already healing this task
	if (healingInProgress.has(taskName)) return;

	healingInProgress.add(taskName);
	try {
		// Collect recent errors for context
		const recentEntries = ledger.getRecent(taskName, 5);
		const errorLines = recentEntries
			.filter((e) => e.status === "failure" && e.error)
			.map((e) => `  [${e.started_at}] ${e.error}`)
			.join("\n");

		const errorContext = [
			`Task: ${taskName}`,
			`Consecutive failures: ${consecutiveFailures}`,
			`Recent errors:`,
			errorLines,
		].join("\n");

		const prompt = [
			`You are the Jarvis healing agent. A heartbeat task has failed ${consecutiveFailures} times in a row and needs diagnosis.`,
			``,
			`Read the healing skill at \${CLAUDE_PLUGIN_ROOT}/skills/healing/SKILL.md and follow it step by step.`,
			`Read \${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md for output tone.`,
			``,
			`Error context:`,
			errorContext,
			``,
			`Diagnose the root cause, probe service health using the available MCP tools (read-only only), and produce a healing report. If the issue requires manual intervention, clearly state what Paul needs to do.`,
		].join("\n");

		const pluginDirs = [
			"packages/jarvis-email",
			"packages/jarvis-calendar",
			"packages/jarvis-contacts",
			"packages/jarvis-budget",
			"packages/jarvis-files",
		];

		const dispatchOpts: DispatchOptions = {
			model: "sonnet",
			maxTurns: 8,
			timeoutMs: 180_000,
			pluginDirs,
		};

		const result = await dispatcher.dispatch(prompt, dispatchOpts);

		// Notify with healing result (non-urgent)
		if (notifyChannels?.length) {
			const summary = `Healing report for "${taskName}":\n\n${result.result.slice(0, 1000)}`;
			await sendNotification(notifyChannels, summary, { urgent: false });
		}
	} catch (err) {
		// Healing itself failed -- notify urgently, never throw
		const error = err instanceof Error ? err.message : String(err);
		console.error(
			`[jarvis] Healing agent failed for ${taskName}:`,
			error,
		);

		if (notifyChannels?.length) {
			await sendNotification(
				notifyChannels,
				`Healing agent failed for "${taskName}": ${error.slice(0, 500)}`,
				{ urgent: true },
			);
		}
	} finally {
		healingInProgress.delete(taskName);
	}
}
