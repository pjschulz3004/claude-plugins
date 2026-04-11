import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, unlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	SituationProvider,
	KGContextProvider,
	StaticRulesProvider,
	type ContextProvider,
	type HeartbeatTaskConfig,
} from "./context-providers.js";

// ─── SituationProvider ──────────────────────────────────────────────

describe("SituationProvider", () => {
	it("returns [Situation] block when backends have data", async () => {
		const now = new Date();
		const later = new Date(now.getTime() + 60 * 60 * 1000);

		const provider = new SituationProvider({
			email: {
				listUnread: vi.fn().mockResolvedValue([{}, {}, {}]),
				search: vi.fn().mockResolvedValue([{}]),
			},
			calendar: {
				listEvents: vi.fn().mockResolvedValue([
					{ summary: "Standup", start: now.toISOString(), end: later.toISOString(), allDay: false },
				]),
				listTodos: vi.fn().mockResolvedValue([]),
			},
		});

		const result = await provider.getContext({}, "email_triage");

		expect(result).toContain("[Situation]");
		expect(result).toContain("3 unread");
	});

	it("returns empty string when no backends available", async () => {
		const provider = new SituationProvider({});
		const result = await provider.getContext({}, "test");
		expect(result).toBe("");
	});

	it("has name 'situation'", () => {
		const provider = new SituationProvider({});
		expect(provider.name).toBe("situation");
	});
});

// ─── KGContextProvider ──────────────────────────────────────────────

describe("KGContextProvider", () => {
	it("returns [Cross-domain context] block when KG has data", async () => {
		const mockKG = {
			searchForContext: vi.fn().mockResolvedValue("- Email routing (Entity): route business emails"),
		};

		const provider = new KGContextProvider(mockKG as any);
		const result = await provider.getContext(
			{ kg_domains: ["email", "contact"], kg_days_back: 7 },
			"email_triage",
		);

		expect(result).toContain("[Cross-domain context]");
		expect(result).toContain("Email routing");
		expect(mockKG.searchForContext).toHaveBeenCalledWith({
			keywords: ["email", "contact"],
			daysBack: 7,
			limit: 5,
		});
	});

	it("returns empty when task has no kg_domains", async () => {
		const mockKG = { searchForContext: vi.fn() };
		const provider = new KGContextProvider(mockKG as any);

		const result = await provider.getContext({}, "email_cleanup");

		expect(result).toBe("");
		expect(mockKG.searchForContext).not.toHaveBeenCalled();
	});

	it("returns empty when KG client is null", async () => {
		const provider = new KGContextProvider(null);
		const result = await provider.getContext({ kg_domains: ["email"] }, "test");
		expect(result).toBe("");
	});

	it("returns empty on KG error", async () => {
		const mockKG = {
			searchForContext: vi.fn().mockRejectedValue(new Error("Neo4j down")),
		};
		const provider = new KGContextProvider(mockKG as any);

		const result = await provider.getContext({ kg_domains: ["email"] }, "test");
		expect(result).toBe("");
	});

	it("has name 'kg-context'", () => {
		const provider = new KGContextProvider(null);
		expect(provider.name).toBe("kg-context");
	});
});

// ─── StaticRulesProvider ────────────────────────────────────────────

describe("StaticRulesProvider", () => {
	let tmpDir: string;
	let rulesPath: string;

	beforeAll(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "jarvis-rules-"));
		rulesPath = join(tmpDir, "rules.yaml");
		writeFileSync(
			rulesPath,
			`email_triage:
  - "Emails to/from it@jschulz.org are business"
  - "noreply@trustpilot.com -> TRASH"
morning_briefing:
  - "Paul has ADHD. Lead with the most urgent item."
`,
		);
	});

	afterAll(() => {
		try {
			rmSync(tmpDir, { recursive: true });
		} catch {}
	});

	it("returns [Rules] block for matching task", async () => {
		const provider = new StaticRulesProvider(rulesPath);
		const result = await provider.getContext({}, "email_triage");

		expect(result).toContain("[Rules]");
		expect(result).toContain("it@jschulz.org");
		expect(result).toContain("TRASH");
	});

	it("returns empty for task with no rules", async () => {
		const provider = new StaticRulesProvider(rulesPath);
		const result = await provider.getContext({}, "email_cleanup");
		expect(result).toBe("");
	});

	it("returns rules for different tasks", async () => {
		const provider = new StaticRulesProvider(rulesPath);

		const emailRules = await provider.getContext({}, "email_triage");
		const briefingRules = await provider.getContext({}, "morning_briefing");

		expect(emailRules).toContain("it@jschulz.org");
		expect(emailRules).not.toContain("ADHD");

		expect(briefingRules).toContain("ADHD");
		expect(briefingRules).not.toContain("trustpilot");
	});

	it("hot-reloads on file change", async () => {
		const provider = new StaticRulesProvider(rulesPath);

		const before = await provider.getContext({}, "email_triage");
		expect(before).toContain("trustpilot");

		// Overwrite with new rules
		writeFileSync(
			rulesPath,
			`email_triage:
  - "New rule added"
`,
		);

		const after = await provider.getContext({}, "email_triage");
		expect(after).toContain("New rule added");
		expect(after).not.toContain("trustpilot");

		// Restore original
		writeFileSync(
			rulesPath,
			`email_triage:
  - "Emails to/from it@jschulz.org are business"
  - "noreply@trustpilot.com -> TRASH"
morning_briefing:
  - "Paul has ADHD. Lead with the most urgent item."
`,
		);
	});

	it("returns empty when file doesn't exist", async () => {
		const provider = new StaticRulesProvider("/nonexistent/rules.yaml");
		const result = await provider.getContext({}, "email_triage");
		expect(result).toBe("");
	});

	it("has name 'static-rules'", () => {
		const provider = new StaticRulesProvider(rulesPath);
		expect(provider.name).toBe("static-rules");
	});
});

// ─── Provider composition ───────────────────────────────────────────

describe("ContextProvider composition", () => {
	it("multiple providers produce independent blocks", async () => {
		const providers: ContextProvider[] = [
			new KGContextProvider({
				searchForContext: vi.fn().mockResolvedValue("- Paul [person]: lives in Berlin"),
			} as any),
			new SituationProvider({
				email: {
					listUnread: vi.fn().mockResolvedValue([{}]),
					search: vi.fn().mockResolvedValue([]),
				},
			}),
		];

		const blocks: string[] = [];
		for (const p of providers) {
			const block = await p.getContext({ kg_domains: ["person"] }, "test");
			if (block) blocks.push(block);
		}

		expect(blocks.length).toBe(2);
		expect(blocks[0]).toContain("[Cross-domain context]");
		expect(blocks[1]).toContain("[Situation]");
	});

	it("failed provider doesn't block others", async () => {
		const providers: ContextProvider[] = [
			new KGContextProvider({
				searchForContext: vi.fn().mockRejectedValue(new Error("boom")),
			} as any),
			new SituationProvider({
				email: {
					listUnread: vi.fn().mockResolvedValue([{}, {}]),
					search: vi.fn().mockResolvedValue([]),
				},
			}),
		];

		const blocks: string[] = [];
		for (const p of providers) {
			const block = await p.getContext({ kg_domains: ["email"] }, "test");
			if (block) blocks.push(block);
		}

		// KG failed, situation succeeded
		expect(blocks.length).toBe(1);
		expect(blocks[0]).toContain("[Situation]");
	});
});
