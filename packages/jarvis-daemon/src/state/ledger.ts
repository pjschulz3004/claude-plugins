import Database from "better-sqlite3";
import type { LedgerEntry } from "@jarvis/shared";

const CREATE_TABLE_SQL = `
	CREATE TABLE IF NOT EXISTS task_runs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_name TEXT NOT NULL,
		status TEXT NOT NULL CHECK(status IN ('success', 'failure', 'skipped')),
		started_at TEXT NOT NULL,
		duration_ms INTEGER NOT NULL,
		error TEXT,
		cost_usd REAL,
		input_tokens INTEGER,
		output_tokens INTEGER
	)
`;

const CREATE_INDEX_SQL = `
	CREATE INDEX IF NOT EXISTS idx_task_runs_name_started
		ON task_runs(task_name, started_at DESC)
`;

export class TaskLedger {
	private readonly db: Database.Database;

	constructor(dbPath: string = "jarvis.db") {
		this.db = new Database(dbPath);
		this.db.pragma("journal_mode = WAL");
		this.db.exec(CREATE_TABLE_SQL);
		this.db.exec(CREATE_INDEX_SQL);
	}

	/** Expose the underlying SQLite database for sharing with ChatHistory. */
	get database(): Database.Database {
		return this.db;
	}

	record(entry: LedgerEntry): number {
		const stmt = this.db.prepare(`
			INSERT INTO task_runs (task_name, status, started_at, duration_ms, error, cost_usd, input_tokens, output_tokens)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);
		const result = stmt.run(
			entry.task_name,
			entry.status,
			entry.started_at,
			entry.duration_ms,
			entry.error ?? null,
			entry.cost_usd ?? null,
			entry.input_tokens ?? null,
			entry.output_tokens ?? null,
		);
		return Number(result.lastInsertRowid);
	}

	getRecent(taskName: string, limit = 10): LedgerEntry[] {
		const stmt = this.db.prepare(`
			SELECT id, task_name, status, started_at, duration_ms, error, cost_usd, input_tokens, output_tokens
			FROM task_runs
			WHERE task_name = ?
			ORDER BY started_at DESC
			LIMIT ?
		`);
		return stmt.all(taskName, limit) as LedgerEntry[];
	}

	getConsecutiveFailures(taskName: string): number {
		const rows = this.db.prepare(`
			SELECT status FROM task_runs
			WHERE task_name = ?
			ORDER BY started_at DESC
		`).all(taskName) as Array<{ status: string }>;

		let count = 0;
		for (const row of rows) {
			if (row.status === "failure") {
				count++;
			} else {
				break;
			}
		}
		return count;
	}

	getRecentAll(limit = 10): LedgerEntry[] {
		const stmt = this.db.prepare(`
			SELECT id, task_name, status, started_at, duration_ms, error, cost_usd, input_tokens, output_tokens
			FROM task_runs
			ORDER BY started_at DESC
			LIMIT ?
		`);
		return stmt.all(limit) as LedgerEntry[];
	}

	prune(olderThanDays = 30): number {
		const cutoff = new Date(
			Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
		).toISOString();
		const result = this.db.prepare(`
			DELETE FROM task_runs WHERE started_at < ?
		`).run(cutoff);
		return result.changes;
	}

	close(): void {
		this.db.close();
	}
}
