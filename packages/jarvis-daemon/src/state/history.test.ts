import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ChatHistory } from "./history.js";

describe("ChatHistory", () => {
	let db: Database.Database;
	let history: ChatHistory;

	beforeEach(() => {
		db = new Database(":memory:");
		history = new ChatHistory(db);
	});

	afterEach(() => {
		db.close();
	});

	it("record() stores a message and getRecent() retrieves it", () => {
		history.record("123", "user", "hello");
		const msgs = history.getRecent("123");
		expect(msgs).toHaveLength(1);
		expect(msgs[0].role).toBe("user");
		expect(msgs[0].text).toBe("hello");
		expect(msgs[0].timestamp).toBeTruthy();
	});

	it("getRecent() returns messages in chronological order", () => {
		history.record("123", "user", "first");
		history.record("123", "assistant", "second");
		history.record("123", "user", "third");
		const msgs = history.getRecent("123");
		expect(msgs.map((m) => m.text)).toEqual(["first", "second", "third"]);
	});

	it("getRecent() limits to N messages", () => {
		for (let i = 0; i < 15; i++) {
			history.record("123", "user", `msg-${i}`);
		}
		const msgs = history.getRecent("123", 5);
		expect(msgs).toHaveLength(5);
		expect(msgs[0].text).toBe("msg-10");
		expect(msgs[4].text).toBe("msg-14");
	});

	it("getRecent() returns empty array for unknown chat", () => {
		const msgs = history.getRecent("unknown");
		expect(msgs).toEqual([]);
	});

	it("getRecent() isolates by chat_id", () => {
		history.record("a", "user", "alpha");
		history.record("b", "user", "beta");
		const msgsA = history.getRecent("a");
		expect(msgsA).toHaveLength(1);
		expect(msgsA[0].text).toBe("alpha");
	});

	it("prune() keeps only latest N per chat", () => {
		for (let i = 0; i < 10; i++) {
			history.record("123", "user", `msg-${i}`);
		}
		const pruned = history.prune(5);
		expect(pruned).toBe(5);
		const msgs = history.getRecent("123", 20);
		expect(msgs).toHaveLength(5);
		expect(msgs[0].text).toBe("msg-5");
	});

	it("prune() handles multiple chat_ids independently", () => {
		for (let i = 0; i < 6; i++) {
			history.record("a", "user", `a-${i}`);
			history.record("b", "user", `b-${i}`);
		}
		const pruned = history.prune(3);
		expect(pruned).toBe(6);
		expect(history.getRecent("a", 20)).toHaveLength(3);
		expect(history.getRecent("b", 20)).toHaveLength(3);
	});

	it("prune() returns 0 when nothing to prune", () => {
		history.record("123", "user", "hello");
		const pruned = history.prune(100);
		expect(pruned).toBe(0);
	});
});
