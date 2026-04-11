import { readFileSync, statSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { KnowledgeGraphClient } from "@jarvis/kg";
import type Database from "better-sqlite3";
import { SituationCollector, type SituationBackends } from "./situation.js";
import { createLogger } from "./logger.js";

const log = createLogger("context");

/**
 * Minimal task config exposed to context providers.
 * Providers read what they need; fields are added as phases ship.
 */
export interface HeartbeatTaskConfig {
	kg_domains?: string[];
	kg_days_back?: number;
}

/**
 * A ContextProvider produces a text block to prepend to a task's prompt.
 * Each provider is independent, fails gracefully, and produces a labeled section.
 *
 * Contract:
 * - Return a labeled text block (e.g., "[Situation]\n...") or empty string
 * - Catch all errors internally — never throw
 * - Target ~100-300 tokens per provider
 */
export interface ContextProvider {
	readonly name: string;
	getContext(task: HeartbeatTaskConfig, taskName: string): Promise<string>;
}

// ─── Situation Provider ──────────────────────────────────────────────

export class SituationProvider implements ContextProvider {
	readonly name = "situation";
	private readonly collector: SituationCollector;

	constructor(backends: SituationBackends) {
		this.collector = new SituationCollector(backends);
	}

	async getContext(): Promise<string> {
		try {
			const situation = await this.collector.collect();
			if (!situation) return "";
			return SituationCollector.format(situation);
		} catch (err) {
			log.warn("situation_failed", { error: (err as Error).message });
			return "";
		}
	}
}

// ─── KG Context Provider ────────────────────────────────────────────

export class KGContextProvider implements ContextProvider {
	readonly name = "kg-context";

	constructor(private readonly kg: KnowledgeGraphClient | null) {}

	async getContext(task: HeartbeatTaskConfig): Promise<string> {
		if (!this.kg) return "";
		if (!task.kg_domains || task.kg_domains.length === 0) return "";

		try {
			const raw = await this.kg.searchForContext({
				keywords: task.kg_domains,
				daysBack: task.kg_days_back ?? 7,
				limit: 5,
			});
			if (!raw) return "";

			log.info("kg_context_injected", {
				keywords: task.kg_domains,
				lines: raw.split("\n").length,
			});
			return `[Cross-domain context]\n${raw}\n`;
		} catch (err) {
			log.warn("kg_context_failed", { error: (err as Error).message });
			return "";
		}
	}
}

// ─── Static Rules Provider ──────────────────────────────────────────

interface RulesConfig {
	[taskName: string]: string[];
}

/**
 * Injects deterministic rules from a YAML file into task prompts.
 * Rules are NOT in the KG — they can't be invalidated by observations.
 *
 * rules.yaml format:
 *   email_triage:
 *     - "rule text"
 *   morning_briefing:
 *     - "rule text"
 */
export class StaticRulesProvider implements ContextProvider {
	readonly name = "static-rules";
	private rules: RulesConfig = {};
	private yamlPath: string;
	private mtime = 0;

	constructor(yamlPath: string) {
		this.yamlPath = yamlPath;
		this.reload();
	}

	private reload(): void {
		try {
			const { mtimeMs } = statSync(this.yamlPath);
			if (mtimeMs <= this.mtime) return;

			const raw = readFileSync(this.yamlPath, "utf-8");
			this.rules = parseYaml(raw) as RulesConfig;
			this.mtime = mtimeMs;
			log.info("rules_loaded", { tasks: Object.keys(this.rules).length });
		} catch (err) {
			log.warn("rules_load_failed", { error: (err as Error).message });
		}
	}

	async getContext(_task: HeartbeatTaskConfig, taskName: string): Promise<string> {
		this.reload(); // Hot-reload on each call (cheap stat check)
		const taskRules = this.rules[taskName];
		if (!taskRules || taskRules.length === 0) return "";

		return `[Rules]\n${taskRules.join("\n")}\n`;
	}
}

// ─── Token Awareness Provider ───────────────────────────────────────

interface TokenWindow {
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	taskCount: number;
}

/**
 * Injects token usage awareness from the task ledger.
 * Tells each agent how many tokens have been consumed in the last 5 hours,
 * today, and this week — so the Dreamer/Executor can budget their reasoning.
 *
 * No external API polling — aggregates from the existing SQLite task ledger.
 * Claude Max has no reliable programmatic quota API (as of 2026-04).
 */
export class TokenAwarenessProvider implements ContextProvider {
	readonly name = "token-awareness";

	constructor(private readonly db: Database.Database) {}

	private queryWindow(sinceSql: string): TokenWindow {
		const row = this.db.prepare(`
			SELECT
				COALESCE(SUM(input_tokens), 0) AS input_tokens,
				COALESCE(SUM(output_tokens), 0) AS output_tokens,
				COALESCE(SUM(cost_usd), 0) AS cost_usd,
				COUNT(*) AS task_count
			FROM task_runs
			WHERE status = 'success' AND started_at >= ${sinceSql}
		`).get() as { input_tokens: number; output_tokens: number; cost_usd: number; task_count: number };

		return {
			inputTokens: row.input_tokens,
			outputTokens: row.output_tokens,
			costUsd: row.cost_usd,
			taskCount: row.task_count,
		};
	}

	async getContext(): Promise<string> {
		try {
			const fiveHour = this.queryWindow("datetime('now', '-5 hours')");
			const today = this.queryWindow("datetime('now', 'start of day')");
			const week = this.queryWindow("datetime('now', '-7 days')");

			// Skip injection if no activity at all
			if (week.taskCount === 0) return "";

			const fmt = (w: TokenWindow) =>
				`${((w.inputTokens + w.outputTokens) / 1000).toFixed(0)}k tokens, $${w.costUsd.toFixed(2)}, ${w.taskCount} tasks`;

			const lines = [
				"[Token budget]",
				`5h window: ${fmt(fiveHour)}`,
				`Today: ${fmt(today)}`,
				`Week: ${fmt(week)}`,
			];

			return lines.join("\n") + "\n";
		} catch (err) {
			log.warn("token_awareness_failed", { error: (err as Error).message });
			return "";
		}
	}
}
