import type Database from "better-sqlite3";

export interface CorrectionEvent {
	id?: number;
	task_name: string;
	original_decision: string;
	corrected_decision: string;
	decided_at: string; // ISO 8601
	corrected_at: string; // ISO 8601
}

const CREATE_CORRECTIONS_TABLE_SQL = `
	CREATE TABLE IF NOT EXISTS correction_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_name TEXT NOT NULL,
		original_decision TEXT NOT NULL,
		corrected_decision TEXT NOT NULL,
		decided_at TEXT NOT NULL,
		corrected_at TEXT NOT NULL
	)
`;

const CREATE_CORRECTIONS_INDEX_SQL = `
	CREATE INDEX IF NOT EXISTS idx_corrections_task_corrected
		ON correction_events(task_name, corrected_at DESC)
`;

export class CorrectionStore {
	private readonly db: Database.Database;

	constructor(db: Database.Database) {
		this.db = db;
		this.db.exec(CREATE_CORRECTIONS_TABLE_SQL);
		this.db.exec(CREATE_CORRECTIONS_INDEX_SQL);
	}

	recordCorrection(event: CorrectionEvent): number {
		const stmt = this.db.prepare(`
			INSERT INTO correction_events (task_name, original_decision, corrected_decision, decided_at, corrected_at)
			VALUES (?, ?, ?, ?, ?)
		`);
		const result = stmt.run(
			event.task_name,
			event.original_decision,
			event.corrected_decision,
			event.decided_at,
			event.corrected_at,
		);
		return Number(result.lastInsertRowid);
	}

	getCorrections(taskName?: string, limit = 50): CorrectionEvent[] {
		if (taskName) {
			const stmt = this.db.prepare(`
				SELECT id, task_name, original_decision, corrected_decision, decided_at, corrected_at
				FROM correction_events
				WHERE task_name = ?
				ORDER BY corrected_at DESC
				LIMIT ?
			`);
			return stmt.all(taskName, limit) as CorrectionEvent[];
		}
		const stmt = this.db.prepare(`
			SELECT id, task_name, original_decision, corrected_decision, decided_at, corrected_at
			FROM correction_events
			ORDER BY corrected_at DESC
			LIMIT ?
		`);
		return stmt.all(limit) as CorrectionEvent[];
	}

	rollingCorrectionRate(taskName: string, days: number): number {
		const cutoff = new Date(
			Date.now() - days * 24 * 60 * 60 * 1000,
		).toISOString();

		const decisionCount = this.db
			.prepare(
				`SELECT COUNT(*) as cnt FROM task_runs
				 WHERE task_name = ? AND started_at > ? AND decision_summary IS NOT NULL`,
			)
			.get(taskName, cutoff) as { cnt: number };

		if (decisionCount.cnt === 0) return 0;

		const correctionCount = this.db
			.prepare(
				`SELECT COUNT(*) as cnt FROM correction_events
				 WHERE task_name = ? AND corrected_at > ?`,
			)
			.get(taskName, cutoff) as { cnt: number };

		return correctionCount.cnt / decisionCount.cnt;
	}
}
