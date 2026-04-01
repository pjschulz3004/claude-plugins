import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";
import { ChatHistory } from "./state/history.js";
import { Dispatcher } from "./dispatcher.js";
import { Scheduler } from "./scheduler.js";
import { HealthServer } from "./health.js";
import { createBot } from "./telegram.js";
import { TelegramChannel } from "./notify.js";
import { runGrowthLoop } from "./growth.js";
import { ImapFlowBackend } from "@jarvis/email";
import { TsdavCalendarBackend } from "@jarvis/calendar";
import { YnabBackend } from "@jarvis/budget";
import { Cron } from "croner";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Telegraf } from "telegraf";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ledger = new TaskLedger(join(__dirname, "..", "jarvis.db"));
const breakers = new BreakerManager();
const dispatcher = new Dispatcher();
const history = new ChatHistory(ledger.database);
let scheduler: Scheduler;
let health: HealthServer;

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

	// Telegram bot (optional -- skip if no token)
	const telegramToken = process.env.JARVIS_TELEGRAM_BOT_TOKEN;
	const telegramChatId = process.env.JARVIS_TELEGRAM_CHAT_ID;
	const notifyChannels: import("./notify.js").NotifyChannel[] = [];

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
		notifyChannels.push(
			new TelegramChannel({ bot, chatId: telegramChatId }),
		);
		bot.launch({ dropPendingUpdates: true });
		console.log("[jarvis] Telegram bot started.");
	} else {
		console.log(
			"[jarvis] No TELEGRAM_BOT_TOKEN, skipping Telegram bot",
		);
	}

	// Create scheduler with notification channels (empty if no Telegram)
	scheduler = new Scheduler({
		yamlPath: join(__dirname, "..", "heartbeat.yaml"),
		dispatcher,
		ledger,
		breakers,
		notifyChannels,
	});

	health = new HealthServer({
		breakers,
		ledger,
		taskNames: () => scheduler.getTaskNames(),
	});

	await health.start();
	scheduler.start();

	// Nightly growth loop: 01:00-05:00, runs as a time-bounded loop
	const repoRoot = join(__dirname, "..", "..");
	const growthJob = new Cron("0 1 * * *", () => {
		console.log("[jarvis] Starting nightly growth session...");
		runGrowthLoop({
			dispatcher,
			ledger,
			notifyChannels,
			repoRoot,
			startHour: 1,
			endHour: 5,
			pauseBetweenRoundsMs: 60_000,
			maxTurnsPerRound: 30,
			timeoutPerRoundMs: 900_000,
		}).catch((err) => {
			console.error("[jarvis] Growth loop error:", err);
		});
	});

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
