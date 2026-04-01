/**
 * KGBridge — Thin wrapper around KnowledgeGraphClient for growth-specific operations.
 *
 * Stores growth episodes (improvements committed during nightly sessions) and
 * correction episodes (human overrides of Jarvis decisions) as KG episodes.
 * Provides search for contextual memory in the growth prompt.
 *
 * Gracefully degrades when KG is unavailable (null client or Neo4j down).
 */

import type { KnowledgeGraphClient, Episode, SearchResult } from "@jarvis/kg";
import type { CorrectionEvent } from "./state/telemetry.js";
import { createLogger } from "./logger.js";

const log = createLogger("kg-bridge");

export class KGBridge {
	constructor(private readonly kg: KnowledgeGraphClient | null) {}

	/**
	 * Store a growth session improvement as a KG episode.
	 * Called after a successful commit in the nightly growth loop.
	 */
	async storeGrowthEpisode(
		roundNumber: number,
		description: string,
		commitHash: string,
		filesChanged: string[],
	): Promise<void> {
		if (!this.kg) return;

		const date = new Date().toISOString().slice(0, 10);
		const episode: Episode = {
			subject: {
				name: `growth_session_${date}`,
				type: "growth_session",
			},
			relation: {
				type: "PRODUCED",
				properties: {
					round: roundNumber,
					commit: commitHash,
				},
			},
			object: {
				name: description,
				type: "improvement",
				properties: {
					files: filesChanged.join(","),
				},
			},
			timestamp: new Date().toISOString(),
			source: "growth_engine",
		};

		try {
			await this.kg.addEpisode(episode);
			log.info("kg_episode_stored", { type: "growth", subject: `growth_session_${date}`, round: roundNumber });
		} catch (err) {
			log.warn("kg_unavailable", { operation: "storeGrowthEpisode", error: (err as Error).message });
		}
	}

	/**
	 * Store a correction event as a KG episode.
	 * Called when human overrides are detected.
	 */
	async storeCorrectionEpisode(correction: CorrectionEvent): Promise<void> {
		if (!this.kg) return;

		const date = correction.corrected_at.slice(0, 10);
		const episode: Episode = {
			subject: {
				name: correction.task_name,
				type: "task",
			},
			relation: {
				type: "CORRECTED_BY",
				properties: {
					original: correction.original_decision,
					corrected: correction.corrected_decision,
					decided_at: correction.decided_at,
				},
			},
			object: {
				name: `correction_${date}`,
				type: "correction",
			},
			timestamp: correction.corrected_at,
			source: "correction_detection",
		};

		try {
			await this.kg.addEpisode(episode);
			log.info("kg_episode_stored", { type: "correction", subject: correction.task_name });
		} catch (err) {
			log.warn("kg_unavailable", { operation: "storeCorrectionEpisode", error: (err as Error).message });
		}
	}

	/**
	 * Search the KG for context relevant to given keywords.
	 * Returns a formatted string for inclusion in the growth prompt.
	 */
	async searchContext(
		keywords: string[],
		maxResults: number = 5,
	): Promise<string> {
		if (!this.kg) return "";

		try {
			const seen = new Set<string>();
			const results: SearchResult[] = [];

			for (const keyword of keywords) {
				const hits = await this.kg.search(keyword);
				for (const hit of hits) {
					if (!seen.has(hit.entity.name) && results.length < maxResults) {
						seen.add(hit.entity.name);
						results.push(hit);
					}
				}
			}

			if (results.length === 0) return "";

			const lines = results.map((r) => {
				const relSummary = r.relations
					.map(
						(rel) =>
							`${rel.relation.type} ${rel.target.name} (${rel.timestamp.slice(0, 10)})`,
					)
					.join("; ");
				return `- ${r.entity.name} [${r.entity.type}]${relSummary ? `: ${relSummary}` : ""}`;
			});

			return lines.join("\n");
		} catch (err) {
			log.warn("kg_unavailable", { operation: "searchContext", error: (err as Error).message });
			return "";
		}
	}
}
