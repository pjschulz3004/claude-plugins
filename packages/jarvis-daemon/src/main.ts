import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";
import { ChatHistory } from "./state/history.js";
import { Dispatcher } from "./dispatcher.js";
import { Scheduler } from "./scheduler.js";
import { HealthServer } from "./health.js";
import { createBot } from "./telegram.js";
import { ImapFlowBackend } from "@jarvis/email";
import { TsdavCalendarBackend } from "@jarvis/calendar";
import { YnabBackend } from "@jarvis/budget";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Telegraf } from "telegraf";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ledger = new TaskLedger(join(__dirname, "..", "jarvis.db"));
const breakers = new BreakerManager();
const dispatcher = new Dispatcher();
const history = new ChatHistory(ledger.database);
const scheduler = new Scheduler({
	yamlPath: join(__dirname, "..", "heartbeat.yaml"),
	dispatcher,
	ledger,
	breakers,
});
const health = new HealthServer({
	breakers,
	ledger,
	taskNames: () => scheduler.getTaskNames(),
});

// Build tool backends from env vars (optional -- commands degrade gracefully)
function buildEmailBackend(): ImapFlowBackend | undefined {
	const host = process.env.MAILBOX_IMAP_HOST;
	const user = process.env.MAILBOX_USER;
	const pass = process.env.MAILBOX_PASS;
	if (!host || !user || !pass) return undefined;
	return new ImapFlowBackend({
		host,
		port: Number(process.env.MAILBOX_IMAP_PORT || "993"),
		secure: true,
		auth: { user, pass },
	});
}

function buildCalendarBackend(): TsdavCalendarBackend | undefined {
	const serverUrl = process.env.MAILBOX_CALDAV_URL;
	const username = process.env.MAILBOX_USER;
	const password = process.env.MAILBOX_PASS;
	if (!serverUrl || !username || !password) return undefined;
	return new TsdavCalendarBackend({ serverUrl, username, password });
}

function buildBudgetBackend(): YnabBackend | undefined {
	const accessToken = process.env.YNAB_ACCESS_TOKEN;
	const budgetId = process.env.YNAB_BUDGET_ID;
	if (!accessToken || !budgetId) return undefined;
	return new YnabBackend({ accessToken, budgetId });
}

let bot: Telegraf | undefined;

async function start() {
	console.log("[jarvis] Starting daemon...");
	await health.start();
	scheduler.start();

	// Telegram bot (optional -- skip if no token)
	const telegramToken = process.env.JARVIS_TELEGRAM_BOT_TOKEN;
	const telegramChatId = process.env.JARVIS_TELEGRAM_CHAT_ID;
	if (telegramToken && telegramChatId) {
		bot = createBot({
			token: telegramToken,
			chatId: telegramChatId,
			dispatcher,
			ledger,
			breakers,
			history,
			email: buildEmailBackend(),
			calendar: buildCalendarBackend(),
			budget: buildBudgetBackend(),
		});
		bot.launch({ dropPendingUpdates: true });
		console.log("[jarvis] Telegram bot started.");
	} else {
		console.log(
			"[jarvis] No TELEGRAM_BOT_TOKEN, skipping Telegram bot",
		);
	}

	console.log(
		`[jarvis] Daemon running. Health at :${process.env.JARVIS_HEALTH_PORT || "3333"}/health`,
	);
}

async function shutdown(signal: string) {
	console.log(`[jarvis] Received ${signal}, shutting down...`);
	if (bot) {
		bot.stop(signal);
	}
	scheduler.stop();
	await health.stop();
	ledger.close();
	console.log("[jarvis] Shutdown complete.");
	process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
	console.error("[jarvis] Fatal:", err);
	process.exit(1);
});
