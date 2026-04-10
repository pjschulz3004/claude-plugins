import { describe, it, expect, vi } from "vitest";
import { KGContextInjector } from "./kg-context.js";
import type { KnowledgeGraphClient } from "@jarvis/kg";

function mockKGClient(searchResult: string = ""): KnowledgeGraphClient {
	return {
		searchForContext: vi.fn().mockResolvedValue(searchResult),
		search: vi.fn(),
		addEpisode: vi.fn(),
		getStats: vi.fn(),
		expireStale: vi.fn(),
		close: vi.fn(),
	} as unknown as KnowledgeGraphClient;
}

describe("KGContextInjector", () => {
	it("returns formatted context block for given keywords", async () => {
		const kg = mockKGClient("- Max Mueller [person]: SENT_EMAIL Invoice Q1 (2026-04-09)");
		const injector = new KGContextInjector(kg);

		const result = await injector.getContext(["email", "sender", "contact"], 7);

		expect(result).toContain("[Cross-domain context]");
		expect(result).toContain("Max Mueller");
		expect(kg.searchForContext).toHaveBeenCalledWith({
			keywords: ["email", "sender", "contact"],
			daysBack: 7,
			limit: 5,
		});
	});

	it("returns empty string for empty keywords", async () => {
		const kg = mockKGClient();
		const injector = new KGContextInjector(kg);

		const result = await injector.getContext([]);

		expect(result).toBe("");
		expect(kg.searchForContext).not.toHaveBeenCalled();
	});

	it("returns empty string when KG returns nothing", async () => {
		const kg = mockKGClient("");
		const injector = new KGContextInjector(kg);

		const result = await injector.getContext(["email"]);

		expect(result).toBe("");
	});

	it("returns empty string when KG client is null", async () => {
		const injector = new KGContextInjector(null);

		const result = await injector.getContext(["email"]);

		expect(result).toBe("");
	});

	it("gracefully handles KG errors", async () => {
		const kg = mockKGClient();
		(kg.searchForContext as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Neo4j down"));
		const injector = new KGContextInjector(kg);

		const result = await injector.getContext(["email"]);

		expect(result).toBe("");
	});

	it("uses default daysBack of 7 when not specified", async () => {
		const kg = mockKGClient("- fact");
		const injector = new KGContextInjector(kg);

		await injector.getContext(["email"]);

		expect(kg.searchForContext).toHaveBeenCalledWith(
			expect.objectContaining({ daysBack: 7 }),
		);
	});

	it("uses custom daysBack when specified", async () => {
		const kg = mockKGClient("- fact");
		const injector = new KGContextInjector(kg);

		await injector.getContext(["schedule"], 3);

		expect(kg.searchForContext).toHaveBeenCalledWith(
			expect.objectContaining({ daysBack: 3 }),
		);
	});
});
