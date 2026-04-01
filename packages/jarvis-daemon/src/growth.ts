/**
 * Growth Engine — Jarvis's nightly self-improvement loop.
 *
 * Runs from 01:00 to 05:00 every night. Each round:
 * 1. Reads MISSION.md (why I exist)
 * 2. Reviews today's performance (task ledger)
 * 3. Reads GROWTH_BACKLOG.md (what to work on)
 * 4. Picks the highest priority item
 * 5. Dispatches a focused claude -p session to address it
 * 6. Updates GROWTH_LOG.md and GROWTH_BACKLOG.md
 * 7. Loops until 05:00 or backlog is empty
 *
 * Between rounds: 60 second pause to avoid rate limits.
 * Each round gets its own claude -p session (fresh context, no accumulation).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { Dispatcher } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import { sendNotification, type NotifyChannel } from "./notify.js";
import {
	assembleCouncil,
	conveneCouncil,
	type CouncilMember,
	type ReviewContext,
} from "./council.js";

export interface GrowthConfig {
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	notifyChannels?: NotifyChannel[];
	repoRoot: string;
	startHour: number; // 1
	endHour: number; // 5
	pauseBetweenRoundsMs: number; // 60_000
	maxTurnsPerRound: number; // 30
	timeoutPerRoundMs: number; // 900_000 (15 min)
}

const DEFAULT_CONFIG: Partial<GrowthConfig> = {
	startHour: 1,
	endHour: 5,
	pauseBetweenRoundsMs: 60_000,
	maxTurnsPerRound: 30,
	timeoutPerRoundMs: 900_000,
};

function isWithinWindow(startHour: number, endHour: number): boolean {
	const hour = new Date().getHours();
	return hour >= startHour && hour < endHour;
}

function readFileOrDefault(path: string, fallback: string): string {
	try {
		return existsSync(path) ? readFileSync(path, "utf-8") : fallback;
	} catch {
		return fallback;
	}
}

function buildReflectionPrompt(
	mission: string,
	ledgerSummary: string,
	backlog: string,
	growthLog: string,
	roundNumber: number,
): string {
	return `You are Jarvis, running your nightly growth session. Round ${roundNumber}.

Read your mission statement carefully. This is who you are and what you're striving toward:

<mission>
${mission}
</mission>

Here is today's task performance from the ledger:

<performance>
${ledgerSummary}
</performance>

Here is your current growth backlog (items to improve):

<backlog>
${backlog}
</backlog>

Here is the log of previous growth sessions:

<growth_log>
${growthLog.slice(-3000)}
</growth_log>

YOUR TASK FOR THIS ROUND:

1. REFLECT: Based on your mission and today's performance, what matters most right now? What pattern do you see? What fell short of your mission?

2. PICK: Choose ONE item from the backlog (highest priority first). If nothing in the backlog fits, identify a new improvement opportunity and add it.

3. ACT: Implement the improvement. You have full access to:
   - Read/Write/Edit tools for code, config, markdown files
   - Bash for running tests (npm test), builds (npm run build), and git operations
   - WebSearch for researching best practices
   - GitHub CLI (gh) for creating issues on pjschulz3004/claude-plugins

   What you CAN do:
   - Edit heartbeat.yaml prompts and task configuration
   - Edit skill files, agent files, command files, reference files
   - Edit TypeScript source code in any package
   - Run npm test and npm run build to verify changes
   - Git commit changes (use: git add -A && git commit -m "growth(YYYY-MM-DD): description")
   - Create GitHub issues for larger features you can't implement tonight

   What you MUST do:
   - Run tests after any code change
   - Only commit if tests pass
   - Keep changes focused (one improvement per round)

4. RECORD: After acting, update these files:
   - GROWTH_BACKLOG.md: Mark the item as done (or update its status)
   - GROWTH_LOG.md: Add an entry for this round

5. If you identify NEW improvement opportunities while working, add them to GROWTH_BACKLOG.md with appropriate priority.

6. For improvements too large for a single round (>30 minutes of work), create a GitHub issue:
   gh issue create --repo pjschulz3004/claude-plugins --title "Jarvis Growth: [title]" --body "[detailed spec]" --label "jarvis,growth"

IMPORTANT: All file paths are relative to the repo root at ${process.cwd()}.
The jarvis plugin files are at packages/jarvis/.
The daemon source is at packages/jarvis-daemon/src/.
The heartbeat config is at packages/jarvis-daemon/heartbeat.yaml.

Be concrete. Be focused. One real improvement per round is better than three half-finished ones.`;
}

export async function runGrowthLoop(config: GrowthConfig): Promise<void> {
	const cfg = { ...DEFAULT_CONFIG, ...config } as Required<GrowthConfig>;
	const jarvisDir = join(cfg.repoRoot, "packages", "jarvis");

	console.log("[growth] Starting nightly growth session...");

	const missionPath = join(jarvisDir, "MISSION.md");
	const backlogPath = join(jarvisDir, "GROWTH_BACKLOG.md");
	const logPath = join(jarvisDir, "GROWTH_LOG.md");

	let roundNumber = 0;
	const roundSummaries: string[] = [];
	const council = assembleCouncil();
	if (council.length > 0) {
		console.log(
			`[growth] Council assembled: ${council.map((m) => m.name).join(", ")}`,
		);
	} else {
		console.log("[growth] No council members available (no API keys). Self-review only.");
	}

	while (isWithinWindow(cfg.startHour, cfg.endHour)) {
		roundNumber++;
		console.log(`[growth] Round ${roundNumber} starting...`);

		// Read fresh state each round
		const mission = readFileOrDefault(missionPath, "No mission statement found.");
		const backlog = readFileOrDefault(backlogPath, "No backlog found.");
		const growthLog = readFileOrDefault(logPath, "No previous sessions.");

		// Build ledger summary (last 24h)
		const recentRuns = cfg.ledger.getRecentAll?.(50) ?? [];
		const ledgerSummary = recentRuns.length > 0
			? recentRuns
				.map((r) =>
					`${r.task_name}: ${r.status} (${r.duration_ms}ms)${r.error ? ` ERROR: ${r.error.slice(0, 200)}` : ""}`
				)
				.join("\n")
			: "No task runs in the last 24 hours.";

		const prompt = buildReflectionPrompt(
			mission,
			ledgerSummary,
			backlog,
			growthLog,
			roundNumber,
		);

		try {
			const result = await cfg.dispatcher.dispatch(prompt, {
				model: "sonnet",
				maxTurns: cfg.maxTurnsPerRound,
				timeoutMs: cfg.timeoutPerRoundMs,
			});

			const summary = result.result.slice(0, 500);
			roundSummaries.push(`Round ${roundNumber}: ${summary}`);
			console.log(`[growth] Round ${roundNumber} complete: ${summary.slice(0, 100)}`);

			cfg.ledger.record({
				task_name: "growth_round",
				status: "success",
				started_at: new Date().toISOString(),
				duration_ms: result.duration_ms,
				cost_usd: result.total_cost_usd,
				input_tokens: result.usage.input_tokens,
				output_tokens: result.usage.output_tokens,
			});
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			console.error(`[growth] Round ${roundNumber} failed:`, error);
			roundSummaries.push(`Round ${roundNumber}: FAILED - ${error.slice(0, 200)}`);

			cfg.ledger.record({
				task_name: "growth_round",
				status: "failure",
				started_at: new Date().toISOString(),
				duration_ms: 0,
				error,
			});

			// If auth expired or similar fatal error, stop the loop
			if (error.includes("authentication") || error.includes("OAuth")) {
				console.error("[growth] Auth error — stopping growth loop.");
				break;
			}
		}

		// Pause between rounds (rate limit protection)
		if (isWithinWindow(cfg.startHour, cfg.endHour)) {
			console.log(`[growth] Pausing ${cfg.pauseBetweenRoundsMs / 1000}s before next round...`);
			await new Promise((resolve) => setTimeout(resolve, cfg.pauseBetweenRoundsMs));
		}
	}

	// Send morning summary (queued for after quiet hours)
	if (roundSummaries.length > 0 && cfg.notifyChannels?.length) {
		const summary = `Nightly growth session complete. ${roundNumber} rounds.\n\n${roundSummaries.join("\n\n")}`;
		await sendNotification(cfg.notifyChannels, summary, { urgent: false });
	}

	console.log(`[growth] Session complete. ${roundNumber} rounds executed.`);
}
