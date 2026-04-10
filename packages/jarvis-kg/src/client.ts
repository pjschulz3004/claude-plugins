import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";
import type {
	KGClientConfig,
	KGStats,
	Episode,
	SearchResult,
	ContextSearchOptions,
} from "./types.js";

export class KnowledgeGraphClient {
	private readonly driver: Driver;
	private readonly staleThresholdDays: number;

	constructor(config: KGClientConfig) {
		this.driver = neo4j.driver(
			config.uri,
			neo4j.auth.basic(config.user, config.password),
		);
		this.staleThresholdDays = config.staleThresholdDays ?? 30;
	}

	/**
	 * @deprecated Use Python Graphiti client (via MCP tool) for episode ingestion.
	 * This method creates Entity nodes with a schema incompatible with Graphiti.
	 * Retained temporarily for backward compatibility with kg-bridge.ts growth engine.
	 */
	async addEpisode(episode: Episode): Promise<void> {
		console.warn("[jarvis-kg] addEpisode is DEPRECATED — creates non-Graphiti schema. Use Python Graphiti MCP tool instead.");
		const session = this.driver.session();
		try {
			const cypher = `
				MERGE (s:Entity {name: $subjectName, type: $subjectType})
				SET s += $subjectProps
				MERGE (o:Entity {name: $objectName, type: $objectType})
				SET o += $objectProps
				CREATE (s)-[r:RELATES_TO {type: $relationType, timestamp: $timestamp, source: $source}]->(o)
				SET r += $relationProps
			`;

			await session.run(cypher, {
				subjectName: episode.subject.name,
				subjectType: episode.subject.type,
				subjectProps: episode.subject.properties ?? {},
				objectName: episode.object.name,
				objectType: episode.object.type,
				objectProps: episode.object.properties ?? {},
				relationType: episode.relation.type,
				relationProps: episode.relation.properties ?? {},
				timestamp: episode.timestamp ?? new Date().toISOString(),
				source: episode.source ?? "",
			});
		} catch (_error) {
			// Graceful degradation: log warning but don't throw
			console.warn(
				"[jarvis-kg] addEpisode failed (Neo4j unavailable?):",
				(_error as Error).message,
			);
		} finally {
			await session.close();
		}
	}

	async search(query: string, type?: string): Promise<SearchResult[]> {
		const session = this.driver.session();
		try {
			// Graphiti schema: Entity nodes have labels[] and summary instead of a type property
			const cypher = `
				MATCH (e:Entity)
				WHERE toLower(e.name) CONTAINS toLower($query)
				  AND ($type IS NULL OR $type IN e.labels)
				OPTIONAL MATCH (e)-[:RELATES_TO]->(edge:RelatesToNode_)-[:RELATES_TO]->(other:Entity)
				RETURN e, collect({edge: edge, target: other}) as relations
				LIMIT 20
			`;

			const result = await session.run(cypher, {
				query,
				type: type ?? null,
			});

			return result.records.map((record) => {
				const entityNode = record.get("e");
				const relationsData = record.get("relations") as Array<{
					edge: { properties: Record<string, unknown> } | null;
					target: { properties: Record<string, unknown> } | null;
				}>;

				const labels = (entityNode.properties.labels as string[] | undefined) ?? [];
				const entityType = labels[0] ?? "";
				const summary = entityNode.properties.summary as string | undefined;

				return {
					entity: {
						name: entityNode.properties.name as string,
						type: entityType,
						...(summary !== undefined ? { summary } : {}),
					},
					relations: relationsData
						.filter((r) => r.edge && r.target)
						.map((r) => ({
							relation: {
								type: (r.edge!.properties.name as string) ?? "",
							},
							target: {
								name: (r.target!.properties.name as string) ?? "",
								type: ((r.target!.properties.labels as string[] | undefined)?.[0]) ?? "",
							},
							timestamp: "",
						})),
				};
			});
		} catch (_error) {
			console.warn(
				"[jarvis-kg] search failed (Neo4j unavailable?):",
				(_error as Error).message,
			);
			return [];
		} finally {
			await session.close();
		}
	}

	async getStats(staleThresholdDays?: number): Promise<KGStats> {
		const session = this.driver.session();
		const threshold = staleThresholdDays ?? this.staleThresholdDays;
		const cutoff = new Date(
			Date.now() - threshold * 24 * 60 * 60 * 1000,
		).toISOString();

		try {
			const nodeResult = await session.run(
				"MATCH (n:Entity) RETURN count(n) as nodeCount",
			);
			const nodeCount = nodeResult.records[0]
				.get("nodeCount")
				.toNumber();

			// Graphiti stores edges as RelatesToNode_ intermediate nodes, not as native relationships
			const edgeResult = await session.run(
				"MATCH (n:RelatesToNode_) RETURN count(n) as edgeCount",
			);
			const edgeCount = edgeResult.records[0]
				.get("edgeCount")
				.toNumber();

			// RelatesToNode_ nodes have created_at (Graphiti DateTime), compare as ISO string
			const staleResult = await session.run(
				"MATCH (n:RelatesToNode_) WHERE toString(n.created_at) < $cutoff RETURN count(n) as staleCount",
				{ cutoff },
			);
			const staleEdgeCount = staleResult.records[0]
				.get("staleCount")
				.toNumber();

			return { nodeCount, edgeCount, staleEdgeCount };
		} catch (_error) {
			console.warn(
				"[jarvis-kg] getStats failed (Neo4j unavailable?):",
				(_error as Error).message,
			);
			return { nodeCount: 0, edgeCount: 0, staleEdgeCount: 0 };
		} finally {
			await session.close();
		}
	}

	/**
	 * @deprecated Stale edge management should go through Python Graphiti client.
	 * This method previously deleted RELATES_TO relationships, which destroys
	 * Graphiti's RelatesToNode_ edge structure. Now a safe no-op.
	 */
	async expireStale(olderThanDays?: number): Promise<number> {
		console.warn("[jarvis-kg] expireStale is DEPRECATED and now a no-op. Use Python Graphiti for memory consolidation.");
		return 0;
	}

	async searchForContext(options: ContextSearchOptions): Promise<string> {
		const { keywords, limit = 5 } = options;
		const session = this.driver.session();

		try {
			const seen = new Set<string>();
			const lines: string[] = [];

			for (const keyword of keywords) {
				if (lines.length >= limit) break;

				// Query Graphiti Entity nodes by name, filtered to jarvis group_id.
				// OPTIONAL MATCH traverses RelatesToNode_ edges for richer context;
				// gracefully handles the case where no edges exist yet.
				const cypher = `
					MATCH (e:Entity)
					WHERE toLower(e.name) CONTAINS toLower($query)
					  AND e.group_id = 'jarvis'
					  AND e.summary IS NOT NULL
					OPTIONAL MATCH (e)-[:RELATES_TO]->(edge:RelatesToNode_)-[:RELATES_TO]->(other:Entity)
					WHERE edge.group_id = 'jarvis'
					RETURN e.name AS name, e.summary AS summary, e.labels AS labels,
					       collect({fact: edge.fact, target: other.name}) AS relations
					LIMIT $perKeywordLimit
				`;

				const result = await session.run(cypher, {
					query: keyword,
					perKeywordLimit: neo4j.int(limit),
				});

				for (const record of result.records) {
					if (lines.length >= limit) break;

					const name = record.get("name") as string;
					const summary = record.get("summary") as string;
					const labelsList = record.get("labels") as string[] | null;
					const label = labelsList && labelsList.length > 0 ? labelsList[0] : null;

					if (seen.has(name)) continue;
					seen.add(name);

					const relationsRaw = record.get("relations") as Array<{
						fact: string | null;
						target: string | null;
					}>;

					// Filter out null entries (OPTIONAL MATCH with no edges returns [{fact: null, target: null}])
					const validRelations = relationsRaw.filter(
						(r) => r.fact !== null && r.target !== null,
					);

					let line: string;
					const labelPart = label ? ` (${label})` : "";
					if (validRelations.length > 0) {
						const relParts = validRelations.map((r) => `${r.fact} -> ${r.target}`);
						line = `- ${name}${labelPart}: ${summary}. Related: ${relParts.join(", ")}`;
					} else {
						line = `- ${name}${labelPart}: ${summary}`;
					}

					lines.push(line);
				}
			}

			return lines.join("\n");
		} catch (_error) {
			console.warn(
				"[jarvis-kg] searchForContext failed (Neo4j unavailable?):",
				(_error as Error).message,
			);
			return "";
		} finally {
			await session.close();
		}
	}

	async close(): Promise<void> {
		await this.driver.close();
	}
}
