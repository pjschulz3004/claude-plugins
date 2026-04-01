// For shadow mode (Phase 6), set JARVIS_TELEGRAM_BOT_TOKEN_SHADOW as the second
// bot token to avoid 409 Conflict (Pitfall 5). No dual-bot logic needed yet.

import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import type { Dispatcher } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import type { BreakerManager } from "./state/breakers.js";
import { BreakerState } from "@jarvis/shared";
import type { ChatHistory } from "./state/history.js";
import type { ImapFlowBackend } from "@jarvis/email";
import type { TsdavCalendarBackend } from "@jarvis/calendar";
import type { YnabBackend } from "@jarvis/budget";

export interface TelegramConfig {
	token: string;
	chatId: string;
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	breakers: BreakerManager;
	history: ChatHistory;
	email?: ImapFlowBackend;
	calendar?: TsdavCalendarBackend;
	budget?: YnabBackend;
}

/**
 * Convert an ISO timestamp to a human-friendly relative time string.
 */
export function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	const now = Date.now();
	const diffMs = now - then;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHr = Math.floor(diffMin / 60);
	const diffDays = Math.floor(diffHr / 24);

	if (diffSec < 60) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHr < 24) return `${diffHr}h ago`;
	if (diffDays === 1) return "yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;
	return new Date(iso).toLocaleDateString("en-GB");
}

/**
 * Get today's calendar events as formatted text.
 * Reusable by /today command and /morning greeting.
 */
export async function getTodayEvents(
	config: TelegramConfig,
): Promise<string> {
	if (!config.calendar) {
		return "Calendar not configured.";
	}
	const now = new Date();
	const startOfDay = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).toISOString();
	const endOfDay = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
	).toISOString();
	const events = await config.calendar.listEvents(startOfDay, endOfDay);
	if (events.length === 0) {
		return "Clear schedule today.";
	}
	const lines = events.map((e) => {
		const start = new Date(e.start).toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
		});
		const end = new Date(e.end).toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
		});
		return `  ${start}-${end} ${e.summary}`;
	});
	return lines.join("\n");
}

/**
 * Build the morning summary text. Exported so main.ts can call it for the 07:30 cron.
 */
export async function buildMorningSummary(
	config: TelegramConfig,
): Promise<string> {
	const now = new Date();
	const dateStr = now.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const sections: string[] = [`Good morning, Paul.\n${dateStr}`];

	// Calendar
	try {
		const calText = await getTodayEvents(config);
		sections.push(`\nCalendar:\n${calText}`);
	} catch {
		sections.push("\nCalendar: unavailable");
	}

	// Overnight task runs (since midnight)
	try {
		const midnight = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).toISOString();
		const recentAll = config.ledger.getRecentAll(50);
		const overnight = recentAll.filter((t) => t.started_at >= midnight);
		if (overnight.length > 0) {
			const taskLines = overnight.map(
				(t) =>
					`  ${t.status === "success" ? "\u2705" : "\u274C"} ${t.task_name} (${relativeTime(t.started_at)})`,
			);
			sections.push(`\nOvernight tasks:\n${taskLines.join("\n")}`);
		} else {
			sections.push("\nOvernight tasks: none");
		}
	} catch {
		sections.push("\nOvernight tasks: unavailable");
	}

	// Unread email count
	try {
		if (config.email) {
			const emails = await config.email.listUnread(1);
			// listUnread(1) returns at most 1, but we want to know if there are any
			if (emails.length > 0) {
				sections.push("\nEmail: unread messages waiting");
			} else {
				sections.push("\nEmail: inbox zero");
			}
		}
	} catch {
		sections.push("\nEmail: unavailable");
	}

	return sections.join("");
}

/**
 * Classify an error and return a user-friendly message.
 */
function friendlyError(err: unknown): string {
	const msg =
		err instanceof Error ? err.message : String(err);
	const lower = msg.toLowerCase();
	if (
		lower.includes("auth") ||
		lower.includes("401") ||
		lower.includes("oauth") ||
		lower.includes("token expired")
	) {
		return "I'm having trouble with authentication. Paul may need to refresh credentials.";
	}
	if (lower.includes("timeout") || lower.includes("timed out")) {
		return "That took too long. Try a simpler question or try again in a minute.";
	}
	return "I couldn't process that right now. Try again shortly.";
}

/**
 * Send a potentially long message, splitting at paragraph boundaries.
 */
async function sendSplit(ctx: Context, text: string): Promise<void> {
	const chunks = splitMessage(text);
	for (const chunk of chunks) {
		await ctx.reply(chunk);
	}
}

/**
 * Create and configure the Telegram bot with auth middleware,
 * slash commands, and free-text relay.
 */
export function createBot(config: TelegramConfig): Telegraf {
	const bot = new Telegraf(config.token);

	// Override default error handler to prevent process.exit (Pitfall 6)
	bot.catch((err: unknown, ctx: Context) => {
		console.error("[telegram] Unhandled error:", err);
		ctx.reply("Something went wrong. I'll look into it.").catch(() => {});
	});

	// Auth middleware -- must be first (TG-05)
	bot.use((ctx, next) => {
		const chatId = ctx.chat?.id?.toString();
		if (chatId !== config.chatId) {
			console.warn(
				`[telegram] Unauthorized message from chat ${chatId}`,
			);
			return; // silently drop
		}
		return next();
	});

	// /start
	bot.command("start", async (ctx) => {
		try {
			await ctx.reply(
				"Jarvis at your service. Use /status for system health, or just send me a message.",
			);
		} catch (err) {
			console.error("[telegram] /start error:", err);
			await ctx.reply("Something went wrong. I'll look into it.");
		}
	});

	// /status -- system health overview
	bot.command("status", async (ctx) => {
		try {
			const uptime = Math.floor(process.uptime());
			const hours = Math.floor(uptime / 3600);
			const minutes = Math.floor((uptime % 3600) / 60);

			const breakerStates = config.breakers.getStates();
			const breakerLines = Object.entries(breakerStates)
				.map(
					([name, state]) =>
						`  ${state === BreakerState.CLOSED ? "\u2705" : state === BreakerState.HALF_OPEN ? "\u26A0\uFE0F" : "\u274C"} ${name}: ${state}`,
				)
				.join("\n");

			// Get recent tasks across all names by querying a broad set
			const recentTasks = config.ledger.getRecentAll(5);
			const taskLines =
				recentTasks.length > 0
					? recentTasks
							.map(
								(t) =>
									`  ${t.status === "success" ? "\u2705" : "\u274C"} ${t.task_name} (${relativeTime(t.started_at)})`,
							)
							.join("\n")
					: "  No recent tasks";

			const msg = [
				`Uptime: ${hours}h ${minutes}m`,
				"",
				"Circuit Breakers:",
				breakerLines || "  None registered",
				"",
				"Recent Tasks:",
				taskLines,
			].join("\n");

			await sendSplit(ctx, msg);
		} catch (err) {
			console.error("[telegram] /status error:", err);
			await ctx.reply("Something went wrong. I'll look into it.");
		}
	});

	// /inbox -- recent unread emails
	bot.command("inbox", async (ctx) => {
		try {
			if (!config.email) {
				await ctx.reply(
					"Email service not configured. Set MAILBOX credentials.",
				);
				return;
			}
			const emails = await config.email.listUnread(10);
			if (emails.length === 0) {
				await ctx.reply("Inbox zero! No unread emails.");
				return;
			}
			const lines = emails.map(
				(e, i) =>
					`${i + 1}. From: ${e.from?.name || e.from?.address || "unknown"} - ${e.subject} (${e.date})`,
			);
			await sendSplit(ctx, lines.join("\n"));
		} catch (err) {
			console.error("[telegram] /inbox error:", err);
			await ctx.reply("Email service unavailable.");
		}
	});

	// /today -- today's calendar events
	bot.command("today", async (ctx) => {
		try {
			const text = await getTodayEvents(config);
			await sendSplit(ctx, text);
		} catch (err) {
			console.error("[telegram] /today error:", err);
			await ctx.reply("Calendar service unavailable.");
		}
	});

	// /budget -- top categories by activity (EUR)
	bot.command("budget", async (ctx) => {
		try {
			if (!config.budget) {
				await ctx.reply(
					"Budget service not configured. Set YNAB credentials.",
				);
				return;
			}
			const categories = await config.budget.getCategories();
			const sorted = categories
				.filter((c) => c.activity !== 0)
				.sort(
					(a, b) => Math.abs(b.activity) - Math.abs(a.activity),
				)
				.slice(0, 5);
			if (sorted.length === 0) {
				await ctx.reply("No budget activity this month.");
				return;
			}
			const lines = sorted.map(
				(c) =>
					`  ${c.name}: spent ${Math.abs(c.activity).toFixed(2)} EUR, remaining ${c.balance.toFixed(2)} EUR`,
			);
			await sendSplit(
				ctx,
				"Top 5 categories:\n" + lines.join("\n"),
			);
		} catch (err) {
			console.error("[telegram] /budget error:", err);
			await ctx.reply("Budget service unavailable.");
		}
	});

	// /tasks -- calendar todos
	bot.command("tasks", async (ctx) => {
		try {
			if (!config.calendar) {
				await ctx.reply(
					"Calendar service not configured. Set CalDAV credentials.",
				);
				return;
			}
			const todos = await config.calendar.listTodos();
			if (todos.length === 0) {
				await ctx.reply("No pending tasks.");
				return;
			}
			const lines = todos.map(
				(t) =>
					`${t.completed ? "\u2705" : "\u2B1C"} ${t.summary}${t.due ? ` (due ${t.due})` : ""}`,
			);
			await sendSplit(ctx, lines.join("\n"));
		} catch (err) {
			console.error("[telegram] /tasks error:", err);
			await ctx.reply("Tasks service unavailable.");
		}
	});

	// /history -- recent task ledger entries with relative timestamps
	bot.command("history", async (ctx) => {
		try {
			const recentTasks = config.ledger.getRecentAll(10);
			if (recentTasks.length === 0) {
				await ctx.reply("No task history yet.");
				return;
			}
			const lines = recentTasks.map(
				(t) =>
					`${t.status === "success" ? "\u2705" : "\u274C"} ${t.task_name} - ${t.status} (${t.duration_ms}ms) ${relativeTime(t.started_at)}`,
			);
			await sendSplit(ctx, "Recent task runs:\n" + lines.join("\n"));
		} catch (err) {
			console.error("[telegram] /history error:", err);
			await ctx.reply("Something went wrong. I'll look into it.");
		}
	});

	// /morning -- daily greeting with calendar, overnight tasks, email count
	bot.command("morning", async (ctx) => {
		try {
			const summary = await buildMorningSummary(config);
			await sendSplit(ctx, summary);
		} catch (err) {
			console.error("[telegram] /morning error:", err);
			await ctx.reply("Something went wrong building the morning summary.");
		}
	});

	// Free-text relay (TG-02) -- runs after command handlers
	bot.on("text", async (ctx) => {
		try {
			const chatId = ctx.chat.id.toString();
			const userText = ctx.message.text;

			// Record user message
			config.history.record(chatId, "user", userText);

			// Build prompt with conversation history
			const recent = config.history.getRecent(chatId, 10);
			const historyLines = recent.map((m) => `${m.role}: ${m.text}`).join("\n");

			const prompt = `You are Jarvis, a personal AI assistant. Respond concisely.

Conversation history:
${historyLines}

Respond to the latest message.`;

			// Dispatch through claude -p
			const result = await config.dispatcher.dispatch(prompt, {
				maxTurns: 3,
				timeoutMs: 120_000,
			});

			// Record assistant response
			config.history.record(chatId, "assistant", result.result);

			// Send response, splitting if needed
			await sendSplit(ctx, result.result);
		} catch (err) {
			console.error("[telegram] free-text relay error:", err);
			await ctx.reply(friendlyError(err));
		}
	});

	return bot;
}

/**
 * Split a long message into chunks that respect Telegram's message size limit.
 * Splits at paragraph boundaries (\n\n), then line boundaries (\n), then hard-cuts.
 * Adds [1/N] prefix when there are multiple chunks.
 */
export function splitMessage(text: string, maxLen = 4000): string[] {
	if (text.length <= maxLen) {
		return [text];
	}

	// Reserve space for prefix like "[1/2] " (up to ~10 chars for safety)
	const prefixReserve = 10;
	const chunkLen = maxLen - prefixReserve;

	const rawChunks: string[] = [];
	const paragraphs = text.split("\n\n");
	let current = "";

	for (const para of paragraphs) {
		const separator = current ? "\n\n" : "";
		if (current && (current + separator + para).length > chunkLen) {
			rawChunks.push(current);
			current = "";
		}
		if (para.length > chunkLen) {
			// Single paragraph exceeds limit - split at newline or hard-cut
			if (current) {
				rawChunks.push(current);
				current = "";
			}
			let remaining = para;
			while (remaining.length > chunkLen) {
				const lastNewline = remaining.lastIndexOf("\n", chunkLen);
				if (lastNewline > 0) {
					rawChunks.push(remaining.slice(0, lastNewline));
					remaining = remaining.slice(lastNewline + 1);
				} else {
					rawChunks.push(remaining.slice(0, chunkLen));
					remaining = remaining.slice(chunkLen);
				}
			}
			if (remaining) {
				current = remaining;
			}
		} else {
			current = current ? current + separator + para : para;
		}
	}
	if (current) {
		rawChunks.push(current);
	}

	if (rawChunks.length === 1) {
		return rawChunks;
	}

	// Add chunk numbering
	const total = rawChunks.length;
	return rawChunks.map((chunk, i) => `[${i + 1}/${total}] ${chunk}`);
}
