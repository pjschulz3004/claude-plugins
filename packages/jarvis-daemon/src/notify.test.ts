import { describe, it, expect, vi } from "vitest";
import {
	isQuietHours,
	sendNotification,
	TelegramChannel,
	type NotifyChannel,
} from "./notify.js";

// --- isQuietHours tests ---

describe("isQuietHours", () => {
	it("returns true at 23:30 Europe/Berlin", () => {
		// 2026-03-31T23:30 CEST = 2026-03-31T21:30 UTC (CEST = UTC+2)
		const date = new Date("2026-03-31T21:30:00Z");
		expect(isQuietHours(date, "Europe/Berlin")).toBe(true);
	});

	it("returns true at 06:59 Europe/Berlin", () => {
		// 2026-03-31T06:59 CEST = 2026-03-31T04:59 UTC
		const date = new Date("2026-03-31T04:59:00Z");
		expect(isQuietHours(date, "Europe/Berlin")).toBe(true);
	});

	it("returns false at 07:00 Europe/Berlin", () => {
		// 2026-03-31T07:00 CEST = 2026-03-31T05:00 UTC
		const date = new Date("2026-03-31T05:00:00Z");
		expect(isQuietHours(date, "Europe/Berlin")).toBe(false);
	});

	it("returns false at 22:59 Europe/Berlin", () => {
		// 2026-03-31T22:59 CEST = 2026-03-31T20:59 UTC
		const date = new Date("2026-03-31T20:59:00Z");
		expect(isQuietHours(date, "Europe/Berlin")).toBe(false);
	});

	it("returns true at midnight Europe/Berlin", () => {
		// 2026-03-31T00:00 CEST = 2026-03-30T22:00 UTC
		const date = new Date("2026-03-30T22:00:00Z");
		expect(isQuietHours(date, "Europe/Berlin")).toBe(true);
	});
});

// --- sendNotification tests ---

describe("sendNotification", () => {
	function makeMockChannel(): NotifyChannel & { calls: string[] } {
		const calls: string[] = [];
		return {
			name: "mock",
			calls,
			async send(text: string) {
				calls.push(text);
			},
		};
	}

	it("suppresses non-urgent during quiet hours", async () => {
		const ch = makeMockChannel();
		// 23:30 Berlin = quiet
		const now = new Date("2026-03-31T21:30:00Z");
		await sendNotification([ch], "hello", { urgent: false, now, timezone: "Europe/Berlin" });
		expect(ch.calls).toHaveLength(0);
	});

	it("allows urgent during quiet hours", async () => {
		const ch = makeMockChannel();
		const now = new Date("2026-03-31T21:30:00Z");
		await sendNotification([ch], "urgent!", { urgent: true, now, timezone: "Europe/Berlin" });
		expect(ch.calls).toEqual(["urgent!"]);
	});

	it("sends non-urgent outside quiet hours", async () => {
		const ch = makeMockChannel();
		// 12:00 Berlin = not quiet
		const now = new Date("2026-03-31T10:00:00Z");
		await sendNotification([ch], "update", { urgent: false, now, timezone: "Europe/Berlin" });
		expect(ch.calls).toEqual(["update"]);
	});

	it("is a no-op with empty channels array", async () => {
		// Should not throw
		await sendNotification([], "hello", { now: new Date("2026-03-31T10:00:00Z"), timezone: "Europe/Berlin" });
	});

	it("sends to multiple channels", async () => {
		const ch1 = makeMockChannel();
		const ch2 = makeMockChannel();
		const now = new Date("2026-03-31T10:00:00Z");
		await sendNotification([ch1, ch2], "multi", { now, timezone: "Europe/Berlin" });
		expect(ch1.calls).toEqual(["multi"]);
		expect(ch2.calls).toEqual(["multi"]);
	});

	it("does not fail if one channel throws", async () => {
		const ch1: NotifyChannel = {
			name: "broken",
			async send() {
				throw new Error("boom");
			},
		};
		const ch2 = makeMockChannel();
		const now = new Date("2026-03-31T10:00:00Z");
		await sendNotification([ch1, ch2], "test", { now, timezone: "Europe/Berlin" });
		expect(ch2.calls).toEqual(["test"]);
	});
});

// --- TelegramChannel tests ---

describe("TelegramChannel", () => {
	it("sends message chunks via bot.telegram.sendMessage", async () => {
		const sent: { chatId: string; text: string }[] = [];
		const mockBot = {
			telegram: {
				sendMessage: vi.fn(async (chatId: string, text: string) => {
					sent.push({ chatId, text });
				}),
			},
		} as any;

		const channel = new TelegramChannel({ bot: mockBot, chatId: "123" });
		expect(channel.name).toBe("telegram");

		await channel.send("short message");
		expect(sent).toEqual([{ chatId: "123", text: "short message" }]);
	});

	it("splits long messages before sending", async () => {
		const sent: string[] = [];
		const mockBot = {
			telegram: {
				sendMessage: vi.fn(async (_chatId: string, text: string) => {
					sent.push(text);
				}),
			},
		} as any;

		const channel = new TelegramChannel({ bot: mockBot, chatId: "456" });
		// Create a message longer than 4000 chars
		const longMsg = "A".repeat(5000);
		await channel.send(longMsg);
		expect(sent.length).toBeGreaterThan(1);
	});

	it("does not throw if sendMessage fails", async () => {
		const mockBot = {
			telegram: {
				sendMessage: vi.fn(async () => {
					throw new Error("Telegram API error");
				}),
			},
		} as any;

		const channel = new TelegramChannel({ bot: mockBot, chatId: "789" });
		// Should not throw
		await channel.send("test");
	});
});
