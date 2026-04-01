import type { Telegraf } from "telegraf";
import { splitMessage } from "./telegram.js";
import { createLogger } from "./logger.js";

const log = createLogger("notify");

/**
 * Pluggable notification channel interface.
 * Implement this to add new notification targets (email, webhook, etc.)
 */
export interface NotifyChannel {
	name: string;
	send(text: string): Promise<void>;
}

/**
 * Telegram notification channel -- sends messages via bot.telegram.sendMessage.
 * Splits long messages using splitMessage from telegram.ts.
 * Swallows errors to avoid crashing the daemon on notification failure.
 */
export class TelegramChannel implements NotifyChannel {
	readonly name = "telegram";
	private readonly bot: Telegraf;
	private readonly chatId: string;

	constructor(opts: { bot: Telegraf; chatId: string }) {
		this.bot = opts.bot;
		this.chatId = opts.chatId;
	}

	async send(text: string): Promise<void> {
		const chunks = splitMessage(text);
		for (const chunk of chunks) {
			try {
				await this.bot.telegram.sendMessage(this.chatId, chunk);
			} catch (err) {
				log.error("notification_failed", {
					channel: "telegram",
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
	}
}

/**
 * Check if the current time falls within quiet hours (23:00-07:00) in the given timezone.
 * Uses Intl.DateTimeFormat to convert to the target timezone.
 */
export function isQuietHours(
	now: Date = new Date(),
	timezone = "Europe/Berlin",
): boolean {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "numeric",
		hour12: false,
	});
	const hour = Number(formatter.format(now));
	return hour >= 23 || hour < 7;
}

export interface SendNotificationOpts {
	urgent?: boolean;
	/** Override current time for testing */
	now?: Date;
	/** Override timezone for testing */
	timezone?: string;
}

/**
 * Send a notification to all registered channels.
 * Respects quiet hours for non-urgent messages.
 * Uses Promise.allSettled so one channel failure doesn't block others.
 */
export async function sendNotification(
	channels: NotifyChannel[],
	text: string,
	opts?: SendNotificationOpts,
): Promise<void> {
	if (channels.length === 0) return;

	if (!opts?.urgent && isQuietHours(opts?.now, opts?.timezone)) {
		log.info("notification_suppressed_quiet_hours", { text_preview: text.slice(0, 80) });
		return;
	}

	log.info("notification_sent", {
		channel: channels.map((ch) => ch.name).join(","),
		urgent: opts?.urgent ?? false,
		text_preview: text.slice(0, 80),
	});
	await Promise.allSettled(channels.map((ch) => ch.send(text)));
}
