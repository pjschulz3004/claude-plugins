/**
 * Tool bridge: connects Claude's tool_use requests to Jarvis's backends.
 *
 * Defines tool schemas (what Claude sees) and executors (what runs locally).
 * Tool execution costs zero tokens — only Claude's reasoning uses the subscription.
 */

import { createLogger } from "./logger.js";
import type { ToolDefinition, ToolExecutor } from "./claude-api.js";
import type { ImapFlowBackend } from "@jarvis/email";
import type { TsdavCalendarBackend } from "@jarvis/calendar";
import type { YnabBackend } from "@jarvis/budget";

const log = createLogger("tools");

// ---------------------------------------------------------------------------
// Tool definitions (what Claude sees)
// ---------------------------------------------------------------------------

export function buildToolDefinitions(backends: {
	email?: ImapFlowBackend;
	calendar?: TsdavCalendarBackend;
	budget?: YnabBackend;
}): ToolDefinition[] {
	const tools: ToolDefinition[] = [];

	if (backends.email) {
		tools.push(
			{
				name: "email_list_unread",
				description: "List unread emails from the inbox. Returns sender, subject, date, uid for each.",
				input_schema: {
					type: "object",
					properties: { limit: { type: "number", description: "Max emails to return (default 10)" } },
				},
			},
			{
				name: "email_search",
				description: "Search emails by criteria: from, subject, folder, date range, keyword.",
				input_schema: {
					type: "object",
					properties: {
						from: { type: "string" },
						subject: { type: "string" },
						folder: { type: "string" },
						since: { type: "string", description: "ISO date YYYY-MM-DD" },
						before: { type: "string", description: "ISO date YYYY-MM-DD" },
						keyword: { type: "string", description: "IMAP keyword like $AutoDelete3d" },
						flagged: { type: "boolean" },
						seen: { type: "boolean" },
					},
				},
			},
			{
				name: "email_move",
				description: "Move an email to a different IMAP folder.",
				input_schema: {
					type: "object",
					properties: {
						uid: { type: "string", description: "Email UID" },
						folder: { type: "string", description: "Target folder path" },
					},
					required: ["uid", "folder"],
				},
			},
			{
				name: "email_flag",
				description: "Flag an email (star it).",
				input_schema: {
					type: "object",
					properties: { uid: { type: "string" } },
					required: ["uid"],
				},
			},
			{
				name: "email_trash",
				description: "Move an email to trash.",
				input_schema: {
					type: "object",
					properties: { uid: { type: "string" } },
					required: ["uid"],
				},
			},
			{
				name: "email_mark_read",
				description: "Mark an email as read.",
				input_schema: {
					type: "object",
					properties: { uid: { type: "string" } },
					required: ["uid"],
				},
			},
			{
				name: "email_set_keyword",
				description: "Set a custom IMAP keyword on an email (e.g. $AutoDelete3d, $Invoice).",
				input_schema: {
					type: "object",
					properties: {
						uid: { type: "string" },
						keyword: { type: "string" },
					},
					required: ["uid", "keyword"],
				},
			},
			{
				name: "email_list_folders",
				description: "List all IMAP folders.",
				input_schema: { type: "object", properties: {} },
			},
		);
	}

	if (backends.calendar) {
		tools.push(
			{
				name: "calendar_list_events",
				description: "List calendar events in a date range.",
				input_schema: {
					type: "object",
					properties: {
						startDate: { type: "string", description: "ISO datetime" },
						endDate: { type: "string", description: "ISO datetime" },
					},
					required: ["startDate", "endDate"],
				},
			},
			{
				name: "calendar_list_todos",
				description: "List pending VTODO tasks.",
				input_schema: { type: "object", properties: {} },
			},
		);
	}

	if (backends.budget) {
		tools.push(
			{
				name: "budget_get_categories",
				description: "Get all budget categories with balances and spending.",
				input_schema: { type: "object", properties: {} },
			},
			{
				name: "budget_get_transactions",
				description: "Get transactions for a date range.",
				input_schema: {
					type: "object",
					properties: {
						startDate: { type: "string", description: "YYYY-MM-DD" },
						endDate: { type: "string", description: "YYYY-MM-DD" },
					},
					required: ["startDate"],
				},
			},
			{
				name: "budget_categorize",
				description: "Categorize a transaction.",
				input_schema: {
					type: "object",
					properties: {
						transactionId: { type: "string" },
						categoryId: { type: "string" },
					},
					required: ["transactionId", "categoryId"],
				},
			},
			{
				name: "budget_approve",
				description: "Approve transactions.",
				input_schema: {
					type: "object",
					properties: {
						transactionIds: { type: "array", items: { type: "string" } },
					},
					required: ["transactionIds"],
				},
			},
		);
	}

	return tools;
}

// ---------------------------------------------------------------------------
// Tool executor (what runs locally — zero tokens)
// ---------------------------------------------------------------------------

export function buildToolExecutor(backends: {
	email?: ImapFlowBackend;
	calendar?: TsdavCalendarBackend;
	budget?: YnabBackend;
}): ToolExecutor {
	return async (name: string, input: Record<string, unknown>): Promise<string> => {
		const startMs = Date.now();
		try {
			const result = await executeToolImpl(name, input, backends);
			log.info("tool_executed", { tool: name, duration_ms: Date.now() - startMs });
			return result;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log.error("tool_execution_error", { tool: name, error: msg });
			throw err;
		}
	};
}

async function executeToolImpl(
	name: string,
	input: Record<string, unknown>,
	backends: {
		email?: ImapFlowBackend;
		calendar?: TsdavCalendarBackend;
		budget?: YnabBackend;
	},
): Promise<string> {
	const { email, calendar, budget } = backends;

	switch (name) {
		// --- Email ---
		case "email_list_unread": {
			if (!email) return "Email not configured.";
			const emails = await email.listUnread(Number(input.limit) || 10);
			return JSON.stringify(emails.map((e) => ({
				uid: e.uid, from: `${e.from.name} <${e.from.address}>`, subject: e.subject, date: e.date,
			})));
		}
		case "email_search": {
			if (!email) return "Email not configured.";
			const results = await email.search(input as Record<string, unknown> & { from?: string; subject?: string; since?: string; before?: string; folder?: string; flagged?: boolean; seen?: boolean; keyword?: string });
			return JSON.stringify(results.map((e) => ({
				uid: e.uid, from: `${e.from.name} <${e.from.address}>`, subject: e.subject, date: e.date,
			})));
		}
		case "email_move": {
			if (!email) return "Email not configured.";
			await email.moveEmail(String(input.uid), String(input.folder));
			return `Moved ${input.uid} to ${input.folder}`;
		}
		case "email_flag": {
			if (!email) return "Email not configured.";
			await email.flagEmail(String(input.uid), "\\Flagged");
			return `Flagged ${input.uid}`;
		}
		case "email_trash": {
			if (!email) return "Email not configured.";
			await email.trashEmail(String(input.uid));
			return `Trashed ${input.uid}`;
		}
		case "email_mark_read": {
			if (!email) return "Email not configured.";
			await email.markRead(String(input.uid));
			return `Marked ${input.uid} as read`;
		}
		case "email_set_keyword": {
			if (!email) return "Email not configured.";
			await email.setKeyword(String(input.uid), String(input.keyword));
			return `Set keyword ${input.keyword} on ${input.uid}`;
		}
		case "email_list_folders": {
			if (!email) return "Email not configured.";
			const folders = await email.listFolders();
			return JSON.stringify(folders.map((f) => ({ path: f.path, name: f.name, unread: f.unseenMessages })));
		}

		// --- Calendar ---
		case "calendar_list_events": {
			if (!calendar) return "Calendar not configured.";
			const events = await calendar.listEvents(
				String(input.startDate),
				String(input.endDate),
			);
			return JSON.stringify(events);
		}
		case "calendar_list_todos": {
			if (!calendar) return "Calendar not configured.";
			const todos = await calendar.listTodos();
			return JSON.stringify(todos);
		}

		// --- Budget ---
		case "budget_get_categories": {
			if (!budget) return "Budget not configured.";
			const cats = await budget.getCategories();
			return JSON.stringify(cats);
		}
		case "budget_get_transactions": {
			if (!budget) return "Budget not configured.";
			const txns = await budget.getTransactions(
				String(input.startDate),
				input.endDate ? String(input.endDate) : undefined,
			);
			return JSON.stringify(txns);
		}
		case "budget_categorize": {
			if (!budget) return "Budget not configured.";
			await budget.categorizeTransaction(String(input.transactionId), String(input.categoryId));
			return `Categorized ${input.transactionId}`;
		}
		case "budget_approve": {
			if (!budget) return "Budget not configured.";
			const ids = input.transactionIds as string[];
			await budget.approveTransactions(ids);
			return `Approved ${ids.length} transaction(s)`;
		}

		default:
			return `Unknown tool: ${name}`;
	}
}
