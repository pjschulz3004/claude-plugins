import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";

export type RuleSource = "seeded" | "user_correction" | "self_generated";

export interface Rule {
	id: string;
	text: string;
	confidence: number;
	source: RuleSource;
	added: string;
	evaluations: number;
	accuracy: number;
}

export interface RuleFile {
	domain: string;
	version: number;
	description: string;
	categories?: string[];
	routing?: Record<string, string>[];
	rules: Rule[];
	[key: string]: unknown; // allow extra top-level fields (auto_delete_keywords, llm_fallback, etc.)
}

export class RuleStore {
	static load(filePath: string): RuleFile {
		const content = readFileSync(filePath, "utf8");
		const parsed = YAML.parse(content) as RuleFile;
		if (!parsed.rules) {
			parsed.rules = [];
		}
		return parsed;
	}

	static save(filePath: string, ruleFile: RuleFile): void {
		const content = YAML.stringify(ruleFile, {
			lineWidth: 0,
		});
		writeFileSync(filePath, content, "utf8");
	}

	static addRule(ruleFile: RuleFile, rule: Omit<Rule, "id">): Rule {
		const maxNum = ruleFile.rules.reduce((max, r) => {
			const match = r.id.match(/-(\d+)$/);
			return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
		}, 0);

		const newRule: Rule = {
			id: `${ruleFile.domain}-${String(maxNum + 1).padStart(3, "0")}`,
			...rule,
		};

		ruleFile.rules.push(newRule);
		return newRule;
	}

	static updateConfidence(
		ruleFile: RuleFile,
		ruleId: string,
		newConfidence: number,
	): void {
		const rule = ruleFile.rules.find((r) => r.id === ruleId);
		if (!rule) {
			throw new Error(`Rule ${ruleId} not found`);
		}
		rule.confidence = newConfidence;
	}

	static flaggedForReview(ruleFile: RuleFile): Rule[] {
		return ruleFile.rules.filter((r) => r.confidence < 0.8);
	}

	static findByText(ruleFile: RuleFile, substring: string): Rule[] {
		const lower = substring.toLowerCase();
		return ruleFile.rules.filter((r) => r.text.toLowerCase().includes(lower));
	}
}
