import { createLogger } from "./logger.js";

const log = createLogger("situation");

export interface Situation {
	timestamp: string;
	location?: string;
	locationSource?: string;
	currentActivity?: string;
	nextEvent?: string;
	timeUntilNext?: string;
	unreadCount: number;
	flaggedCount: number;
	pendingTodos: number;
	overdueTodos: number;
	budgetAlerts: string[];
	dayContext: string;
}

export interface SituationBackends {
	calendar?: {
		listEvents(start: string, end: string): Promise<Array<{
			summary: string;
			start: string;
			end: string;
			location?: string;
			allDay: boolean;
		}>>;
		listTodos(): Promise<Array<{
			summary: string;
			due?: string;
			completed: boolean;
		}>>;
	};
	email?: {
		listUnread(limit?: number): Promise<Array<unknown>>;
		search(query: { flagged: boolean }): Promise<Array<unknown>>;
	};
	budget?: {
		getCategories(): Promise<Array<{
			name: string;
			groupName: string;
			budgeted: number;
			activity: number;
			balance: number;
		}>>;
	};
	/** Default location when no calendar event specifies one (e.g. home address). */
	defaultLocation?: string;
}

export class SituationCollector {
	constructor(private readonly backends: SituationBackends) {}

	async collect(): Promise<Situation | null> {
		const now = new Date();
		const nowISO = now.toISOString();
		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);
		const todayEnd = new Date(now);
		todayEnd.setHours(23, 59, 59, 999);
		const todayStr = now.toISOString().slice(0, 10);

		let hasAnyData = false;

		let location: string | undefined;
		let locationSource: string | undefined;
		let currentActivity: string | undefined;
		let nextEvent: string | undefined;
		let timeUntilNext: string | undefined;
		let pendingTodos = 0;
		let overdueTodos = 0;

		if (this.backends.calendar) {
			try {
				const events = await this.backends.calendar.listEvents(
					todayStart.toISOString(),
					todayEnd.toISOString(),
				);
				hasAnyData = true;

				const sorted = events
					.filter((e) => !e.allDay)
					.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

				const current = sorted.find(
					(e) => new Date(e.start) <= now && new Date(e.end) > now,
				);
				if (current) {
					const endTime = new Date(current.end).toLocaleTimeString("en-GB", {
						timeZone: "Europe/Berlin",
						hour: "2-digit",
						minute: "2-digit",
					});
					currentActivity = `${current.summary} until ${endTime}`;
					if (current.location) {
						location = current.location;
						locationSource = current.summary;
					}
				}

				const upcoming = sorted.find((e) => new Date(e.start) > now);
				if (upcoming) {
					const startTime = new Date(upcoming.start).toLocaleTimeString("en-GB", {
						timeZone: "Europe/Berlin",
						hour: "2-digit",
						minute: "2-digit",
					});
					nextEvent = `${upcoming.summary} at ${startTime}`;
					const diffMs = new Date(upcoming.start).getTime() - now.getTime();
					const hours = Math.floor(diffMs / (60 * 60 * 1000));
					const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
					timeUntilNext = `${hours}h ${minutes}m`;
				}
			} catch (err) {
				log.warn("situation_calendar_failed", { error: (err as Error).message });
			}

			try {
				const todos = await this.backends.calendar.listTodos();
				hasAnyData = true;
				const pending = todos.filter((t) => !t.completed);
				pendingTodos = pending.length;
				overdueTodos = pending.filter(
					(t) => t.due && t.due.slice(0, 10) < todayStr,
				).length;
			} catch (err) {
				log.warn("situation_todos_failed", { error: (err as Error).message });
			}
		}

		let unreadCount = 0;
		let flaggedCount = 0;

		if (this.backends.email) {
			try {
				const unread = await this.backends.email.listUnread(100);
				unreadCount = unread.length;
				hasAnyData = true;
			} catch (err) {
				log.warn("situation_email_failed", { error: (err as Error).message });
			}

			try {
				const flagged = await this.backends.email.search({ flagged: true });
				flaggedCount = flagged.length;
			} catch (err) {
				log.warn("situation_flagged_failed", { error: (err as Error).message });
			}
		}

		const budgetAlerts: string[] = [];

		if (this.backends.budget) {
			try {
				const categories = await this.backends.budget.getCategories();
				hasAnyData = true;
				for (const cat of categories) {
					if (cat.balance < 0 && cat.budgeted > 0) {
						budgetAlerts.push(
							`${cat.name} overspent by $${Math.abs(cat.balance).toFixed(2)}`,
						);
					}
				}
			} catch (err) {
				log.warn("situation_budget_failed", { error: (err as Error).message });
			}
		}

		// Default location when calendar is unavailable or has no location data
		if (!location && this.backends.defaultLocation) {
			location = this.backends.defaultLocation;
			locationSource = "home";
		}

		if (!hasAnyData) return null;

		const dayName = now.toLocaleDateString("en-GB", {
			timeZone: "Europe/Berlin",
			weekday: "long",
		});

		const parts: string[] = [dayName];
		if (currentActivity) parts.push("workday");
		if (location) parts.push("at " + location.split(",")[0]);

		return {
			timestamp: nowISO,
			location,
			locationSource,
			currentActivity,
			nextEvent,
			timeUntilNext,
			unreadCount,
			flaggedCount,
			pendingTodos,
			overdueTodos,
			budgetAlerts,
			dayContext: parts.join(", "),
		};
	}

	static format(situation: Situation): string {
		const lines: string[] = ["[Situation]"];
		lines.push(situation.dayContext);

		if (situation.location) {
			lines.push(`Location: ${situation.location}`);
		}
		if (situation.currentActivity) {
			lines.push(`Now: ${situation.currentActivity}`);
		}
		if (situation.nextEvent) {
			const suffix = situation.timeUntilNext ? ` (in ${situation.timeUntilNext})` : "";
			lines.push(`Next: ${situation.nextEvent}${suffix}`);
		}

		const inbox: string[] = [];
		if (situation.unreadCount > 0) inbox.push(`${situation.unreadCount} unread`);
		if (situation.flaggedCount > 0) inbox.push(`${situation.flaggedCount} flagged`);
		if (inbox.length > 0) lines.push(`Inbox: ${inbox.join(", ")}`);

		const tasks: string[] = [];
		if (situation.pendingTodos > 0) tasks.push(`${situation.pendingTodos} pending todos`);
		if (situation.overdueTodos > 0) tasks.push(`${situation.overdueTodos} overdue`);
		if (tasks.length > 0) lines.push(`Tasks: ${tasks.join(", ")}`);

		if (situation.budgetAlerts.length > 0) {
			lines.push(`Budget: ${situation.budgetAlerts.join("; ")}`);
		}

		return lines.join("\n") + "\n";
	}
}
