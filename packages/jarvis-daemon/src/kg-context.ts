import type { KnowledgeGraphClient } from "@jarvis/kg";
import { createLogger } from "./logger.js";

const log = createLogger("kg-context");

/**
 * Queries the knowledge graph for cross-domain context and formats it for prompt injection.
 * Thin wrapper: the scheduler decides which keywords to use (from task.kg_domains in YAML).
 *
 * Gracefully degrades: KG unavailability never blocks task dispatch.
 */
export class KGContextInjector {
	constructor(private readonly kg: KnowledgeGraphClient | null) {}

	/**
	 * Get formatted KG context for the given domain keywords.
	 * Returns a `[Cross-domain context]` block, or empty string if:
	 * - KG client is null
	 * - keywords array is empty
	 * - KG returns no results
	 * - KG query fails
	 */
	async getContext(
		keywords: string[],
		daysBack: number = 7,
		limit: number = 5,
	): Promise<string> {
		if (!this.kg || keywords.length === 0) return "";

		try {
			const raw = await this.kg.searchForContext({ keywords, daysBack, limit });
			if (!raw) return "";

			log.info("kg_context_injected", { keywords, lines: raw.split("\n").length });
			return `[Cross-domain context]\n${raw}\n`;
		} catch (err) {
			log.warn("kg_context_failed", { error: (err as Error).message });
			return "";
		}
	}
}
