#!/usr/bin/env node

import { requireCredentials } from "@jarvis/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TsdavCalendarBackend } from "./backend.js";
import type { CalDAVConfig } from "./types.js";

const creds = requireCredentials("MAILBOX", ["email", "password"]);

const config: CalDAVConfig = {
	serverUrl: "https://dav.mailbox.org/caldav/",
	username: creds.email,
	password: creds.password,
};

const backend = new TsdavCalendarBackend(config);
const server = new McpServer({ name: "jarvis-calendar", version: "0.1.0" });

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
	return { content: [{ type: "text" as const, text }] };
}

// Tool: list_events (CAL-01)
server.tool(
	"list_events",
	"List calendar events for a date range",
	{
		startDate: z.string().describe("Start of date range (ISO 8601)"),
		endDate: z.string().describe("End of date range (ISO 8601)"),
	},
	async ({ startDate, endDate }) => {
		try {
			const events = await backend.listEvents(startDate, endDate);
			return textResult(JSON.stringify(events, null, 2));
		} catch (err) {
			return textResult(`Error listing events: ${(err as Error).message}`);
		}
	},
);

// Tool: list_todos (CAL-02)
server.tool(
	"list_todos",
	"List pending (non-completed) todos",
	{},
	async () => {
		try {
			const todos = await backend.listTodos();
			return textResult(JSON.stringify(todos, null, 2));
		} catch (err) {
			return textResult(`Error listing todos: ${(err as Error).message}`);
		}
	},
);

// Tool: create_event (CAL-03)
server.tool(
	"create_event",
	"Create a new calendar event",
	{
		summary: z.string().describe("Event title"),
		startDate: z.string().describe("Event start (ISO 8601)"),
		endDate: z.string().describe("Event end (ISO 8601)"),
		location: z.string().optional().describe("Event location"),
		description: z.string().optional().describe("Event description"),
	},
	async ({ summary, startDate, endDate, location, description }) => {
		try {
			await backend.createEvent(summary, startDate, endDate, {
				location,
				description,
			});
			return textResult(`Created event: ${summary}`);
		} catch (err) {
			return textResult(`Error creating event: ${(err as Error).message}`);
		}
	},
);

// Tool: complete_todo (CAL-04)
server.tool(
	"complete_todo",
	"Mark a todo as completed",
	{
		id: z.string().describe("Todo UID to mark as completed"),
	},
	async ({ id }) => {
		try {
			await backend.completeTodo(id);
			return textResult(`Completed todo: ${id}`);
		} catch (err) {
			return textResult(`Error completing todo: ${(err as Error).message}`);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
