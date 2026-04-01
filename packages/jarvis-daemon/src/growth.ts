/**
 * Growth Engine — Jarvis's nightly self-improvement loop.
 *
 * Runs from 01:00 to 05:00 every night. Each round:
 * 1. Reads MISSION.md (why I exist)
 * 2. Reviews today's performance (task ledger)
 * 3. Reads GROWTH_BACKLOG.md (what to work on)
 * 4. Picks the highest priority item
 * 5. Dispatches a focused claude -p session to address it
 * 6. Council reviews the diff; revert on rejection
 * 7. Regression detector checks correction rates; revert on regression
 * 8. Updates GROWTH_LOG.md and GROWTH_BACKLOG.md
 * 9. Loops until 05:00 or backlog is empty
 *
 * Between rounds: 60 second pause to avoid rate limits.
 * Each round gets its own claude -p session (fresh context, no accumulation).
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { Dispatcher } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import type { CorrectionStore } from "./state/telemetry.js";
import { RegressionDetector } from "./state/regression.js";
import { sendNotification, type NotifyChannel } from "./notify.js";
import {
	assembleCouncil,
	conveneCouncil,
	type CouncilMember,
	type ReviewContext,
} from "./council.js";
import { KGBridge } from "./kg-bridge.js";
import type { PromptVersioner } from "./prompt-versioner.js";
import { SkillCreator } from "./skill-creator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Git exec function signature — uses execFileSync (no shell) for safety. */
export type GitExecFn = (args: string[], cwd: string) => string;

export interface GrowthConfig {
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	corrections: CorrectionStore;
	taskNames: string[];
	notifyChannels?: NotifyChannel[];
	repoRoot: string;
	startHour: number; // 1
	endHour: number; // 5
	pauseBetweenRoundsMs: number; // 60_000
	maxTurnsPerRound: number; // 30
	timeoutPerRoundMs: number; // 900_000 (15 min)
	maxRounds?: number; // Optional cap (useful for testing)
	gitExecFn?: GitExecFn; // Injectable for testing
	kgBridge?: KGBridge; // Optional KG bridge for contextual memory
	promptVersioner?: PromptVersioner; // Optional A/B prompt versioner (PROMPT-01)
}

export interface GrowthSessionResult {
	roundsExecuted: number;
	roundSummaries: string[];
	totalCostUsd: number;
}

const DEFAULT_CONFIG: Partial<GrowthConfig> = {
	startHour: 1,
	endHour: 5,
	pauseBetweenRoundsMs: 60_000,
	maxTurnsPerRound: 30,
	timeoutPerRoundMs: 900_000,
};

// ---------------------------------------------------------------------------
// Improve Skill Procedure (embedded to avoid file-path issues inside prompt)
// ---------------------------------------------------------------------------

export const IMPROVE_SKILL_PROCEDURE = `Step 1: Reflect
Read the performance data provided. Ask yourself:
- What went well today? (successful tasks, good triage decisions, useful briefings)
- What fell short? (failures, timeouts, misclassifications, empty results)
- What's missing entirely? (things Paul asked for that I couldn't do, patterns I should have noticed)
- What does my mission say I should be doing that I'm not?
Write 2-3 sentences of honest reflection.

Step 2: Pick
Read GROWTH_BACKLOG.md. Pick the highest-priority queued item. Priority order:
1. fix: Something is broken and failing. Fix the root cause.
2. tune: Something works but could work better. Adjust prompts, config, thresholds.
3. expand: An existing capability needs broader coverage.
4. new-tool: A genuinely new capability that serves the mission.
5. research: Don't know the best approach yet. Use WebSearch first.

Step 3: Act
Implement the improvement with surgical precision. For TypeScript changes, run npm run build to verify compilation.

Step 4: Commit
Only commit if tests pass: git add -A && git commit -m "growth(YYYY-MM-DD): [description]"

Step 5: Record
Update GROWTH_BACKLOG.md (mark item done) and GROWTH_LOG.md (add round entry).

Step 6: Identify Next
Scan for the next improvement opportunity. Add new items to GROWTH_BACKLOG.md.

SKILL CREATION (for 'new-tool' backlog items or detected capability gaps):

When you identify a gap that needs a new tool:

1. BRANCH: Create a staging branch
   git checkout -b skill/{tool-name}

2. SKILL.MD: Create packages/jarvis/skills/{name}/SKILL.md with these sections:
   - Frontmatter: name, description
   - ## Trigger (when to activate)
   - ## Procedure (step by step)
   - ## Tools (MCP tools used)
   - ## Rules (decision rules)
   - ## Output (expected format)

3. MCP TOOL: Create the TypeScript MCP tool in packages/jarvis/src/tools/{name}.ts:
   - Import { z } from "zod"
   - Define input schema with z.object()
   - Implement the handler function
   - Export the tool definition

4. TEST: Create packages/jarvis/src/tools/{name}.test.ts:
   - Test input validation
   - Test handler with mock data
   - Test error cases

5. VERIFY:
   npm test
   npm run build
   Only proceed if BOTH pass.

6. COMMIT:
   git add -A && git commit -m "feat(skill): add {name} tool"

7. PR: Create a GitHub pull request:
   git push -u origin skill/{tool-name}
   gh pr create --repo pjschulz3004/claude-plugins \\
     --title "Jarvis Skill: {name}" \\
     --body "## New Skill\\n{description}\\n\\n## Gap Detected\\n{gap details}\\n\\n## Test Results\\n{paste test output}"

8. RETURN TO MAIN:
   git checkout main

IMPORTANT: Never merge your own PR. Paul reviews all new skills.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Default git exec function — uses execFileSync (no shell) for safety. */
function defaultGitExec(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, timeout: 30_000 }).toString().trim();
}

/** Format correction rates for prompt inclusion. */
function formatCorrectionRates(corrections: CorrectionStore, taskNames: string[]): string {
	if (taskNames.length === 0) return "No tasks tracked yet.";
	return taskNames
		.map((name) => `${name}: ${(corrections.rollingCorrectionRate(name, 7) * 100).toFixed(1)}%`)
		.join("\n");
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

export function buildReflectionPrompt(
	mission: string,
	ledgerSummary: string,
	backlog: string,
	growthLog: string,
	roundNumber: number,
	correctionRates: string,
	skillProcedure: string,
	kgContext: string = "",
	promptVersionSummary: string = "",
	capabilityGaps: string = "",
): string {
	const kgSection = kgContext
		? `\n<knowledge_graph>
Here is relevant context from your knowledge graph (past improvements and corrections):
${kgContext}
Use this to avoid repeating past mistakes and build on previous work.
</knowledge_graph>\n`
		: "";

	return `You are Jarvis, running your nightly growth session. Round ${roundNumber}.

Read your mission statement carefully. This is who you are and what you're striving toward:

<mission>
${mission}
</mission>

Here is today's task performance from the ledger:

<performance>
${ledgerSummary}
${promptVersionSummary ? `\nPrompt A/B Testing Status:\n${promptVersionSummary}` : ""}
</performance>

Here is your current growth backlog (items to improve):

<backlog>
${backlog}
</backlog>

Here is the log of previous growth sessions:

<growth_log>
${growthLog.slice(-3000)}
</growth_log>

Here are your current 7-day correction rates (lower is better):
<correction_rates>
${correctionRates}
</correction_rates>
${capabilityGaps ? `\n<capability_gaps>\n${capabilityGaps}\n</capability_gaps>\n` : ""}
${kgSection}
Follow this improvement procedure for each round:
<procedure>
${skillProcedure}
</procedure>

<opro_prompt_mutation>
When picking a 'tune' type backlog item that involves prompt improvement, use the OPRO pattern:
1. Analyse the last N failures for the target task (look at error messages, decision_summary in the performance data above)
2. Identify what the current prompt does wrong or misses
3. Write an improved version of the prompt
4. Save it as a candidate by editing heartbeat.yaml with an incremented version comment (# version: N+1)
5. The scheduler will automatically A/B test your candidate against the current version and promote winners
</opro_prompt_mutation>

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
   - Run \`npm test\` after any code change (MANDATORY — the daemon will reject your commit if tests fail)
   - Run \`npm run build\` after TypeScript changes
   - Only \`git add -A && git commit -m "growth(YYYY-MM-DD): description"\` if BOTH pass
   - Keep changes focused (one improvement per round)
   - Update GROWTH_LOG.md with: what you reflected on, what you picked, what you did, commit hash
   - Update GROWTH_BACKLOG.md: mark item done or update status

4. RECORD: After acting, update these files:
   - GROWTH_BACKLOG.md: Mark the item as done (or update its status)
   - GROWTH_LOG.md: Add an entry for this round

GITHUB ISSUES (for work too large for one round):
When you identify an improvement that would take more than 30 minutes or touches
more than 5 files, DO NOT attempt it. Instead:

1. Create a GitHub issue with a detailed spec:
   \`\`\`bash
   gh issue create --repo pjschulz3004/claude-plugins \\
     --title "Jarvis Growth: [clear, specific title]" \\
     --body "## What\\n[What needs to change]\\n\\n## Why\\n[What problem this solves]\\n\\n## How\\n[Implementation approach]\\n\\n## Acceptance Criteria\\n- [ ] [Criterion 1]\\n- [ ] [Criterion 2]" \\
     --label "jarvis,growth"
   \`\`\`

2. Mark the backlog item as \`filed-as-issue\` with the issue URL in GROWTH_BACKLOG.md
3. Log the issue creation in GROWTH_LOG.md
4. Move on to the next backlog item (do NOT attempt partial implementation)

BACKLOG MAINTENANCE:
Your backlog is a living document. During every round, you will notice things
that could be better. Add them to GROWTH_BACKLOG.md with:
- A clear one-line description
- Priority: P1 (broken/failing), P2 (suboptimal), P3 (nice-to-have), P4 (research)
- Type: fix, tune, expand, new-tool, or research
- Source: "discovered during [what you were working on]"

Example entry:
\`\`\`
- [ ] P2/tune: Email triage prompt references outdated folder names (discovered during rule review)
\`\`\`

Do NOT remove items from the backlog. Mark completed items with [x] and a date.
Mark filed-as-issue items with the issue URL.

5. If you identify NEW improvement opportunities while working, add them to GROWTH_BACKLOG.md following the BACKLOG MAINTENANCE format above.

IMPORTANT: All file paths are relative to the repo root at ${process.cwd()}.
The jarvis plugin files are at packages/jarvis/.
The daemon source is at packages/jarvis-daemon/src/.
The heartbeat config is at packages/jarvis-daemon/heartbeat.yaml.

Be concrete. Be focused. One real improvement per round is better than three half-finished ones.`;
}

// ---------------------------------------------------------------------------
// Morning Summary
// ---------------------------------------------------------------------------

export function compileMorningSummary(result: GrowthSessionResult): string {
	if (result.roundsExecuted === 0) {
		return "Nightly growth session: No rounds executed (backlog may be empty or window was too short).";
	}

	const header = `Nightly growth session complete: ${result.roundsExecuted} round${result.roundsExecuted > 1 ? "s" : ""}.`;
	const cost = result.totalCostUsd > 0
		? `\nTotal cost: $${result.totalCostUsd.toFixed(4)}`
		: "";

	const roundDetails = result.roundSummaries
		.map((s, i) => `${i + 1}. ${s}`)
		.join("\n");

	return `${header}${cost}\n\n${roundDetails}`;
}

// ---------------------------------------------------------------------------
// KG Helpers
// ---------------------------------------------------------------------------

/** Extract keywords from the first unchecked backlog item for KG search. */
export function extractBacklogKeywords(backlog: string): string[] {
	const lines = backlog.split("\n");
	for (const line of lines) {
		// Match unchecked items like "- [ ] P2/tune: Email triage prompt ..."
		const match = line.match(/^-\s*\[\s*\]\s*(?:P\d\/\w+:\s*)?(.+)/);
		if (match) {
			// Extract meaningful words (3+ chars, no markdown)
			return match[1]
				.replace(/[`*_#\[\]()]/g, "")
				.split(/\s+/)
				.filter((w) => w.length >= 3)
				.slice(0, 5);
		}
	}
	return [];
}

/** Sync recent corrections to KG (dedup handled by KG MERGE on entity name). */
export async function syncCorrectionsToKG(
	corrections: CorrectionStore,
	kgBridge: KGBridge,
	taskNames: string[],
): Promise<void> {
	try {
		for (const taskName of taskNames) {
			// Get last 20 corrections per task (covers ~7 days of typical activity)
			const recent = corrections.getCorrections(taskName, 20);
			for (const correction of recent) {
				await kgBridge.storeCorrectionEpisode(correction);
			}
		}
	} catch (err) {
		console.warn("[growth] syncCorrectionsToKG failed:", (err as Error).message);
	}
}

// ---------------------------------------------------------------------------
// Main Loop
// ---------------------------------------------------------------------------

export async function runGrowthLoop(config: GrowthConfig): Promise<GrowthSessionResult> {
	const cfg = { ...DEFAULT_CONFIG, ...config } as Required<GrowthConfig>;
	const gitExec: GitExecFn = cfg.gitExecFn ?? defaultGitExec;
	const jarvisDir = join(cfg.repoRoot, "packages", "jarvis");

	console.log("[growth] Starting nightly growth session...");

	const missionPath = join(jarvisDir, "MISSION.md");
	const backlogPath = join(jarvisDir, "GROWTH_BACKLOG.md");
	const logPath = join(jarvisDir, "GROWTH_LOG.md");

	let roundNumber = 0;
	let totalCostUsd = 0;
	const roundSummaries: string[] = [];
	const council = assembleCouncil();
	if (council.length > 0) {
		console.log(
			`[growth] Council assembled: ${council.map((m) => m.name).join(", ")}`,
		);
	} else {
		console.log("[growth] No council members available (no API keys). Self-review only.");
	}

	// Build regression detector
	const detector = new RegressionDetector(
		{
			corrections: cfg.corrections,
			repoRoot: cfg.repoRoot,
			taskNames: cfg.taskNames,
		},
		(args) => gitExec(args, cfg.repoRoot),
	);

	// Sync corrections to KG at session start (KG-02)
	if (cfg.kgBridge) {
		await syncCorrectionsToKG(cfg.corrections, cfg.kgBridge, cfg.taskNames);
		console.log("[growth] Corrections synced to KG.");
	}

	while (isWithinWindow(cfg.startHour, cfg.endHour)) {
		// Respect maxRounds cap (useful for testing)
		if (cfg.maxRounds != null && roundNumber >= cfg.maxRounds) break;

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

		// Build correction rates for prompt
		const correctionRates = formatCorrectionRates(cfg.corrections, cfg.taskNames);

		// Query KG for context before prompt assembly (KG-03)
		let kgContext = "";
		if (cfg.kgBridge) {
			try {
				const keywords = extractBacklogKeywords(backlog);
				if (keywords.length > 0) {
					kgContext = await cfg.kgBridge.searchContext(keywords);
				}
			} catch (err) {
				console.warn("[growth] KG context query failed:", (err as Error).message);
			}
		}

		// Build prompt version summary for OPRO context (PROMPT-03)
		let promptVersionSummary = "";
		if (cfg.promptVersioner) {
			try {
				promptVersionSummary = cfg.taskNames
					.map((name) => cfg.promptVersioner!.getPerformanceSummary(name))
					.join("\n");
			} catch {
				// Non-critical — continue without version data
			}
		}

		// Detect capability gaps from repeated failures (SKILL-01)
		let capabilityGaps = "";
		try {
			const gaps = SkillCreator.detectGaps(cfg.ledger.database);
			if (gaps.length > 0) {
				capabilityGaps = SkillCreator.formatGapsForPrompt(gaps);
				console.log(`[growth] Detected ${gaps.length} capability gap(s).`);
			}
		} catch (err) {
			console.warn("[growth] Gap detection failed:", (err as Error).message);
		}

		const prompt = buildReflectionPrompt(
			mission,
			ledgerSummary,
			backlog,
			growthLog,
			roundNumber,
			correctionRates,
			IMPROVE_SKILL_PROCEDURE,
			kgContext,
			promptVersionSummary,
			capabilityGaps,
		);

		try {
			// Snapshot correction rates BEFORE dispatch (for regression check later)
			const snapshot = detector.snapshotRates();

			// Record HEAD before dispatch to detect if a commit was made
			const headBefore = gitExec(["rev-parse", "HEAD"], cfg.repoRoot);

			const result = await cfg.dispatcher.dispatch(prompt, {
				model: "sonnet",
				maxTurns: cfg.maxTurnsPerRound,
				timeoutMs: cfg.timeoutPerRoundMs,
			});

			totalCostUsd += result.total_cost_usd;

			// Check if the claude -p session made a commit
			const headAfter = gitExec(["rev-parse", "HEAD"], cfg.repoRoot);
			const madeCommit = headBefore !== headAfter;

			if (madeCommit) {
				// Get diff and test results for council review
				const diff = gitExec(["diff", "HEAD~1", "HEAD"], cfg.repoRoot);
				let testResults: string;
				try {
					testResults = execFileSync("npm", ["test"], {
						cwd: cfg.repoRoot,
						timeout: 60_000,
					}).toString();
				} catch (e) {
					testResults = "TESTS FAILED: " + String(e);
				}

				// Council review
				const verdict = await conveneCouncil(council, {
					improvement: `Growth round ${roundNumber}`,
					diff,
					reason: result.result.slice(0, 500),
					testResults: testResults.slice(0, 300),
					missionExcerpt: mission.slice(0, 500),
				});

				if (!verdict.approved) {
					// Council rejected — revert
					gitExec(["revert", "--no-edit", "HEAD"], cfg.repoRoot);
					roundSummaries.push(
						`Round ${roundNumber}: COUNCIL REJECTED — ${verdict.summary.slice(0, 300)}`,
					);
					console.log(`[growth] Round ${roundNumber}: COUNCIL REJECTED`);

					cfg.ledger.record({
						task_name: "growth_round",
						status: "failure",
						started_at: new Date().toISOString(),
						duration_ms: result.duration_ms,
						cost_usd: result.total_cost_usd,
						input_tokens: result.usage.input_tokens,
						output_tokens: result.usage.output_tokens,
						error: "council_rejected: " + verdict.summary.slice(0, 200),
					});
					// Continue to next round — skip regression check
				} else {
					// Council approved — check for regression
					const regressionResult = detector.checkForRegression(snapshot);

					if (regressionResult.regressed) {
						const revertHash = detector.revertCommit(headAfter);
						detector.logRegression(regressionResult, headAfter, revertHash);
						detector.markBacklogReverted(
							`growth round ${roundNumber}`,
							"regression detected",
						);
						roundSummaries.push(
							`Round ${roundNumber}: REGRESSION — reverted ${headAfter.slice(0, 7)}`,
						);
						console.log(
							`[growth] Round ${roundNumber}: REGRESSION detected, reverted ${headAfter.slice(0, 7)}`,
						);

						cfg.ledger.record({
							task_name: "growth_round",
							status: "failure",
							started_at: new Date().toISOString(),
							duration_ms: result.duration_ms,
							cost_usd: result.total_cost_usd,
							input_tokens: result.usage.input_tokens,
							output_tokens: result.usage.output_tokens,
							error: "regression_reverted: " + headAfter.slice(0, 7),
						});
					} else {
						// All clear — commit stands
						const summary = result.result.slice(0, 500);
						roundSummaries.push(`Round ${roundNumber}: ${summary}`);
						console.log(`[growth] Round ${roundNumber} complete: ${summary.slice(0, 100)}`);

						// Store growth episode in KG (KG-01)
						if (cfg.kgBridge) {
							try {
								const changedFiles = gitExec(
									["diff", "--name-only", "HEAD~1", "HEAD"],
									cfg.repoRoot,
								).split("\n").filter(Boolean);
								await cfg.kgBridge.storeGrowthEpisode(
									roundNumber,
									result.result.slice(0, 200),
									headAfter,
									changedFiles,
								);
							} catch (err) {
								console.warn("[growth] KG episode store failed:", (err as Error).message);
							}
						}

						cfg.ledger.record({
							task_name: "growth_round",
							status: "success",
							started_at: new Date().toISOString(),
							duration_ms: result.duration_ms,
							cost_usd: result.total_cost_usd,
							input_tokens: result.usage.input_tokens,
							output_tokens: result.usage.output_tokens,
						});
					}
				}
			} else {
				// No commit was made (analysis-only round)
				const summary = result.result.slice(0, 500);
				roundSummaries.push(`Round ${roundNumber}: ${summary}`);
				console.log(`[growth] Round ${roundNumber} complete (no commit): ${summary.slice(0, 100)}`);

				cfg.ledger.record({
					task_name: "growth_round",
					status: "success",
					started_at: new Date().toISOString(),
					duration_ms: result.duration_ms,
					cost_usd: result.total_cost_usd,
					input_tokens: result.usage.input_tokens,
					output_tokens: result.usage.output_tokens,
				});
			}
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

	// Compile and send morning summary
	const sessionResult: GrowthSessionResult = {
		roundsExecuted: roundNumber,
		roundSummaries,
		totalCostUsd,
	};

	if (cfg.notifyChannels?.length) {
		const morning = compileMorningSummary(sessionResult);
		await sendNotification(cfg.notifyChannels, morning, { urgent: false });
	}

	console.log(`[growth] Session complete. ${roundNumber} rounds executed.`);

	return sessionResult;
}
