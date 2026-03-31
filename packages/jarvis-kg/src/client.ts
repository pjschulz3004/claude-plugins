import neo4j from "neo4j-driver";
import type { Driver, Session } from "neo4j-driver";
import type {
	KGClientConfig,
	KGStats,
	Episode,
	SearchResult,
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

	async addEpisode(episode: Episode): Promise<void> {
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
			const cypher = `
				MATCH (e:Entity)
				WHERE toLower(e.name) CONTAINS toLower($query)
				  AND ($type IS NULL OR e.type = $type)
				OPTIONAL MATCH (e)-[r:RELATES_TO]-(other:Entity)
				RETURN e, collect({relation: r, target: other}) as relations
				LIMIT 20
			`;

			const result = await session.run(cypher, {
				query,
				type: type ?? null,
			});

			return result.records.map((record) => {
				const entityNode = record.get("e");
				const relationsData = record.get("relations") as Array<{
					relation: { properties: Record<string, unknown> };
					target: { properties: Record<string, unknown> };
				}>;

				return {
					entity: {
						name: entityNode.properties.name as string,
						type: entityNode.properties.type as string,
					},
					relations: relationsData
						.filter((r) => r.relation && r.target)
						.map((r) => ({
							relation: {
								type: (r.relation.properties.type as string) ?? "",
							},
							target: {
								name: (r.target.properties.name as string) ?? "",
								type: (r.target.properties.type as string) ?? "",
							},
							timestamp:
								(r.relation.properties.timestamp as string) ?? "",
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

			const edgeResult = await session.run(
				"MATCH ()-[r:RELATES_TO]-() RETURN count(r) as edgeCount",
			);
			const edgeCount = edgeResult.records[0]
				.get("edgeCount")
				.toNumber();

			const staleResult = await session.run(
				"MATCH ()-[r:RELATES_TO]-() WHERE r.timestamp < $cutoff RETURN count(r) as staleCount",
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

	async expireStale(olderThanDays?: number): Promise<number> {
		const session = this.driver.session();
		const threshold = olderThanDays ?? this.staleThresholdDays;
		const cutoff = new Date(
			Date.now() - threshold * 24 * 60 * 60 * 1000,
		).toISOString();

		try {
			const deleteResult = await session.run(
				`MATCH ()-[r:RELATES_TO]-()
				 WHERE r.timestamp < $cutoff
				 DELETE r
				 RETURN count(r) as deleted`,
				{ cutoff },
			);
			const deleted = deleteResult.records[0]
				.get("deleted")
				.toNumber();

			// Clean up orphaned nodes
			await session.run(
				`MATCH (n:Entity)
				 WHERE NOT (n)--()
				 DELETE n`,
			);

			return deleted;
		} catch (_error) {
			console.warn(
				"[jarvis-kg] expireStale failed (Neo4j unavailable?):",
				(_error as Error).message,
			);
			return 0;
		} finally {
			await session.close();
		}
	}

	async close(): Promise<void> {
		await this.driver.close();
	}
}
