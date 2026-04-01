/**
 * SkillCreator — Gap detection and skill templating helper.
 *
 * Pure helper class (no git/gh operations). Detects capability gaps from
 * repeated task failures in the ledger, and provides templates for new
 * SKILL.md files and MCP tool scaffolds.
 *
 * The actual skill creation (branching, committing, PR) is done by the
 * growth engine's claude -p session using the instructions we embed in
 * the growth prompt.
 */

import type Database from "better-sqlite3";
import { createLogger } from "./logger.js";

const log = createLogger("skill-creator");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GapDetectionResult {
	/** Normalized error pattern describing the missing capability. */
	pattern: string;
	/** Number of times this pattern appeared in the last 30 days. */
	occurrences: number;
	/** Sample error messages matching this pattern. */
	examples: string[];
	/** ISO timestamp of earliest occurrence. */
	firstSeen: string;
	/** ISO timestamp of most recent occurrence. */
	lastSeen: string;
}

// ---------------------------------------------------------------------------
// Gap-indicating keywords
// ---------------------------------------------------------------------------

const GAP_KEYWORDS = [
	"no tool",
	"not available",
	"cannot find tool",
	"cannot",
	"unsupported operation",
	"unsupported",
] as const;

// ---------------------------------------------------------------------------
// SkillCreator (all static — pure helper, no instance state)
// ---------------------------------------------------------------------------

export class SkillCreator {
	/**
	 * Scan the task_runs table for repeated failures whose error messages
	 * indicate a missing capability. Groups by normalized error pattern
	 * and returns gaps with occurrences >= minOccurrences.
	 */
	static detectGaps(
		db: Database.Database,
		minOccurrences = 3,
	): GapDetectionResult[] {
		log.info("gap_detection_start", { minOccurrences });
		const thirtyDaysAgo = new Date(
			Date.now() - 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		// Fetch all recent failures with error messages
		const rows = db
			.prepare(
				`SELECT error, started_at
				 FROM task_runs
				 WHERE status = 'failure'
				   AND error IS NOT NULL
				   AND started_at >= ?
				 ORDER BY started_at ASC`,
			)
			.all(thirtyDaysAgo) as Array<{ error: string; started_at: string }>;

		// Group rows by which gap keyword they match
		const groups = new Map<
			string,
			{ errors: string[]; dates: string[] }
		>();

		for (const row of rows) {
			const errorLower = row.error.toLowerCase();

			// Find the first matching gap keyword
			const keyword = GAP_KEYWORDS.find((kw) =>
				errorLower.includes(kw),
			);
			if (!keyword) continue;

			// Normalize: strip file paths, hex values, and numbers to group
			// semantically identical errors despite variable text.
			const normalizedPattern = row.error
				.toLowerCase()
				.trim()
				.replace(/\/[\w./-]+/g, "<path>")
				.replace(/0x[a-f0-9]+/gi, "<hex>")
				.replace(/\b\d+\b/g, "<n>");

			const group = groups.get(normalizedPattern) ?? {
				errors: [],
				dates: [],
			};
			group.errors.push(row.error);
			group.dates.push(row.started_at);
			groups.set(normalizedPattern, group);
		}

		// Filter by minOccurrences and build results
		const results: GapDetectionResult[] = [];

		for (const [pattern, group] of groups) {
			if (group.errors.length < minOccurrences) continue;

			// Deduplicate examples (keep up to 3 unique)
			const uniqueExamples = [...new Set(group.errors)].slice(0, 3);

			results.push({
				pattern,
				occurrences: group.errors.length,
				examples: uniqueExamples,
				firstSeen: group.dates[0],
				lastSeen: group.dates[group.dates.length - 1],
			});
		}

		// Sort by occurrences descending
		results.sort((a, b) => b.occurrences - a.occurrences);

		for (const gap of results) {
			log.info("gap_detected", { pattern: gap.pattern, occurrences: gap.occurrences });
		}
		log.info("gap_detection_complete", { gapsFound: results.length });

		return results;
	}

	/**
	 * Return a SKILL.md template matching the existing skill pattern
	 * (Trigger, Procedure, Tools, Rules, Output).
	 */
	static getSkillTemplate(): string {
		return `---
name: "{SKILL_NAME}"
description: "{SKILL_DESCRIPTION}"
---

# {SKILL_NAME} Skill

{One-line summary of what this skill does.}

## Trigger

When should this skill activate? Describe the conditions.

- Condition 1
- Condition 2

## Procedure

Step-by-step instructions for executing this skill.

### Step 1: {First Step}

{Description of what to do.}

### Step 2: {Second Step}

{Description of what to do.}

## Tools

MCP tools used by this skill:

- \`mcp__jarvis-{tool}__action\` - {description}

## Rules

Decision rules and edge cases:

- Rule 1: {description}
- Rule 2: {description}
- When uncertain: {fallback behavior}

## Output

Expected output format:

\`\`\`
{Example output}
\`\`\`
`;
	}

	/**
	 * Return a TypeScript MCP tool scaffold with Zod schema,
	 * handler function, and test file stub reference.
	 */
	static getToolScaffold(toolName: string): string {
		const camelName = toolName
			.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

		return `/**
 * MCP Tool: ${toolName}
 *
 * {TOOL_DESCRIPTION}
 *
 * Test file: ${toolName}.test.ts
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ${camelName}Schema = z.object({
	// Define input parameters here
	// example: query: z.string().describe("Search query"),
});

export type ${camelName}Input = z.infer<typeof ${camelName}Schema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function ${camelName}(
	input: ${camelName}Input,
): Promise<string> {
	const parsed = ${camelName}Schema.parse(input);

	// TODO: Implement tool logic here

	return JSON.stringify({ success: true });
}

// ---------------------------------------------------------------------------
// Tool Definition (for MCP server registration)
// ---------------------------------------------------------------------------

export const ${camelName}Tool = {
	name: "${toolName}",
	description: "{TOOL_DESCRIPTION}",
	inputSchema: ${camelName}Schema,
	handler: ${camelName},
};
`;
	}

	/**
	 * Format detected gaps as a prompt-friendly summary for inclusion
	 * in the growth engine reflection prompt.
	 */
	static formatGapsForPrompt(gaps: GapDetectionResult[]): string {
		if (gaps.length === 0) {
			return "No recurring capability gaps detected in the last 30 days.";
		}

		const lines = gaps.map(
			(gap, i) =>
				`${i + 1}. **${gap.pattern}** (${gap.occurrences} occurrences, ${gap.firstSeen.slice(0, 10)} to ${gap.lastSeen.slice(0, 10)})\n   Examples: ${gap.examples.slice(0, 2).join("; ")}`,
		);

		return `Detected ${gaps.length} recurring capability gap${gaps.length > 1 ? "s" : ""}:\n\n${lines.join("\n\n")}`;
	}
}
