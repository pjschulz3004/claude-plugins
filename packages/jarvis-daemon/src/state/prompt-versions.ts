import type Database from "better-sqlite3";
import { createLogger } from "../logger.js";

const log = createLogger("prompt-versions");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptVersion {
	id: number;
	task_name: string;
	version: number;
	prompt_text: string;
	status: "current" | "candidate" | "retired";
	created_at: string;
}

export interface VersionMetrics {
	runs: number;
	successRate: number;
	avgDuration: number;
	avgTokens: number;
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const CREATE_VERSIONS_TABLE = `
	CREATE TABLE IF NOT EXISTS prompt_versions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_name TEXT NOT NULL,
		version INTEGER NOT NULL,
		prompt_text TEXT NOT NULL,
		status TEXT NOT NULL CHECK(status IN ('current', 'candidate', 'retired')),
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	)
`;

const CREATE_METRICS_TABLE = `
	CREATE TABLE IF NOT EXISTS prompt_version_metrics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		prompt_version_id INTEGER NOT NULL,
		run_id INTEGER NOT NULL,
		success INTEGER NOT NULL,
		duration_ms INTEGER NOT NULL,
		tokens INTEGER NOT NULL,
		FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id)
	)
`;

const CREATE_INDEX = `
	CREATE INDEX IF NOT EXISTS idx_prompt_versions_task_status
		ON prompt_versions(task_name, status)
`;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class PromptVersionStore {
	private readonly db: Database.Database;

	constructor(db: Database.Database) {
		this.db = db;
		this.db.exec(CREATE_VERSIONS_TABLE);
		this.db.exec(CREATE_METRICS_TABLE);
		this.db.exec(CREATE_INDEX);
	}

	registerVersion(
		taskName: string,
		version: number,
		promptText: string,
		status: "current" | "candidate" | "retired",
	): number {
		const result = this.db
			.prepare(
				"INSERT INTO prompt_versions (task_name, version, prompt_text, status) VALUES (?, ?, ?, ?)",
			)
			.run(taskName, version, promptText, status);
		log.debug("version_registered", { task: taskName, version, role: status });
		return Number(result.lastInsertRowid);
	}

	recordMetric(
		taskName: string,
		version: number,
		runId: number,
		success: boolean,
		durationMs: number,
		tokens: number,
	): void {
		const versionRow = this.db
			.prepare(
				"SELECT id FROM prompt_versions WHERE task_name = ? AND version = ?",
			)
			.get(taskName, version) as { id: number } | undefined;

		if (!versionRow) return;

		this.db
			.prepare(
				"INSERT INTO prompt_version_metrics (prompt_version_id, run_id, success, duration_ms, tokens) VALUES (?, ?, ?, ?, ?)",
			)
			.run(versionRow.id, runId, success ? 1 : 0, durationMs, tokens);
		log.debug("metric_recorded", { task: taskName, version, success, duration_ms: durationMs });
	}

	getMetrics(taskName: string, version: number): VersionMetrics {
		const versionRow = this.db
			.prepare(
				"SELECT id FROM prompt_versions WHERE task_name = ? AND version = ?",
			)
			.get(taskName, version) as { id: number } | undefined;

		if (!versionRow) {
			return { runs: 0, successRate: 0, avgDuration: 0, avgTokens: 0 };
		}

		const row = this.db
			.prepare(
				`SELECT
					COUNT(*) as runs,
					AVG(success) as successRate,
					AVG(duration_ms) as avgDuration,
					AVG(tokens) as avgTokens
				FROM prompt_version_metrics
				WHERE prompt_version_id = ?`,
			)
			.get(versionRow.id) as {
			runs: number;
			successRate: number | null;
			avgDuration: number | null;
			avgTokens: number | null;
		};

		if (!row || row.runs === 0) {
			return { runs: 0, successRate: 0, avgDuration: 0, avgTokens: 0 };
		}

		return {
			runs: row.runs,
			successRate: row.successRate ?? 0,
			avgDuration: row.avgDuration ?? 0,
			avgTokens: row.avgTokens ?? 0,
		};
	}

	getCurrentVersion(taskName: string): PromptVersion | undefined {
		return this.db
			.prepare(
				"SELECT * FROM prompt_versions WHERE task_name = ? AND status = 'current'",
			)
			.get(taskName) as PromptVersion | undefined;
	}

	getCandidateVersion(taskName: string): PromptVersion | undefined {
		return this.db
			.prepare(
				"SELECT * FROM prompt_versions WHERE task_name = ? AND status = 'candidate'",
			)
			.get(taskName) as PromptVersion | undefined;
	}

	updateStatus(
		taskName: string,
		version: number,
		status: "current" | "candidate" | "retired",
	): void {
		this.db
			.prepare(
				"UPDATE prompt_versions SET status = ? WHERE task_name = ? AND version = ?",
			)
			.run(status, taskName, version);
	}

	/** Count total metric runs for a specific version of a task. */
	getTotalRunCount(taskName: string, version: number): number {
		const versionRow = this.db
			.prepare(
				"SELECT id FROM prompt_versions WHERE task_name = ? AND version = ?",
			)
			.get(taskName, version) as { id: number } | undefined;

		if (!versionRow) return 0;

		const row = this.db
			.prepare(
				"SELECT COUNT(*) as count FROM prompt_version_metrics WHERE prompt_version_id = ?",
			)
			.get(versionRow.id) as { count: number };

		return row.count;
	}
}
