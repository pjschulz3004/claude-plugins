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
import type { TsdavContactsBackend } from "@jarvis/contacts";
import type { YnabBackend } from "@jarvis/budget";

const log = createLogger("tools");

// ---------------------------------------------------------------------------
// Tool definitions (what Claude sees)
// ---------------------------------------------------------------------------

export function buildToolDefinitions(backends: {
	email?: ImapFlowBackend;
	calendar?: TsdavCalendarBackend;
	contacts?: TsdavContactsBackend;
	budget?: YnabBackend;
}): ToolDefinition[] {
	const tools: ToolDefinition[] = [];

	if (backends.email) {
		tools.push(
			{
				name: "email_list_unread",
				description: "List unread emails. Returns sender, subject, date, uid, flags.",
				input_schema: {
					type: "object",
					properties: { limit: { type: "number", description: "Max emails (default 10)" } },
				},
			},
			{
				name: "email_search",
				description: "Search emails by criteria. Returns sender, subject, date, uid, flags for matches.",
				input_schema: {
					type: "object",
					properties: {
						from: { type: "string" },
						subject: { type: "string" },
						folder: { type: "string", description: "IMAP folder (default INBOX)" },
						since: { type: "string", description: "ISO date YYYY-MM-DD" },
						before: { type: "string", description: "ISO date YYYY-MM-DD" },
						keyword: { type: "string", description: "IMAP keyword like $AutoDelete3d" },
						flagged: { type: "boolean" },
						seen: { type: "boolean" },
					},
				},
			},
			{
				name: "email_read",
				description: "Read the full text content of an email by UID. Returns the plain text body (or stripped HTML if no plain text part).",
				input_schema: {
					type: "object",
					properties: { uid: { type: "string", description: "Email UID" } },
					required: ["uid"],
				},
			},
			{
				name: "email_move",
				description: "Move an email to a different IMAP folder.",
				input_schema: {
					type: "object",
					properties: {
						uid: { type: "string" },
						folder: { type: "string", description: "Target folder path" },
					},
					required: ["uid", "folder"],
				},
			},
			{
				name: "email_flag",
				description: "Flag (star) an email.",
				input_schema: {
					type: "object",
					properties: { uid: { type: "string" } },
					required: ["uid"],
				},
			},
			{
				name: "email_unflag",
				description: "Remove flag (unstar) an email.",
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
				name: "email_archive",
				description: "Archive an email (move to Archive folder).",
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
				description: "List all IMAP folders with unread counts.",
				input_schema: { type: "object", properties: {} },
			},
		);
	}

	if (backends.calendar) {
		tools.push(
			{
				name: "calendar_list_events",
				description: "List calendar events in a date range. Returns summary, start, end, location, description.",
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
				description: "List pending VTODO tasks with due dates, priority, status.",
				input_schema: { type: "object", properties: {} },
			},
			{
				name: "calendar_create_event",
				description: "Create a new calendar event.",
				input_schema: {
					type: "object",
					properties: {
						summary: { type: "string", description: "Event title" },
						startDate: { type: "string", description: "ISO datetime for start" },
						endDate: { type: "string", description: "ISO datetime for end" },
						location: { type: "string", description: "Location (optional)" },
						description: { type: "string", description: "Notes (optional)" },
					},
					required: ["summary", "startDate", "endDate"],
				},
			},
			{
				name: "calendar_complete_todo",
				description: "Mark a VTODO task as completed.",
				input_schema: {
					type: "object",
					properties: { id: { type: "string", description: "Todo ID/URL" } },
					required: ["id"],
				},
			},
		);
	}

	if (backends.contacts) {
		tools.push(
			{
				name: "contacts_search",
				description: "Search contacts by name, email, or organisation.",
				input_schema: {
					type: "object",
					properties: { query: { type: "string" } },
					required: ["query"],
				},
			},
			{
				name: "contacts_get",
				description: "Get full details of a contact by ID. Returns name, emails, phones, organisation, address, notes.",
				input_schema: {
					type: "object",
					properties: { id: { type: "string" } },
					required: ["id"],
				},
			},
			{
				name: "contacts_create",
				description: "Create a new contact.",
				input_schema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Full name" },
						email: { type: "string", description: "Email address" },
						phone: { type: "string", description: "Phone number (optional)" },
						organisation: { type: "string", description: "Company/org (optional)" },
					},
					required: ["name"],
				},
			},
			{
				name: "contacts_update",
				description: "Update an existing contact's fields.",
				input_schema: {
					type: "object",
					properties: {
						id: { type: "string", description: "Contact ID" },
						name: { type: "string" },
						email: { type: "string" },
						phone: { type: "string" },
						organisation: { type: "string" },
					},
					required: ["id"],
				},
			},
		);
	}

	if (backends.budget) {
		tools.push(
			{
				name: "budget_get_categories",
				description: "Get all budget categories with budgeted amounts, activity (spending), and remaining balance.",
				input_schema: { type: "object", properties: {} },
			},
			{
				name: "budget_get_transactions",
				description: "Get transactions for a date range. Returns payee, amount, category, date, approved status.",
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
				description: "Assign a category to a transaction.",
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
				description: "Approve one or more transactions.",
				input_schema: {
					type: "object",
					properties: {
						transactionIds: { type: "array", items: { type: "string" } },
					},
					required: ["transactionIds"],
				},
			},
			{
				name: "budget_get_accounts",
				description: "Get all accounts with current balances (checking, savings, credit cards).",
				input_schema: { type: "object", properties: {} },
			},
			{
				name: "budget_get_month",
				description: "Get budget month summary: total budgeted, total activity, ready to assign, age of money.",
				input_schema: {
					type: "object",
					properties: {
						month: { type: "string", description: "YYYY-MM-DD (first day of month)" },
					},
					required: ["month"],
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
	contacts?: TsdavContactsBackend;
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
		contacts?: TsdavContactsBackend;
		budget?: YnabBackend;
	},
): Promise<string> {
	const { email, calendar, contacts, budget } = backends;

	switch (name) {
		// --- Email ---
		case "email_list_unread": {
			if (!email) return "Email not configured.";
			const emails = await email.listUnread(Number(input.limit) || 10);
			return JSON.stringify(emails.map((e) => ({
				uid: e.uid, from: `${e.from.name} <${e.from.address}>`, subject: e.subject, date: e.date, flags: e.flags,
			})));
		}
		case "email_search": {
			if (!email) return "Email not configured.";
			const results = await email.search(input as Record<string, unknown> & { from?: string; subject?: string; since?: string; before?: string; folder?: string; flagged?: boolean; seen?: boolean; keyword?: string });
			return JSON.stringify(results.map((e) => ({
				uid: e.uid, from: `${e.from.name} <${e.from.address}>`, subject: e.subject, date: e.date, flags: e.flags,
			})));
		}
		case "email_read": {
			if (!email) return "Email not configured.";
			const body = await email.getEmailBody(String(input.uid));
			return body;
		}
		case "email_move": {
			if (!email) return "Email not configured.";
			await email.moveEmail(String(input.uid), String(input.folder));
			return `Moved to ${input.folder}`;
		}
		case "email_flag": {
			if (!email) return "Email not configured.";
			await email.flagEmail(String(input.uid), "\\Flagged");
			return "Flagged";
		}
		case "email_unflag": {
			if (!email) return "Email not configured.";
			await email.unflagEmail(String(input.uid), "\\Flagged");
			return "Unflagged";
		}
		case "email_trash": {
			if (!email) return "Email not configured.";
			await email.trashEmail(String(input.uid));
			return "Trashed";
		}
		case "email_archive": {
			if (!email) return "Email not configured.";
			await email.archiveEmail(String(input.uid));
			return "Archived";
		}
		case "email_mark_read": {
			if (!email) return "Email not configured.";
			await email.markRead(String(input.uid));
			return "Marked read";
		}
		case "email_set_keyword": {
			if (!email) return "Email not configured.";
			await email.setKeyword(String(input.uid), String(input.keyword));
			return `Set keyword ${input.keyword}`;
		}
		case "email_list_folders": {
			if (!email) return "Email not configured.";
			const folders = await email.listFolders();
			return JSON.stringify(folders.map((f) => ({ path: f.path, name: f.name, unread: f.unseenMessages })));
		}

		// --- Calendar ---
		case "calendar_list_events": {
			if (!calendar) return "Calendar not configured.";
			const events = await calendar.listEvents(String(input.startDate), String(input.endDate));
			return JSON.stringify(events);
		}
		case "calendar_list_todos": {
			if (!calendar) return "Calendar not configured.";
			const todos = await calendar.listTodos();
			return JSON.stringify(todos);
		}
		case "calendar_create_event": {
			if (!calendar) return "Calendar not configured.";
			await calendar.createEvent(
				String(input.summary),
				String(input.startDate),
				String(input.endDate),
				{
					location: input.location ? String(input.location) : undefined,
					description: input.description ? String(input.description) : undefined,
				},
			);
			return `Event created: ${input.summary}`;
		}
		case "calendar_complete_todo": {
			if (!calendar) return "Calendar not configured.";
			await calendar.completeTodo(String(input.id));
			return "Todo completed";
		}

		// --- Contacts ---
		case "contacts_search": {
			if (!contacts) return "Contacts not configured.";
			const results = await contacts.searchContacts(String(input.query));
			return JSON.stringify(results);
		}
		case "contacts_get": {
			if (!contacts) return "Contacts not configured.";
			const contact = await contacts.getContact(String(input.id));
			return JSON.stringify(contact);
		}
		case "contacts_create": {
			if (!contacts) return "Contacts not configured.";
			await contacts.createContact({
				fullName: String(input.name),
				emails: input.email ? [String(input.email)] : undefined,
				phones: input.phone ? [String(input.phone)] : undefined,
				organization: input.organisation ? String(input.organisation) : undefined,
			});
			return `Contact created: ${input.name}`;
		}
		case "contacts_update": {
			if (!contacts) return "Contacts not configured.";
			const fields: { fullName?: string; emails?: string[]; phones?: string[]; organization?: string } = {};
			if (input.name) fields.fullName = String(input.name);
			if (input.email) fields.emails = [String(input.email)];
			if (input.phone) fields.phones = [String(input.phone)];
			if (input.organisation) fields.organization = String(input.organisation);
			await contacts.updateContact(String(input.id), fields);
			return `Contact updated`;
		}

		// --- Budget ---
		case "budget_get_categories": {
			if (!budget) return "Budget not configured.";
			const cats = await budget.getCategories();
			return JSON.stringify(cats);
		}
		case "budget_get_transactions": {
			if (!budget) return "Budget not configured.";
			const txns = await budget.getTransactions(String(input.startDate), input.endDate ? String(input.endDate) : undefined);
			return JSON.stringify(txns);
		}
		case "budget_categorize": {
			if (!budget) return "Budget not configured.";
			await budget.categorizeTransaction(String(input.transactionId), String(input.categoryId));
			return `Categorized`;
		}
		case "budget_approve": {
			if (!budget) return "Budget not configured.";
			const ids = input.transactionIds as string[];
			await budget.approveTransactions(ids);
			return `Approved ${ids.length} transaction(s)`;
		}
		case "budget_get_accounts": {
			if (!budget) return "Budget not configured.";
			const accounts = await budget.getAccounts();
			return JSON.stringify(accounts);
		}
		case "budget_get_month": {
			if (!budget) return "Budget not configured.";
			const summary = await budget.getMonthSummary(String(input.month));
			return JSON.stringify(summary);
		}

		default:
			return `Unknown tool: ${name}`;
	}
}
