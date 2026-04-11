import { describe, it, expect, vi } from "vitest";
import { SituationCollector, type Situation } from "./situation.js";

function mockCalendar(events: Array<{ summary: string; start: string; end: string; location?: string; allDay: boolean }> = [], todos: Array<{ summary: string; due?: string; completed: boolean }> = []) {
	return {
		listEvents: vi.fn().mockResolvedValue(events),
		listTodos: vi.fn().mockResolvedValue(todos),
	};
}

function mockEmail(unreadCount = 0, flaggedCount = 0) {
	return {
		listUnread: vi.fn().mockResolvedValue(Array(unreadCount).fill({})),
		search: vi.fn().mockResolvedValue(Array(flaggedCount).fill({})),
	};
}

function mockBudget(categories: Array<{ name: string; groupName: string; budgeted: number; activity: number; balance: number }> = []) {
	return {
		getCategories: vi.fn().mockResolvedValue(categories),
	};
}

describe("SituationCollector.collect", () => {
	it("returns situation with all backends available", async () => {
		const now = new Date();
		const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
		const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

		const collector = new SituationCollector({
			calendar: mockCalendar(
				[
					{ summary: "Team standup", start: now.toISOString(), end: inOneHour.toISOString(), location: "Office Berlin", allDay: false },
					{ summary: "Lunch with Max", start: inOneHour.toISOString(), end: inTwoHours.toISOString(), allDay: false },
				],
				[
					{ summary: "File taxes", due: "2026-04-01", completed: false },
					{ summary: "Buy groceries", completed: false },
					{ summary: "Done task", completed: true },
				],
			),
			email: mockEmail(5, 2),
			budget: mockBudget([
				{ name: "Groceries", groupName: "Needs", budgeted: 200, activity: -250, balance: -50 },
				{ name: "Rent", groupName: "Needs", budgeted: 800, activity: -800, balance: 0 },
			]),
		});

		const result = await collector.collect();

		expect(result).not.toBeNull();
		expect(result!.location).toBe("Office Berlin");
		expect(result!.locationSource).toContain("Team standup");
		expect(result!.currentActivity).toContain("Team standup");
		expect(result!.nextEvent).toContain("Lunch with Max");
		expect(result!.unreadCount).toBe(5);
		expect(result!.flaggedCount).toBe(2);
		expect(result!.pendingTodos).toBe(2);
		expect(result!.overdueTodos).toBe(1);
		expect(result!.budgetAlerts).toContain("Groceries overspent by $50.00");
	});

	it("infers location from current event with location", async () => {
		const now = new Date();
		const later = new Date(now.getTime() + 60 * 60 * 1000);

		const collector = new SituationCollector({
			calendar: mockCalendar([
				{ summary: "Client meeting", start: now.toISOString(), end: later.toISOString(), location: "Munich, TechCo HQ", allDay: false },
			]),
		});

		const result = await collector.collect();
		expect(result!.location).toBe("Munich, TechCo HQ");
		expect(result!.locationSource).toContain("Client meeting");
	});

	it("omits location when no current event has location", async () => {
		const now = new Date();
		const later = new Date(now.getTime() + 60 * 60 * 1000);

		const collector = new SituationCollector({
			calendar: mockCalendar([
				{ summary: "Focus time", start: now.toISOString(), end: later.toISOString(), allDay: false },
			]),
		});

		const result = await collector.collect();
		expect(result!.location).toBeUndefined();
	});

	it("works with only email backend", async () => {
		const collector = new SituationCollector({
			email: mockEmail(3, 1),
		});

		const result = await collector.collect();
		expect(result).not.toBeNull();
		expect(result!.unreadCount).toBe(3);
		expect(result!.flaggedCount).toBe(1);
		expect(result!.pendingTodos).toBe(0);
		expect(result!.budgetAlerts).toEqual([]);
	});

	it("returns null when no backends available", async () => {
		const collector = new SituationCollector({});
		const result = await collector.collect();
		expect(result).toBeNull();
	});

	it("handles calendar backend failure gracefully", async () => {
		const calendar = mockCalendar();
		calendar.listEvents.mockRejectedValue(new Error("CalDAV timeout"));

		const collector = new SituationCollector({
			calendar,
			email: mockEmail(2, 0),
		});

		const result = await collector.collect();
		expect(result).not.toBeNull();
		expect(result!.unreadCount).toBe(2);
		expect(result!.pendingTodos).toBe(0);
	});

	it("identifies overdue todos by comparing due date to today", async () => {
		const collector = new SituationCollector({
			calendar: mockCalendar([], [
				{ summary: "Past due", due: "2020-01-01", completed: false },
				{ summary: "Future due", due: "2099-12-31", completed: false },
				{ summary: "No due", completed: false },
			]),
		});

		const result = await collector.collect();
		expect(result!.overdueTodos).toBe(1);
		expect(result!.pendingTodos).toBe(3);
	});

	it("calculates timeUntilNext for upcoming events", async () => {
		const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);

		const collector = new SituationCollector({
			calendar: mockCalendar([
				{ summary: "Later meeting", start: inTwoHours.toISOString(), end: inTwoHours.toISOString(), allDay: false },
			]),
		});

		const result = await collector.collect();
		expect(result!.timeUntilNext).toMatch(/1h \d+m|2h 0m/);
	});
});

describe("SituationCollector.format", () => {
	it("formats a full situation as compact text", () => {
		const situation: Situation = {
			timestamp: "2026-04-10T14:30:00+02:00",
			location: "Munich",
			locationSource: "Client meeting at TechCo",
			currentActivity: "Client meeting at TechCo until 16:00",
			nextEvent: "Train back to Berlin at 18:15",
			timeUntilNext: "1h 45m",
			unreadCount: 5,
			flaggedCount: 2,
			pendingTodos: 4,
			overdueTodos: 1,
			budgetAlerts: ["Groceries overspent by $50.00"],
			dayContext: "Thursday, workday",
		};

		const text = SituationCollector.format(situation);
		expect(text).toContain("[Situation]");
		expect(text).toContain("Munich");
		expect(text).toContain("Client meeting");
		expect(text).toContain("Train back");
		expect(text).toContain("5 unread");
		expect(text).toContain("2 flagged");
		expect(text).toContain("4 pending todos");
		expect(text).toContain("1 overdue");
		expect(text).toContain("Groceries overspent");
	});

	it("omits absent fields gracefully", () => {
		const situation: Situation = {
			timestamp: "2026-04-10T14:30:00+02:00",
			unreadCount: 0,
			flaggedCount: 0,
			pendingTodos: 0,
			overdueTodos: 0,
			budgetAlerts: [],
			dayContext: "Thursday, quiet day",
		};

		const text = SituationCollector.format(situation);
		expect(text).toContain("[Situation]");
		expect(text).not.toContain("Location");
		expect(text).not.toContain("Now:");
		expect(text).not.toContain("Next:");
		expect(text).not.toContain("Budget:");
		expect(text).toContain("quiet day");
	});

	it("stays under ~200 tokens (roughly 800 chars)", () => {
		const situation: Situation = {
			timestamp: "2026-04-10T14:30:00+02:00",
			location: "Munich",
			locationSource: "Client meeting at TechCo",
			currentActivity: "Client meeting at TechCo until 16:00",
			nextEvent: "Train back to Berlin at 18:15",
			timeUntilNext: "1h 45m",
			unreadCount: 12,
			flaggedCount: 3,
			pendingTodos: 8,
			overdueTodos: 2,
			budgetAlerts: ["Groceries overspent by $50.00", "Entertainment overspent by $30.00"],
			dayContext: "Thursday, workday, traveling",
		};

		const text = SituationCollector.format(situation);
		expect(text.length).toBeLessThan(800);
	});
});
