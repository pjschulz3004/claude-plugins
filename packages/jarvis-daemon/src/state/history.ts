import type Database from "better-sqlite3";

export interface ChatMessage {
	role: "user" | "assistant";
	text: string;
	timestamp: string;
}

export class ChatHistory {
	private readonly db: Database.Database;

	constructor(db: Database.Database) {
		this.db = db;
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS chat_messages (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				chat_id TEXT NOT NULL,
				role TEXT NOT NULL CHECK(role IN ('user','assistant')),
				text TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
				ON chat_messages(chat_id, created_at DESC)
		`);
	}

	record(chatId: string, role: "user" | "assistant", text: string): void {
		this.db.prepare(`
			INSERT INTO chat_messages (chat_id, role, text)
			VALUES (?, ?, ?)
		`).run(chatId, role, text);
	}

	getRecent(chatId: string, limit = 10): ChatMessage[] {
		const rows = this.db.prepare(`
			SELECT role, text, created_at as timestamp
			FROM chat_messages
			WHERE chat_id = ?
			ORDER BY created_at DESC, id DESC
			LIMIT ?
		`).all(chatId, limit) as ChatMessage[];
		return rows.reverse();
	}

	prune(keepPerChat = 100): number {
		const result = this.db.prepare(`
			DELETE FROM chat_messages
			WHERE id NOT IN (
				SELECT id FROM (
					SELECT id, ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at DESC, id DESC) as rn
					FROM chat_messages
				) WHERE rn <= ?
			)
		`).run(keepPerChat);
		return result.changes;
	}
}
