import { readFileSync, statSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { KnowledgeGraphClient } from "@jarvis/kg";
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
