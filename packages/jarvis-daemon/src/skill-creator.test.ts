import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
	SkillCreator,
	type GapDetectionResult,
} from "./skill-creator.js";

describe("SkillCreator", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(":memory:");
		db.pragma("journal_mode = WAL");
		db.exec(`
			CREATE TABLE IF NOT EXISTS task_runs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				task_name TEXT NOT NULL,
				status TEXT NOT NULL CHECK(status IN ('success', 'failure', 'skipped')),
				started_at TEXT NOT NULL,
				duration_ms INTEGER NOT NULL,
				error TEXT,
				cost_usd REAL,
				input_tokens INTEGER,
				output_tokens INTEGER,
				decision_summary TEXT
			)
		`);
	});

	afterEach(() => {
		db.close();
	});

	describe("detectGaps()", () => {
		it("finds repeated failure patterns containing 'no tool'", () => {
			const now = new Date();
			for (let i = 0; i < 4; i++) {
				const date = new Date(now.getTime() - i * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("email_triage", "failure", date.toISOString(), 1000, "no tool available for invoice parsing");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBeGreaterThanOrEqual(1);
			expect(gaps[0].occurrences).toBeGreaterThanOrEqual(3);
			expect(gaps[0].pattern).toBeTruthy();
			expect(gaps[0].examples.length).toBeGreaterThan(0);
		});

		it("finds patterns containing 'not available'", () => {
			for (let i = 0; i < 3; i++) {
				const date = new Date(Date.now() - i * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("budget_review", "failure", date.toISOString(), 500, "calendar tool not available");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBe(1);
			expect(gaps[0].pattern).toContain("not available");
		});

		it("finds patterns containing 'cannot' and 'unsupported'", () => {
			for (let i = 0; i < 3; i++) {
				const date = new Date(Date.now() - i * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("filing", "failure", date.toISOString(), 500, "cannot find tool for PDF extraction");
			}
			for (let i = 0; i < 3; i++) {
				const date = new Date(Date.now() - i * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("filing", "failure", date.toISOString(), 500, "unsupported operation: merge PDFs");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBe(2);
		});

		it("ignores failures below minOccurrences threshold", () => {
			for (let i = 0; i < 2; i++) {
				const date = new Date(Date.now() - i * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("email_triage", "failure", date.toISOString(), 1000, "no tool for weather lookup");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBe(0);
		});

		it("ignores failures older than 30 days", () => {
			for (let i = 0; i < 5; i++) {
				const date = new Date(Date.now() - (35 + i) * 86400000);
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("email_triage", "failure", date.toISOString(), 1000, "no tool for weather lookup");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBe(0);
		});

		it("returns empty array when no failures exist", () => {
			db.prepare(
				"INSERT INTO task_runs (task_name, status, started_at, duration_ms) VALUES (?, ?, ?, ?)",
			).run("email_triage", "success", new Date().toISOString(), 1000);

			const gaps = SkillCreator.detectGaps(db);

			expect(gaps).toEqual([]);
		});

		it("includes firstSeen and lastSeen timestamps", () => {
			const dates = [
				new Date(Date.now() - 10 * 86400000),
				new Date(Date.now() - 5 * 86400000),
				new Date(Date.now() - 1 * 86400000),
			];
			for (const date of dates) {
				db.prepare(
					"INSERT INTO task_runs (task_name, status, started_at, duration_ms, error) VALUES (?, ?, ?, ?, ?)",
				).run("triage", "failure", date.toISOString(), 500, "no tool for sentiment analysis");
			}

			const gaps = SkillCreator.detectGaps(db, 3);

			expect(gaps.length).toBe(1);
			expect(gaps[0].firstSeen).toBeTruthy();
			expect(gaps[0].lastSeen).toBeTruthy();
			expect(new Date(gaps[0].firstSeen).getTime()).toBeLessThan(new Date(gaps[0].lastSeen).getTime());
		});
	});

	describe("getSkillTemplate()", () => {
		it("returns a string containing all required SKILL.md sections", () => {
			const template = SkillCreator.getSkillTemplate();

			expect(template).toContain("## Trigger");
			expect(template).toContain("## Procedure");
			expect(template).toContain("## Tools");
			expect(template).toContain("## Rules");
			expect(template).toContain("## Output");
		});

		it("contains YAML frontmatter with name and description placeholders", () => {
			const template = SkillCreator.getSkillTemplate();

			expect(template).toContain("---");
			expect(template).toContain("name:");
			expect(template).toContain("description:");
		});
	});

	describe("getToolScaffold()", () => {
		it("returns TypeScript template with Zod schema", () => {
			const scaffold = SkillCreator.getToolScaffold("invoice-parser");

			expect(scaffold).toContain('import { z } from "zod"');
			expect(scaffold).toContain("z.object");
			expect(scaffold).toContain("invoice-parser");
		});

		it("includes test stub reference", () => {
			const scaffold = SkillCreator.getToolScaffold("weather-lookup");

			expect(scaffold).toContain("test");
		});

		it("includes handler function export", () => {
			const scaffold = SkillCreator.getToolScaffold("my-tool");

			expect(scaffold).toContain("export");
			expect(scaffold).toContain("function");
		});
	});

	describe("formatGapsForPrompt()", () => {
		it("formats gaps into readable prompt text", () => {
			const gaps: GapDetectionResult[] = [
				{
					pattern: "no tool for invoice parsing",
					occurrences: 5,
					examples: ["no tool for invoice parsing in email", "no tool for invoice parsing from PDF"],
					firstSeen: "2026-03-01T00:00:00Z",
					lastSeen: "2026-03-28T00:00:00Z",
				},
			];

			const formatted = SkillCreator.formatGapsForPrompt(gaps);

			expect(formatted).toContain("invoice parsing");
			expect(formatted).toContain("5");
			expect(formatted).toBeTruthy();
		});

		it("returns empty-state message for no gaps", () => {
			const formatted = SkillCreator.formatGapsForPrompt([]);

			expect(formatted).toBeTruthy();
			expect(formatted.length).toBeGreaterThan(0);
		});

		it("handles multiple gaps", () => {
			const gaps: GapDetectionResult[] = [
				{
					pattern: "no tool for parsing",
					occurrences: 5,
					examples: ["example 1"],
					firstSeen: "2026-03-01T00:00:00Z",
					lastSeen: "2026-03-28T00:00:00Z",
				},
				{
					pattern: "calendar not available",
					occurrences: 3,
					examples: ["example 2"],
					firstSeen: "2026-03-10T00:00:00Z",
					lastSeen: "2026-03-29T00:00:00Z",
				},
			];

			const formatted = SkillCreator.formatGapsForPrompt(gaps);

			expect(formatted).toContain("parsing");
			expect(formatted).toContain("calendar");
		});
	});
});
