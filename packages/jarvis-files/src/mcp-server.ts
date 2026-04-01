#!/usr/bin/env node

import { requireCredentials } from "@jarvis/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LocalFilesBackend } from "./backend.js";
import type { FilesConfig } from "./types.js";

const creds = requireCredentials("FILES", ["base_dir"]);

const config: FilesConfig = {
	baseDir: creds.base_dir,
};

const backend = new LocalFilesBackend(config);
const server = new McpServer({ name: "jarvis-files", version: "0.1.0" });

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
	return { content: [{ type: "text" as const, text }] };
}

// Tool: list_inbox
server.tool(
	"list_inbox",
	"List files in the inbox directory",
	{},
	async () => {
		try {
			const files = await backend.listInbox();
			return textResult(JSON.stringify(files, null, 2));
		} catch (err) {
			return textResult(`Error listing inbox: ${(err as Error).message}`);
		}
	},
);

// Tool: list_outbox
server.tool(
	"list_outbox",
	"List files in the outbox directory",
	{},
	async () => {
		try {
			const files = await backend.listOutbox();
			return textResult(JSON.stringify(files, null, 2));
		} catch (err) {
			return textResult(`Error listing outbox: ${(err as Error).message}`);
		}
	},
);

// Tool: save_to_inbox
server.tool(
	"save_to_inbox",
	"Save a file to the inbox directory",
	{
		filename: z.string().describe("Name of the file to save"),
		content: z.string().describe("File content (text)"),
	},
	async ({ filename, content }) => {
		try {
			await backend.saveToInbox(filename, content);
			return textResult(`Saved "${filename}" to inbox`);
		} catch (err) {
			return textResult(`Error saving to inbox: ${(err as Error).message}`);
		}
	},
);

// Tool: move_to_outbox
server.tool(
	"move_to_outbox",
	"Move a file from inbox to outbox",
	{
		filename: z.string().describe("Name of the file to move"),
	},
	async ({ filename }) => {
		try {
			await backend.moveToOutbox(filename);
			return textResult(`Moved "${filename}" from inbox to outbox`);
		} catch (err) {
			return textResult(
				`Error moving to outbox: ${(err as Error).message}`,
			);
		}
	},
);

// Tool: archive_file
server.tool(
	"archive_file",
	"Archive a file from outbox to archive/YYYY/MM/",
	{
		filename: z.string().describe("Name of the file to archive"),
	},
	async ({ filename }) => {
		try {
			await backend.archiveFile(filename);
			return textResult(`Archived "${filename}" to archive folder`);
		} catch (err) {
			return textResult(
				`Error archiving file: ${(err as Error).message}`,
			);
		}
	},
);

// Tool: sync_webdav
server.tool(
	"sync_webdav",
	"Sync outbox to mailbox.org WebDAV via rclone",
	{},
	async () => {
		try {
			const result = await backend.syncWebdav();
			return textResult(`WebDAV sync complete: ${result}`);
		} catch (err) {
			return textResult(
				`Error syncing WebDAV: ${(err as Error).message}`,
			);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
