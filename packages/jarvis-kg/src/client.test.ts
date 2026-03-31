import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock neo4j-driver before importing client
const mockRun = vi.fn();
const mockClose = vi.fn();
const mockSession = {
	run: mockRun,
	close: mockClose,
};
const mockDriverClose = vi.fn();
const mockDriver = {
	session: vi.fn(() => mockSession),
	close: mockDriverClose,
};

vi.mock("neo4j-driver", () => ({
	default: {
		driver: vi.fn(() => mockDriver),
		auth: {
			basic: vi.fn((user: string, pass: string) => ({ user, pass })),
		},
	},
}));

import { KnowledgeGraphClient } from "./client.js";
import type { Episode, SearchResult, KGStats } from "./types.js";

describe("KnowledgeGraphClient", () => {
	let client: KnowledgeGraphClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new KnowledgeGraphClient({
			uri: "bolt://localhost:7687",
			user: "neo4j",
			password: "test",
		});
	});

	describe("addEpisode", () => {
		it("calls session.run with correct Cypher and params", async () => {
			mockRun.mockResolvedValue({ records: [] });

			const episode: Episode = {
				subject: { name: "Paul", type: "person" },
				relation: { type: "SENT_BY" },
				object: { name: "Invoice #42", type: "invoice" },
				timestamp: "2026-03-31T10:00:00Z",
				source: "email_triage",
			};

			await client.addEpisode(episode);

			expect(mockRun).toHaveBeenCalledOnce();
			const [cypher, params] = mockRun.mock.calls[0];
			expect(cypher).toContain("MERGE");
			expect(cypher).toContain("$subjectName");
			expect(cypher).toContain("$objectName");
			expect(params.subjectName).toBe("Paul");
			expect(params.subjectType).toBe("person");
			expect(params.objectName).toBe("Invoice #42");
			expect(params.objectType).toBe("invoice");
			expect(params.relationType).toBe("SENT_BY");
			expect(params.timestamp).toBe("2026-03-31T10:00:00Z");
			expect(params.source).toBe("email_triage");
			expect(mockSession.close).toHaveBeenCalledOnce();
		});

		it("defaults timestamp to now when not provided", async () => {
			mockRun.mockResolvedValue({ records: [] });

			const episode: Episode = {
				subject: { name: "A", type: "person" },
				relation: { type: "KNOWS" },
				object: { name: "B", type: "person" },
			};

			await client.addEpisode(episode);

			const [, params] = mockRun.mock.calls[0];
			expect(params.timestamp).toBeDefined();
			// Should be a valid ISO string
			expect(() => new Date(params.timestamp)).not.toThrow();
		});
	});

	describe("search", () => {
		it("returns mapped SearchResult[] from mock records", async () => {
			mockRun.mockResolvedValue({
				records: [
					{
						get: (key: string) => {
							if (key === "e") {
								return {
									properties: {
										name: "Paul",
										type: "person",
									},
								};
							}
							if (key === "relations") {
								return [
									{
										relation: {
											properties: {
												type: "SENT_BY",
												timestamp: "2026-03-31T10:00:00Z",
												source: "email",
											},
										},
										target: {
											properties: {
												name: "Invoice #42",
												type: "invoice",
											},
										},
									},
								];
							}
							return null;
						},
					},
				],
			});

			const results = await client.search("Paul");

			expect(results).toHaveLength(1);
			expect(results[0].entity.name).toBe("Paul");
			expect(results[0].entity.type).toBe("person");
			expect(results[0].relations).toHaveLength(1);
			expect(results[0].relations[0].relation.type).toBe("SENT_BY");
			expect(results[0].relations[0].target.name).toBe("Invoice #42");
			expect(mockSession.close).toHaveBeenCalled();
		});

		it("passes type filter when provided", async () => {
			mockRun.mockResolvedValue({ records: [] });

			await client.search("Paul", "person");

			const [, params] = mockRun.mock.calls[0];
			expect(params.query).toBe("Paul");
			expect(params.type).toBe("person");
		});

		it("passes null type when not provided", async () => {
			mockRun.mockResolvedValue({ records: [] });

			await client.search("Paul");

			const [, params] = mockRun.mock.calls[0];
			expect(params.type).toBeNull();
		});
	});

	describe("getStats", () => {
		it("returns counts from mock queries", async () => {
			mockRun
				.mockResolvedValueOnce({
					records: [
						{
							get: (key: string) => {
								if (key === "nodeCount") return { toNumber: () => 42 };
								return null;
							},
						},
					],
				})
				.mockResolvedValueOnce({
					records: [
						{
							get: (key: string) => {
								if (key === "edgeCount") return { toNumber: () => 100 };
								return null;
							},
						},
					],
				})
				.mockResolvedValueOnce({
					records: [
						{
							get: (key: string) => {
								if (key === "staleCount") return { toNumber: () => 15 };
								return null;
							},
						},
					],
				});

			const stats = await client.getStats();

			expect(stats.nodeCount).toBe(42);
			expect(stats.edgeCount).toBe(100);
			expect(stats.staleEdgeCount).toBe(15);
			expect(mockRun).toHaveBeenCalledTimes(3);
		});

		it("uses custom threshold when provided", async () => {
			mockRun
				.mockResolvedValueOnce({
					records: [{ get: () => ({ toNumber: () => 0 }) }],
				})
				.mockResolvedValueOnce({
					records: [{ get: () => ({ toNumber: () => 0 }) }],
				})
				.mockResolvedValueOnce({
					records: [{ get: () => ({ toNumber: () => 0 }) }],
				});

			await client.getStats(60);

			const [, params] = mockRun.mock.calls[2];
			expect(params.cutoff).toBeDefined();
		});
	});

	describe("expireStale", () => {
		it("returns deleted count and runs orphan cleanup", async () => {
			mockRun
				.mockResolvedValueOnce({
					records: [
						{
							get: (key: string) => {
								if (key === "deleted") return { toNumber: () => 7 };
								return null;
							},
						},
					],
				})
				.mockResolvedValueOnce({ records: [] }); // orphan cleanup

			const deleted = await client.expireStale(30);

			expect(deleted).toBe(7);
			expect(mockRun).toHaveBeenCalledTimes(2);
			// Second call should be orphan cleanup
			const [orphanCypher] = mockRun.mock.calls[1];
			expect(orphanCypher).toContain("DELETE n");
		});
	});

	describe("graceful degradation", () => {
		it("addEpisode returns silently on connection error", async () => {
			const error = new Error("ServiceUnavailable");
			error.name = "Neo4jError";
			mockRun.mockRejectedValue(error);

			// Should NOT throw
			await expect(
				client.addEpisode({
					subject: { name: "A", type: "person" },
					relation: { type: "KNOWS" },
					object: { name: "B", type: "person" },
				}),
			).resolves.toBeUndefined();
		});

		it("search returns empty array on connection error", async () => {
			const error = new Error("ServiceUnavailable");
			error.name = "Neo4jError";
			mockRun.mockRejectedValue(error);

			const results = await client.search("test");
			expect(results).toEqual([]);
		});

		it("getStats returns zeros on connection error", async () => {
			const error = new Error("ServiceUnavailable");
			error.name = "Neo4jError";
			mockRun.mockRejectedValue(error);

			const stats = await client.getStats();
			expect(stats).toEqual({
				nodeCount: 0,
				edgeCount: 0,
				staleEdgeCount: 0,
			});
		});

		it("expireStale returns 0 on connection error", async () => {
			const error = new Error("ServiceUnavailable");
			error.name = "Neo4jError";
			mockRun.mockRejectedValue(error);

			const deleted = await client.expireStale();
			expect(deleted).toBe(0);
		});
	});

	describe("close", () => {
		it("calls driver.close()", async () => {
			mockDriverClose.mockResolvedValue(undefined);

			await client.close();

			expect(mockDriverClose).toHaveBeenCalledOnce();
		});
	});
});
