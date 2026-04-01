import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { PromptVersionStore } from "./prompt-versions.js";

describe("PromptVersionStore", () => {
	let db: Database.Database;
	let store: PromptVersionStore;

	beforeEach(() => {
		db = new Database(":memory:");
		db.pragma("journal_mode = WAL");
		store = new PromptVersionStore(db);
	});

	afterEach(() => {
		db.close();
	});

	it("creates prompt_versions and prompt_version_metrics tables on init", () => {
		const tables = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all() as Array<{ name: string }>;
		const names = tables.map((t) => t.name);
		expect(names).toContain("prompt_versions");
		expect(names).toContain("prompt_version_metrics");
	});

	it("registerVersion() inserts a new prompt version", () => {
		const id = store.registerVersion("email_triage", 1, "Triage prompt v1", "current");
		expect(id).toBeGreaterThan(0);

		const row = store.getCurrentVersion("email_triage");
		expect(row).toBeDefined();
		expect(row!.version).toBe(1);
		expect(row!.prompt_text).toBe("Triage prompt v1");
		expect(row!.status).toBe("current");
	});

	it("recordMetric() inserts a metric row", () => {
		const versionId = store.registerVersion("email_triage", 1, "prompt v1", "current");
		store.recordMetric("email_triage", 1, 42, true, 5000, 150);

		const metrics = store.getMetrics("email_triage", 1);
		expect(metrics.runs).toBe(1);
		expect(metrics.successRate).toBe(1);
		expect(metrics.avgDuration).toBe(5000);
		expect(metrics.avgTokens).toBe(150);
	});

	it("getMetrics() aggregates multiple runs correctly", () => {
		store.registerVersion("email_triage", 1, "prompt v1", "current");
		store.recordMetric("email_triage", 1, 1, true, 4000, 100);
		store.recordMetric("email_triage", 1, 2, true, 6000, 200);
		store.recordMetric("email_triage", 1, 3, false, 5000, 150);

		const metrics = store.getMetrics("email_triage", 1);
		expect(metrics.runs).toBe(3);
		expect(metrics.successRate).toBeCloseTo(2 / 3, 2);
		expect(metrics.avgDuration).toBe(5000);
		expect(metrics.avgTokens).toBe(150);
	});

	it("getMetrics() returns zeros for unknown version", () => {
		const metrics = store.getMetrics("nonexistent", 99);
		expect(metrics.runs).toBe(0);
		expect(metrics.successRate).toBe(0);
		expect(metrics.avgDuration).toBe(0);
		expect(metrics.avgTokens).toBe(0);
	});

	it("getCurrentVersion() returns the current version for a task", () => {
		store.registerVersion("email_triage", 1, "v1", "current");
		store.registerVersion("email_triage", 2, "v2", "candidate");

		const current = store.getCurrentVersion("email_triage");
		expect(current).toBeDefined();
		expect(current!.version).toBe(1);
	});

	it("getCandidateVersion() returns the candidate version for a task", () => {
		store.registerVersion("email_triage", 1, "v1", "current");
		store.registerVersion("email_triage", 2, "v2", "candidate");

		const candidate = store.getCandidateVersion("email_triage");
		expect(candidate).toBeDefined();
		expect(candidate!.version).toBe(2);
	});

	it("getCandidateVersion() returns undefined when no candidate", () => {
		store.registerVersion("email_triage", 1, "v1", "current");
		const candidate = store.getCandidateVersion("email_triage");
		expect(candidate).toBeUndefined();
	});

	it("updateStatus() changes version status", () => {
		store.registerVersion("email_triage", 1, "v1", "current");
		store.updateStatus("email_triage", 1, "retired");

		const current = store.getCurrentVersion("email_triage");
		expect(current).toBeUndefined();
	});
});
