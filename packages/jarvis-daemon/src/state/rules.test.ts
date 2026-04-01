import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RuleStore } from "./rules.js";
import type { Rule, RuleFile } from "./rules.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("RuleStore", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "rules-test-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	const sampleRuleFile: RuleFile = {
		domain: "email",
		version: 1,
		description: "Test email rules",
		categories: ["action_required", "notification", "noise"],
		rules: [
			{
				id: "email-001",
				text: "noreply@cloudflare.com -> notification",
				confidence: 1.0,
				source: "seeded",
				added: "2026-04-01",
				evaluations: 0,
				accuracy: 1.0,
			},
			{
				id: "email-002",
				text: "noreply@dhl.de -> notification",
				confidence: 0.6,
				source: "user_correction",
				added: "2026-04-01",
				evaluations: 10,
				accuracy: 0.6,
			},
		],
	};

	describe("load()", () => {
		it("reads a YAML file and returns a RuleFile object", () => {
			const filePath = join(dir, "rules.yaml");
			writeFileSync(
				filePath,
				`domain: email
version: 1
description: Test email rules
categories:
  - action_required
  - notification
  - noise
rules:
  - id: email-001
    text: "noreply@cloudflare.com -> notification"
    confidence: 1.0
    source: seeded
    added: "2026-04-01"
    evaluations: 0
    accuracy: 1.0
`,
			);

			const result = RuleStore.load(filePath);
			expect(result.domain).toBe("email");
			expect(result.version).toBe(1);
			expect(result.rules).toHaveLength(1);
			expect(result.rules[0].id).toBe("email-001");
			expect(result.rules[0].confidence).toBe(1.0);
			expect(result.rules[0].source).toBe("seeded");
		});

		it("handles empty rules array gracefully", () => {
			const filePath = join(dir, "empty.yaml");
			writeFileSync(
				filePath,
				`domain: budget
version: 1
description: Empty rules
rules: []
`,
			);

			const result = RuleStore.load(filePath);
			expect(result.domain).toBe("budget");
			expect(result.rules).toEqual([]);
		});

		it("handles missing rules key as empty array", () => {
			const filePath = join(dir, "norules.yaml");
			writeFileSync(
				filePath,
				`domain: budget
version: 1
description: No rules key
`,
			);

			const result = RuleStore.load(filePath);
			expect(result.rules).toEqual([]);
		});
	});

	describe("save()", () => {
		it("writes a RuleFile back to YAML", () => {
			const filePath = join(dir, "output.yaml");
			RuleStore.save(filePath, sampleRuleFile);

			const content = readFileSync(filePath, "utf8");
			expect(content).toContain("domain: email");
			expect(content).toContain("email-001");
			expect(content).toContain("confidence:");
		});
	});

	describe("round-trip fidelity", () => {
		it("load -> save -> load produces identical RuleFile", () => {
			const filePath = join(dir, "roundtrip.yaml");
			RuleStore.save(filePath, sampleRuleFile);

			const loaded = RuleStore.load(filePath);
			const filePath2 = join(dir, "roundtrip2.yaml");
			RuleStore.save(filePath2, loaded);

			const loaded2 = RuleStore.load(filePath2);
			expect(loaded2).toEqual(loaded);
		});
	});

	describe("addRule()", () => {
		it("appends a rule with auto-generated id (domain-NNN)", () => {
			const rf: RuleFile = structuredClone(sampleRuleFile);
			const newRule = RuleStore.addRule(rf, {
				text: "new rule text",
				confidence: 0.9,
				source: "self_generated",
				added: "2026-04-01",
				evaluations: 0,
				accuracy: 1.0,
			});

			expect(newRule.id).toBe("email-003");
			expect(rf.rules).toHaveLength(3);
			expect(rf.rules[2]).toEqual(newRule);
		});

		it("generates id email-001 for empty rules array", () => {
			const rf: RuleFile = {
				domain: "email",
				version: 1,
				description: "empty",
				rules: [],
			};
			const newRule = RuleStore.addRule(rf, {
				text: "first rule",
				confidence: 1.0,
				source: "seeded",
				added: "2026-04-01",
				evaluations: 0,
				accuracy: 1.0,
			});

			expect(newRule.id).toBe("email-001");
		});
	});

	describe("updateConfidence()", () => {
		it("updates a rule's confidence by id", () => {
			const rf: RuleFile = structuredClone(sampleRuleFile);
			RuleStore.updateConfidence(rf, "email-002", 0.95);
			expect(rf.rules[1].confidence).toBe(0.95);
		});

		it("throws if rule id not found", () => {
			const rf: RuleFile = structuredClone(sampleRuleFile);
			expect(() => RuleStore.updateConfidence(rf, "email-999", 0.5)).toThrow(
				"Rule email-999 not found",
			);
		});
	});

	describe("flaggedForReview()", () => {
		it("returns rules with confidence < 0.8", () => {
			const flagged = RuleStore.flaggedForReview(sampleRuleFile);
			expect(flagged).toHaveLength(1);
			expect(flagged[0].id).toBe("email-002");
			expect(flagged[0].confidence).toBe(0.6);
		});

		it("returns empty array when all rules are confident", () => {
			const rf: RuleFile = {
				domain: "email",
				version: 1,
				description: "all confident",
				rules: [
					{
						id: "email-001",
						text: "high confidence",
						confidence: 0.95,
						source: "seeded",
						added: "2026-04-01",
						evaluations: 5,
						accuracy: 0.95,
					},
				],
			};
			expect(RuleStore.flaggedForReview(rf)).toEqual([]);
		});
	});

	describe("findByText()", () => {
		it("finds rules matching partial text (case-insensitive)", () => {
			const results = RuleStore.findByText(sampleRuleFile, "cloudflare");
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("email-001");
		});

		it("returns empty when no match", () => {
			expect(RuleStore.findByText(sampleRuleFile, "nonexistent")).toEqual([]);
		});

		it("is case-insensitive", () => {
			const results = RuleStore.findByText(sampleRuleFile, "CLOUDFLARE");
			expect(results).toHaveLength(1);
		});
	});
});
