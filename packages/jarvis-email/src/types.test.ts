import { describe, expect, it } from "vitest";
import type {
	EmailFolder,
	EmailSearchQuery,
	EmailSummary,
	IMAPConfig,
} from "./types.js";

describe("IMAPConfig", () => {
	it("has host, port, auth.user, auth.pass, and secure boolean", () => {
		const config: IMAPConfig = {
			host: "imap.mailbox.org",
			port: 993,
			secure: true,
			auth: { user: "test@mailbox.org", pass: "secret" },
		};
		expect(config.host).toBe("imap.mailbox.org");
		expect(config.port).toBe(993);
		expect(config.secure).toBe(true);
		expect(config.auth.user).toBe("test@mailbox.org");
		expect(config.auth.pass).toBe("secret");
	});
});

describe("EmailSummary", () => {
	it("has uid, from (name + address), subject, date, flags, folder", () => {
		const summary: EmailSummary = {
			uid: "123",
			from: { name: "Alice", address: "alice@example.com" },
			subject: "Hello",
			date: "2026-03-31T10:00:00Z",
			flags: ["\\Seen", "\\Flagged"],
			folder: "INBOX",
		};
		expect(summary.uid).toBe("123");
		expect(summary.from.name).toBe("Alice");
		expect(summary.from.address).toBe("alice@example.com");
		expect(summary.subject).toBe("Hello");
		expect(summary.date).toBe("2026-03-31T10:00:00Z");
		expect(summary.flags).toEqual(["\\Seen", "\\Flagged"]);
		expect(summary.folder).toBe("INBOX");
	});
});

describe("EmailSearchQuery", () => {
	it("has all optional fields: from, subject, since, before, folder, flagged, seen", () => {
		const query: EmailSearchQuery = {
			from: "boss@example.com",
			subject: "urgent",
			since: "2026-03-01",
			before: "2026-03-31",
			folder: "INBOX",
			flagged: true,
			seen: false,
		};
		expect(query.from).toBe("boss@example.com");
		expect(query.subject).toBe("urgent");
		expect(query.since).toBe("2026-03-01");
		expect(query.before).toBe("2026-03-31");
		expect(query.folder).toBe("INBOX");
		expect(query.flagged).toBe(true);
		expect(query.seen).toBe(false);
	});

	it("allows empty query", () => {
		const query: EmailSearchQuery = {};
		expect(query.from).toBeUndefined();
	});
});

describe("EmailFolder", () => {
	it("has path, name, optional specialUse, totalMessages, unseenMessages", () => {
		const folder: EmailFolder = {
			path: "INBOX",
			name: "Inbox",
			specialUse: "\\Inbox",
			totalMessages: 100,
			unseenMessages: 5,
		};
		expect(folder.path).toBe("INBOX");
		expect(folder.name).toBe("Inbox");
		expect(folder.specialUse).toBe("\\Inbox");
		expect(folder.totalMessages).toBe(100);
		expect(folder.unseenMessages).toBe(5);
	});

	it("allows specialUse to be undefined", () => {
		const folder: EmailFolder = {
			path: "Custom",
			name: "Custom",
			totalMessages: 10,
			unseenMessages: 0,
		};
		expect(folder.specialUse).toBeUndefined();
	});
});
