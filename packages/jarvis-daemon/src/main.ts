import { createLogger } from "./logger.js";
import { TaskLedger } from "./state/ledger.js";

const log = createLogger("main");
import { BreakerManager } from "./state/breakers.js";
import { ChatHistory } from "./state/history.js";
import { CorrectionStore } from "./state/telemetry.js";
import { InteractionStore } from "./state/interactions.js";
import {
	detectEmailCorrections,
	detectBudgetCorrections,
} from "./state/corrections.js";
import { Dispatcher } from "./dispatcher.js";
import { Scheduler } from "./scheduler.js";
import { HealthServer } from "./health.js";
import { createBot } from "./telegram.js";
import { TelegramChannel, sendNotification } from "./notify.js";
import { runGrowthLoop } from "./growth.js";
import { collectWeeklyDigest, formatWeeklyDigest } from "./weekly-digest.js";
import type { TelegramConfig } from "./telegram.js";
import { ImapFlowBackend } from "@jarvis/email";
import { TsdavCalendarBackend } from "@jarvis/calendar";
import { TsdavContactsBackend } from "@jarvis/contacts";
import { YnabBackend } from "@jarvis/budget";
import { Cron } from "croner";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Telegraf } from "telegraf";
import { KnowledgeGraphClient } from "@jarvis/kg";
import { KGContextInjector } from "./kg-context.js";
import { SituationCollector } from "./situation.js";
import { initSpendingAlertTable, checkSpendingAlerts } from "./spending-alert.js";


const __dirname = dirname(fileURLToPath(import.meta.url));

const ledger = new TaskLedger(join(__dirname, "..", "jarvis.db"));
initSpendingAlertTable(ledger.database);
const breakers = new BreakerManager();
const dispatcher = new Dispatcher();
const history = new ChatHistory(ledger.database);
const correctionStore = new CorrectionStore(ledger.database);
const interactionStore = new InteractionStore(ledger.database);
let scheduler: Scheduler;
let health: HealthServer;
let kgClient: KnowledgeGraphClient | null = null;

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

function buildContactsBackend(): TsdavContactsBackend | undefined {
	const serverUrl = process.env.MAILBOX_CALDAV_URL?.replace("/caldav/", "/carddav/") ?? "https://dav.mailbox.org/carddav/";
	const username = process.env.MAILBOX_USER;
	const password = process.env.MAILBOX_PASS;
	if (!username || !password) return undefined;
	return new TsdavContactsBackend({ serverUrl, username, password });
}

function buildBudgetBackend(): YnabBackend | undefined {
	const accessToken = process.env.YNAB_ACCESS_TOKEN;
	const budgetId = process.env.YNAB_BUDGET_ID;
	if (!accessToken || !budgetId) return undefined;
	return new YnabBackend({ accessToken, budgetId });
}

function buildKGClient(): KnowledgeGraphClient | null {
	const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
	const user = process.env.NEO4J_USER ?? "neo4j";
	const password = process.env.NEO4J_PASSWORD;
	if (!password) {
		log.warn("kg_skipped", { reason: "no NEO4J_PASSWORD" });
		return null;
	}
	return new KnowledgeGraphClient({ uri, user, password });
}

let bot: Telegraf | undefined;

async function start() {
	log.info("daemon_starting");

	// Telegram bot (optional -- skip if no token)
	const telegramToken = process.env.JARVIS_TELEGRAM_BOT_TOKEN;
	const telegramChatId = process.env.JARVIS_TELEGRAM_CHAT_ID;
	const notifyChannels: import("./notify.js").NotifyChannel[] = [];

	let telegramConfig: TelegramConfig | undefined;

	if (telegramToken && telegramChatId) {
		telegramConfig = {
			token: telegramToken,
			chatId: telegramChatId,
			dispatcher,
			ledger,
			breakers,
			history,
			email: buildEmailBackend(),
			calendar: buildCalendarBackend(),
			contacts: buildContactsBackend(),
			budget: buildBudgetBackend(),
			corrections: correctionStore,
			interactions: interactionStore,
		};
		bot = createBot(telegramConfig);
		notifyChannels.push(
			new TelegramChannel({ bot, chatId: telegramChatId }),
		);
		bot.launch({ dropPendingUpdates: true });
		log.info("telegram_started", { chatId: telegramChatId });
	} else {
		log.warn("telegram_skipped", { reason: "no TELEGRAM_BOT_TOKEN" });
	}

	// KG context injection (INTEL-01)
	kgClient = buildKGClient();
	const kgInjector = kgClient ? new KGContextInjector(kgClient) : undefined;
	if (kgClient) {
		log.info("kg_context_enabled");
	}

	// Situational awareness (SITAW-01)
	const situationCollector = new SituationCollector({
		calendar: telegramConfig?.calendar,
		email: telegramConfig?.email,
		budget: telegramConfig?.budget,
	});
	log.info("situation_collector_enabled", {
		calendar: !!telegramConfig?.calendar,
		email: !!telegramConfig?.email,
		budget: !!telegramConfig?.budget,
	});

	// Create scheduler with notification channels (empty if no Telegram)
	scheduler = new Scheduler({
		yamlPath: join(__dirname, "..", "heartbeat.yaml"),
		dispatcher,
		ledger,
		breakers,
		notifyChannels,
		kgInjector,
		situationCollector,
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
	// Growth disabled temporarily — re-enable by uncommenting
	const growthJob = new Cron("0 1 1 1 *", () => { // disabled: was "0 1 * * *"
		log.info("growth_cron_triggered");
		runGrowthLoop({
			dispatcher,
			ledger,
			corrections: correctionStore,
			interactions: interactionStore,
			taskNames: scheduler.getTaskNames(),
			notifyChannels,
			repoRoot,
			startHour: 1,
			endHour: 5,
			pauseBetweenRoundsMs: 60_000,
			maxTurnsPerRound: 30,
			timeoutPerRoundMs: 900_000,
		}).catch((err) => {
			log.error("growth_loop_error", { error: err instanceof Error ? err.message : String(err) });
		});
	});

	// Correction detection cron: every 2 hours during waking hours (7-23)
	const correctionJob = new Cron("0 */2 * * *", () => {
		const hour = new Date().getHours();
		if (hour < 7 || hour > 23) return; // Skip overnight

		const emailBackend = telegramConfig?.email;
		const emailLookup = emailBackend
			? (uid: string) => emailBackend.getMessageFlags(uid)
			: undefined;

		const budgetBackend = telegramConfig?.budget;
		const budgetLookup = budgetBackend
			? (id: string) => budgetBackend.getTransaction(id)
			: undefined;

		Promise.all([
			detectEmailCorrections({
				ledger,
				corrections: correctionStore,
				emailLookup,
			}),
			detectBudgetCorrections({
				ledger,
				corrections: correctionStore,
				budgetLookup,
			}),
		])
			.then(([emailCount, budgetCount]) => {
				if (emailCount > 0 || budgetCount > 0) {
					log.info("corrections_detected", { emailCorrections: emailCount, budgetCorrections: budgetCount });
				}
			})
			.catch((err) => {
				log.error("correction_detection_error", { error: err instanceof Error ? err.message : String(err) });
			});
	});
	log.info("correction_detection_scheduled", { interval: "2h", hours: "07:00-23:00" });

	// Weekly triage digest: Sunday 20:00 — native query, no Claude dispatch
	const weeklyDigestJob = new Cron("0 20 * * 0", () => {
		try {
			const stats = collectWeeklyDigest(ledger);
			const message = formatWeeklyDigest(stats);
			sendNotification(notifyChannels, message, { urgent: false }).catch(
				(err) => log.error("weekly_digest_notify_error", { error: err instanceof Error ? err.message : String(err) }),
			);
			log.info("weekly_digest_sent");
		} catch (err) {
			log.error("weekly_digest_error", { error: err instanceof Error ? err.message : String(err) });
		}
	});
	log.info("weekly_digest_scheduled", { schedule: "Sundays 20:00" });

	// Spending alert: every 3 hours — fires a Telegram notification only when
	// crossing a new threshold (75/85/95% of salary). Stateful: resets on new salary.
	const spendingAlertJob = new Cron("0 */3 * * *", () => {
		const budgetBackend = telegramConfig?.budget;
		if (!budgetBackend || !notifyChannels.length) return;

		checkSpendingAlerts({
			budget: budgetBackend,
			db: ledger.database,
			notifyChannels,
		}).catch((err) => {
			log.error("spending_alert_error", { error: err instanceof Error ? err.message : String(err) });
		});
	});
	log.info("spending_alert_scheduled", { interval: "3h", thresholds: "75/85/95%" });

	log.info("daemon_ready", { healthPort: process.env.JARVIS_HEALTH_PORT || "3333" });
}

async function shutdown(signal: string) {
	log.info("shutdown_started", { signal });
	if (bot) {
		bot.stop(signal);
	}
	scheduler.stop();
	await health.stop();
	ledger.close();
	log.info("shutdown_complete");
	if (kgClient) {
		await kgClient.close();
	}
	process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
	log.error("fatal", { error: err instanceof Error ? err.message : String(err) });
	process.exit(1);
});
