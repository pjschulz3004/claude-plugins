#!/usr/bin/env node

import { requireCredentials } from "@jarvis/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ImapFlowBackend } from "./backend.js";
import type { IMAPConfig } from "./types.js";

const creds = requireCredentials("MAILBOX", ["email", "password", "imap_host"]);

const config: IMAPConfig = {
	host: creds.imap_host,
	port: 993,
	secure: true,
	auth: { user: creds.email, pass: creds.password },
};

const backend = new ImapFlowBackend(config);
const server = new McpServer({ name: "jarvis-email", version: "0.1.0" });

function textResult(text: string) {
	return { content: [{ type: "text" as const, text }] };
}

// Tool: list_unread
server.tool(
	"list_unread",
	"List unread emails from INBOX",
	{
		limit: z.number().optional().describe("Max emails to return (default 20)"),
	},
	async ({ limit }) => {
		try {
			const emails = await backend.listUnread(limit);
			return textResult(JSON.stringify(emails, null, 2));
		} catch (err) {
			return textResult(`Error listing unread: ${(err as Error).message}`);
		}
	},
);

// Tool: search
server.tool(
	"search",
	"Search emails by criteria",
	{
		from: z.string().optional().describe("Filter by sender"),
		subject: z.string().optional().describe("Filter by subject"),
		since: z.string().optional().describe("Emails after this date (ISO)"),
		before: z.string().optional().describe("Emails before this date (ISO)"),
		folder: z.string().optional().describe("IMAP folder (default INBOX)"),
		flagged: z.boolean().optional().describe("Filter by flagged status"),
		seen: z.boolean().optional().describe("Filter by read status"),
	},
	async (query) => {
		try {
			const emails = await backend.search(query);
			return textResult(JSON.stringify(emails, null, 2));
		} catch (err) {
			return textResult(`Error searching: ${(err as Error).message}`);
		}
	},
);

// Tool: move
server.tool(
	"move",
	"Move an email to a different folder",
	{
		uid: z.string().describe("Email UID"),
		folder: z.string().describe("Target folder path"),
	},
	async ({ uid, folder }) => {
		try {
			await backend.moveEmail(uid, folder);
			return textResult(`Moved email ${uid} to ${folder}`);
		} catch (err) {
			return textResult(`Error moving email: ${(err as Error).message}`);
		}
	},
);

// Tool: flag
server.tool(
	"flag",
	"Flag an email (star it)",
	{ uid: z.string().describe("Email UID") },
	async ({ uid }) => {
		try {
			await backend.flagEmail(uid, "\\Flagged");
			return textResult(`Flagged email ${uid}`);
		} catch (err) {
			return textResult(`Error flagging email: ${(err as Error).message}`);
		}
	},
);

// Tool: unflag
server.tool(
	"unflag",
	"Remove flag from an email",
	{ uid: z.string().describe("Email UID") },
	async ({ uid }) => {
		try {
			await backend.unflagEmail(uid, "\\Flagged");
			return textResult(`Unflagged email ${uid}`);
		} catch (err) {
			return textResult(`Error unflagging email: ${(err as Error).message}`);
		}
	},
);

// Tool: trash
server.tool(
	"trash",
	"Move an email to Trash",
	{ uid: z.string().describe("Email UID") },
	async ({ uid }) => {
		try {
			await backend.trashEmail(uid);
			return textResult(`Trashed email ${uid}`);
		} catch (err) {
			return textResult(`Error trashing email: ${(err as Error).message}`);
		}
	},
);

// Tool: archive
server.tool(
	"archive",
	"Move an email to Archive",
	{ uid: z.string().describe("Email UID") },
	async ({ uid }) => {
		try {
			await backend.archiveEmail(uid);
			return textResult(`Archived email ${uid}`);
		} catch (err) {
			return textResult(`Error archiving email: ${(err as Error).message}`);
		}
	},
);

// Tool: list_folders
server.tool(
	"list_folders",
	"List all IMAP folders with message counts",
	{},
	async () => {
		try {
			const folders = await backend.listFolders();
			return textResult(JSON.stringify(folders, null, 2));
		} catch (err) {
			return textResult(`Error listing folders: ${(err as Error).message}`);
		}
	},
);

// Tool: set_keyword
server.tool(
	"set_keyword",
	"Set a custom IMAP keyword on an email (e.g. $AutoDelete3d)",
	{
		uid: z.string().describe("Email UID"),
		keyword: z.string().describe("Custom IMAP keyword"),
	},
	async ({ uid, keyword }) => {
		try {
			await backend.setKeyword(uid, keyword);
			return textResult(`Set keyword '${keyword}' on email ${uid}`);
		} catch (err) {
			return textResult(`Error setting keyword: ${(err as Error).message}`);
		}
	},
);

// Tool: mark_read
server.tool(
	"mark_read",
	"Mark an email as read",
	{ uid: z.string().describe("Email UID") },
	async ({ uid }) => {
		try {
			await backend.markRead(uid);
			return textResult(`Marked email ${uid} as read`);
		} catch (err) {
			return textResult(`Error marking read: ${(err as Error).message}`);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
