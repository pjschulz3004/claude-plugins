import { describe, it, expect, vi, beforeEach } from "vitest";
import { KGBridge } from "./kg-bridge.js";
import type { KnowledgeGraphClient } from "@jarvis/kg";
import type { Episode } from "@jarvis/kg";
import type { CorrectionEvent } from "./state/telemetry.js";

// ---------------------------------------------------------------------------
// Mock KnowledgeGraphClient
// ---------------------------------------------------------------------------

function makeMockKG() {
	const episodes: Episode[] = [];
	return {
		addEpisode: vi.fn(async (ep: Episode) => {
			episodes.push(ep);
		}),
		search: vi.fn(async () => []),
		close: vi.fn(async () => {}),
		episodes,
	} as unknown as KnowledgeGraphClient & { episodes: Episode[] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KGBridge", () => {
	describe("storeGrowthEpisode", () => {
		it("creates properly structured Episode with commit hash and files", async () => {
			const kg = makeMockKG();
			const bridge = new KGBridge(kg);

			await bridge.storeGrowthEpisode(3, "Improved email triage", "abc1234", [
				"src/email.ts",
				"src/triage.ts",
			]);

			expect(kg.addEpisode).toHaveBeenCalledTimes(1);
			const ep = vi.mocked(kg.addEpisode).mock.calls[0][0];

			// Subject is the growth session entity
			expect(ep.subject.type).toBe("growth_session");
			expect(ep.subject.name).toMatch(/^growth_session_/);

			// Relation
			expect(ep.relation.type).toBe("PRODUCED");
			expect(ep.relation.properties?.round).toBe(3);
			expect(ep.relation.properties?.commit).toBe("abc1234");

			// Object is the improvement entity
			expect(ep.object.type).toBe("improvement");
			expect(ep.object.name).toBe("Improved email triage");
			expect(ep.object.properties?.files).toBe("src/email.ts,src/triage.ts");

			// Source
			expect(ep.source).toBe("growth_engine");
		});
	});

	describe("storeCorrectionEpisode", () => {
		it("creates Episode from CorrectionEvent with temporal metadata", async () => {
			const kg = makeMockKG();
			const bridge = new KGBridge(kg);

			const correction: CorrectionEvent = {
				task_name: "email_triage",
				original_decision: "archive",
				corrected_decision: "reply",
				correction_type: "manual_override",
				detected_at: "2026-03-30T12:00:00Z",
			};

			await bridge.storeCorrectionEpisode(correction);

			expect(kg.addEpisode).toHaveBeenCalledTimes(1);
			const ep = vi.mocked(kg.addEpisode).mock.calls[0][0];

			// Subject is the task entity
			expect(ep.subject.name).toBe("email_triage");
			expect(ep.subject.type).toBe("task");

			// Relation
			expect(ep.relation.type).toBe("CORRECTED_BY");
			expect(ep.relation.properties?.original).toBe("archive");
			expect(ep.relation.properties?.corrected).toBe("reply");
			expect(ep.relation.properties?.type).toBe("manual_override");

			// Object is the correction entity
			expect(ep.object.type).toBe("correction");
			expect(ep.object.name).toMatch(/^correction_/);

			// Timestamp from correction
			expect(ep.timestamp).toBe("2026-03-30T12:00:00Z");
			expect(ep.source).toBe("correction_detection");
		});
	});

	describe("searchContext", () => {
		it("returns formatted context string from KG search results", async () => {
			const kg = makeMockKG();
			vi.mocked(kg.search).mockResolvedValue([
				{
					entity: { name: "Improved email triage", type: "improvement" },
					relations: [
						{
							relation: { type: "PRODUCED" },
							target: { name: "growth_session_2026-03-29", type: "growth_session" },
							timestamp: "2026-03-29T02:00:00Z",
						},
					],
				},
				{
					entity: { name: "email_triage", type: "task" },
					relations: [
						{
							relation: { type: "CORRECTED_BY" },
							target: { name: "correction_2026-03-28", type: "correction" },
							timestamp: "2026-03-28T12:00:00Z",
						},
					],
				},
			]);

			const bridge = new KGBridge(kg);
			const result = await bridge.searchContext(["email", "triage"]);

			expect(result).toContain("Improved email triage");
			expect(result).toContain("email_triage");
			expect(result.length).toBeGreaterThan(0);
		});

		it("deduplicates results across multiple keyword searches", async () => {
			const kg = makeMockKG();
			const sameResult = {
				entity: { name: "Improved email triage", type: "improvement" },
				relations: [],
			};
			vi.mocked(kg.search).mockResolvedValue([sameResult]);

			const bridge = new KGBridge(kg);
			const result = await bridge.searchContext(["email", "triage"]);

			// Should only appear once despite two keyword searches returning same entity
			const matches = result.match(/Improved email triage/g);
			expect(matches?.length ?? 0).toBe(1);
		});

		it("caps results at maxResults", async () => {
			const kg = makeMockKG();
			const results = Array.from({ length: 10 }, (_, i) => ({
				entity: { name: `result_${i}`, type: "improvement" },
				relations: [],
			}));
			vi.mocked(kg.search).mockResolvedValue(results);

			const bridge = new KGBridge(kg);
			const result = await bridge.searchContext(["test"], 3);

			// Should only contain 3 entity names
			const entityCount = (result.match(/result_\d/g) ?? []).length;
			expect(entityCount).toBeLessThanOrEqual(3);
		});

		it("returns empty string when no results", async () => {
			const kg = makeMockKG();
			vi.mocked(kg.search).mockResolvedValue([]);

			const bridge = new KGBridge(kg);
			const result = await bridge.searchContext(["nonexistent"]);

			expect(result).toBe("");
		});
	});

	describe("graceful degradation (null KG client)", () => {
		it("storeGrowthEpisode returns without error when KG is null", async () => {
			const bridge = new KGBridge(null);
			await expect(
				bridge.storeGrowthEpisode(1, "test", "abc", ["file.ts"]),
			).resolves.toBeUndefined();
		});

		it("storeCorrectionEpisode returns without error when KG is null", async () => {
			const bridge = new KGBridge(null);
			await expect(
				bridge.storeCorrectionEpisode({
					task_name: "test",
					original_decision: "a",
					corrected_decision: "b",
					correction_type: "manual",
					detected_at: new Date().toISOString(),
				}),
			).resolves.toBeUndefined();
		});

		it("searchContext returns empty string when KG is null", async () => {
			const bridge = new KGBridge(null);
			const result = await bridge.searchContext(["anything"]);
			expect(result).toBe("");
		});
	});

	describe("error handling", () => {
		it("storeGrowthEpisode catches KG errors gracefully", async () => {
			const kg = makeMockKG();
			vi.mocked(kg.addEpisode).mockRejectedValue(new Error("Neo4j down"));

			const bridge = new KGBridge(kg);
			// Should not throw
			await expect(
				bridge.storeGrowthEpisode(1, "test", "abc", ["file.ts"]),
			).resolves.toBeUndefined();
		});

		it("searchContext catches KG errors and returns empty string", async () => {
			const kg = makeMockKG();
			vi.mocked(kg.search).mockRejectedValue(new Error("Neo4j down"));

			const bridge = new KGBridge(kg);
			const result = await bridge.searchContext(["test"]);
			expect(result).toBe("");
		});
	});
});
