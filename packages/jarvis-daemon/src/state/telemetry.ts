import type Database from "better-sqlite3";

export interface CorrectionEvent {
	id?: number;
	task_name: string;
	original_decision: string;
	corrected_decision: string;
	decided_at: string; // ISO 8601
	corrected_at: string; // ISO 8601
}

export class CorrectionStore {
	private readonly db: Database.Database;

	constructor(db: Database.Database) {
		this.db = db;
		throw new Error("not implemented");
	}

	recordCorrection(event: CorrectionEvent): number {
		throw new Error("not implemented");
	}

	getCorrections(taskName?: string, limit = 50): CorrectionEvent[] {
		throw new Error("not implemented");
	}

	rollingCorrectionRate(taskName: string, days: number): number {
		throw new Error("not implemented");
	}
}
