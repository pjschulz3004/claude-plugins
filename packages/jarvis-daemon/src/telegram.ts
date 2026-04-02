// For shadow mode (Phase 6), set JARVIS_TELEGRAM_BOT_TOKEN_SHADOW as the second
// bot token to avoid 409 Conflict (Pitfall 5). No dual-bot logic needed yet.

import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { createLogger } from "./logger.js";

const log = createLogger("telegram");
import type { Dispatcher } from "./dispatcher.js";
import type { TaskLedger } from "./state/ledger.js";
import type { BreakerManager } from "./state/breakers.js";
import { BreakerState } from "@jarvis/shared";
import type { ChatHistory } from "./state/history.js";
import type { CorrectionStore } from "./state/telemetry.js";
import {
	InteractionStore,
	classifyIntent,
	classifyTopic,
	classifyMood,
	getTimeOfDay,
	getDayOfWeek,
} from "./state/interactions.js";
import { ClaudeAPI, RateLimitError, AuthError, type StreamDelta } from "./claude-api.js";
import { buildToolDefinitions, buildToolExecutor } from "./tool-bridge.js";
import type { ImapFlowBackend } from "@jarvis/email";
import type { TsdavCalendarBackend } from "@jarvis/calendar";
import type { TsdavContactsBackend } from "@jarvis/contacts";
import type { YnabBackend } from "@jarvis/budget";

const TOOL_DESCRIPTIONS: Record<string, string> = {
	list_unread: "Checking your inbox...",
	search: "Searching emails...",
	move: "Moving email...",
	flag: "Flagging...",
	trash: "Trashing...",
	list_events: "Checking your calendar...",
	list_todos: "Looking at your tasks...",
	get_categories: "Checking budget...",
	get_transactions: "Looking at transactions...",
	categorize_transaction: "Categorising...",
	approve_transactions: "Approving transactions...",
	search_contacts: "Looking up contacts...",
};

export interface TelegramConfig {
	token: string;
	chatId: string;
	dispatcher: Dispatcher;
	ledger: TaskLedger;
	breakers: BreakerManager;
	history: ChatHistory;
	email?: ImapFlowBackend;
	calendar?: TsdavCalendarBackend;
	contacts?: TsdavContactsBackend;
	budget?: YnabBackend;
	corrections?: CorrectionStore;
	interactions?: InteractionStore;
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

			// Correction rates (TEL-05)
			let correctionSection = "";
			if (config.corrections) {
				const taskTypes = ["email_triage", "budget"];
				const rateLines: string[] = [];
				for (const taskType of taskTypes) {
					const rate7 = config.corrections.rollingCorrectionRate(taskType, 7);
					const rate30 = config.corrections.rollingCorrectionRate(taskType, 30);
					if (rate7 > 0 || rate30 > 0) {
						rateLines.push(
							`  ${taskType}: ${(rate7 * 100).toFixed(0)}% / ${(rate30 * 100).toFixed(0)}%`,
						);
					}
				}
				if (rateLines.length > 0) {
					correctionSection = [
						"",
						"Correction Rates (7d / 30d):",
						...rateLines,
					].join("\n");
				} else {
					correctionSection = "\n\nNo correction data yet.";
				}
			}

			const msg = [
				`Uptime: ${hours}h ${minutes}m`,
				"",
				"Circuit Breakers:",
				breakerLines || "  None registered",
				"",
				"Recent Tasks:",
				taskLines,
				correctionSection,
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

	// Free-text relay — direct Claude API with tool loop
	const claude = new ClaudeAPI(config.ledger.database);
	const tools = buildToolDefinitions({
		email: config.email,
		calendar: config.calendar,
		contacts: config.contacts,
		budget: config.budget,
	});
	const executor = buildToolExecutor({
		email: config.email,
		calendar: config.calendar,
		contacts: config.contacts,
		budget: config.budget,
	});

	let lastInteractionId: number | null = null;
	let lastInteractionTopic: string | null = null;

	const SYSTEM_PROMPT = `You are Jarvis, Paul's personal AI assistant. You run 24/7 on a server in Germany. This is a persistent conversation. You remember everything Paul tells you within this session.

WHO YOU ARE
Efficient, thoughtful, slightly dry British humour. You are not a chatbot. You are a capable, proactive personal assistant who knows Paul's digital life: email, calendar, budget, contacts, and files. Think of yourself as a senior executive assistant who happens to be software.

HOW TO RESPOND
Plain text only. No markdown. No bullet points unless listing items. Lead with what matters. Be specific: names, times, amounts, sender addresses. When you acted on something, say what you DID naturally: "Triaged your inbox. 3 newsletters marked read, flagged an invoice from Hetzner (EUR 49.00), trashed 2 spam." Never list tool names or API calls.

HOW TO ACT
When Paul asks you to do something, DO it using your tools. Don't describe what you could do. Act first, report results. If a request is ambiguous, ask a brief clarifying question BEFORE acting. Remember Paul's answer for next time.

CLARIFYING QUESTIONS AND PREFERENCES
When Paul makes a request that could be interpreted multiple ways, ask ONE focused clarifying question. Examples:
- "When you say 'give me my emails from this week', shall I include read ones too? All folders or just inbox?"
- "For the budget rundown, want me to compare against your budget limits, or just list the spending?"
- "Should I group these by day, by sender, or by importance?"

Once Paul answers, REMEMBER that preference. Never ask the same clarifying question twice. If he said he wants all folders including read emails, do that every time from now on without asking.

PROACTIVE OBSERVATIONS
When you notice something while fulfilling a request, mention it naturally:
- "By the way, that Hetzner invoice is EUR 10 more than last month."
- "You have a meeting with Mueller at 14:00 and he sent you an email yesterday you haven't read."
- "Your dining budget is at 85% with 10 days left in the month."

WHAT YOU KNOW ABOUT PAUL
Email: mailbox.org (paul@jschulz.org personal, it@jschulz.org business). Calendar and contacts: same provider (CalDAV/CardDAV at dav.mailbox.org). Budget: YNAB. Location: Germany (Europe/Berlin timezone). Currency: EUR.

TONE
Address Paul naturally. Not "sir", not "boss". Just his name when needed, or nothing at all. Dry British wit is welcome when it comes naturally. Never forced. No emoji. No exclamation marks. No filler ("Sure!", "Of course!", "Great question!").`;

	bot.on("text", async (ctx) => {
		const startMs = Date.now();
		const chatId = ctx.chat.id.toString();
		const userText = ctx.message.text;

		// Classify the interaction
		const intent = classifyIntent(userText);
		const topic = classifyTopic(userText);
		const mood = classifyMood(userText);

		// Detect follow-up / correction
		if (lastInteractionTopic === topic && lastInteractionId !== null && config.interactions) {
			config.interactions.markFollowUp(lastInteractionId);
		}
		if (intent === "correction" && lastInteractionId !== null && config.interactions) {
			config.interactions.markCorrection(lastInteractionId, userText.slice(0, 200));
		}

		// Show typing immediately
		ctx.sendChatAction("typing").catch(() => {});
		const typingInterval = setInterval(() => {
			ctx.sendChatAction("typing").catch(() => {});
		}, 4000);

		// Progress message for tool use
		let progressMsgId: number | null = null;

		const onDelta = (delta: StreamDelta) => {
			if (delta.type === "tool_start" && delta.toolName) {
				const desc = TOOL_DESCRIPTIONS[delta.toolName] ?? `Working on it...`;
				if (!progressMsgId) {
					ctx.reply(desc).then((msg) => { progressMsgId = msg.message_id; }).catch(() => {});
				} else {
					ctx.telegram.editMessageText(ctx.chat.id, progressMsgId, undefined, desc).catch(() => {});
				}
			}
		};

		try {
			config.history.record(chatId, "user", userText);

			// Full agentic tool loop — Claude thinks (subscription), tools execute locally (free)
			const result = await claude.sendWithTools(chatId, userText, {
				model: "sonnet",
				system: SYSTEM_PROMPT,
				tools,
				executor,
				maxTurns: 15,
				onDelta,
			});

			clearInterval(typingInterval);
			const responseTimeMs = Date.now() - startMs;

			// Delete progress message, send final response
			if (progressMsgId) {
				ctx.telegram.deleteMessage(ctx.chat.id, progressMsgId).catch(() => {});
			}
			const finalText = result.text || "Done.";
			await sendSplit(ctx, finalText);

			// Record in chat history + deep interaction logging
			config.history.record(chatId, "assistant", result.text);

			// Deep interaction logging
			if (config.interactions) {
				lastInteractionId = config.interactions.record({
					timestamp: new Date().toISOString(),
					channel: "telegram",
					user_message: userText,
					intent,
					topic,
					entities: "[]",
					assistant_response: result.text.slice(0, 500),
					tools_used: JSON.stringify(result.toolsUsed),
					actions_taken: JSON.stringify(result.toolsUsed),
					response_time_ms: responseTimeMs,
					model_used: result.model,
					tokens_used: (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
					follow_up: false,
					correction: false,
					explicit_feedback: null,
					time_of_day: getTimeOfDay(),
					day_of_week: getDayOfWeek(),
					mood_signal: mood,
				});
				lastInteractionTopic = topic;
			}

			log.info("free_text_complete", {
				intent,
				topic,
				mood,
				response_time_ms: responseTimeMs,
				response_length: result.text.length,
			});
		} catch (err) {
			const responseTimeMs = Date.now() - startMs;
			log.error("free_text_failed", {
				intent,
				topic,
				mood,
				response_time_ms: responseTimeMs,
				error: err instanceof Error ? err.message : String(err),
			});

			// Still log the failed interaction
			if (config.interactions) {
				lastInteractionId = config.interactions.record({
					timestamp: new Date().toISOString(),
					channel: "telegram",
					user_message: userText,
					intent,
					topic,
					entities: "[]",
					assistant_response: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
					tools_used: "[]",
					actions_taken: "[]",
					response_time_ms: responseTimeMs,
					model_used: "sonnet",
					tokens_used: 0,
					follow_up: false,
					correction: false,
					explicit_feedback: null,
					time_of_day: getTimeOfDay(),
					day_of_week: getDayOfWeek(),
					mood_signal: mood,
				});
				lastInteractionTopic = topic;
			}

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
