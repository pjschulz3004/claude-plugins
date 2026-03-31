import { DAVClient } from "tsdav";
import type { CalDAVConfig, CalendarEvent, CalendarTodo } from "./types.js";

const TRANSIENT_CODES = new Set([
	"ECONNRESET",
	"ETIMEDOUT",
	"ECONNREFUSED",
	"EPIPE",
	"EAI_AGAIN",
]);

function isTransientError(err: unknown): boolean {
	if (err instanceof Error) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code && TRANSIENT_CODES.has(code)) return true;
	}
	return false;
}

function isAuthError(err: unknown): boolean {
	if (err instanceof Error) {
		if (err.message.includes("Unauthorized") || err.message.includes("401")) return true;
		if ((err as Error & { status?: number }).status === 401) return true;
		if ((err as Error & { status?: number }).status === 403) return true;
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse iCalendar property, handling VALUE=DATE and other params
function parseICalProp(data: string, prop: string): string | undefined {
	// Match both "PROP:value" and "PROP;params:value"
	const regex = new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, "m");
	const match = data.match(regex);
	return match ? match[1].trim() : undefined;
}

// Parse iCalendar datetime to ISO string
// Handles: 20260331T100000Z, 20260331T100000, 20260401 (date only)
function parseICalDateTime(value: string): { iso: string; allDay: boolean } {
	// Date only (8 digits, no T)
	if (/^\d{8}$/.test(value)) {
		const year = value.slice(0, 4);
		const month = value.slice(4, 6);
		const day = value.slice(6, 8);
		return { iso: `${year}-${month}-${day}`, allDay: true };
	}

	// DateTime with Z (UTC)
	if (/^\d{8}T\d{6}Z$/.test(value)) {
		const year = value.slice(0, 4);
		const month = value.slice(4, 6);
		const day = value.slice(6, 8);
		const hour = value.slice(9, 11);
		const min = value.slice(11, 13);
		const sec = value.slice(13, 15);
		return {
			iso: `${year}-${month}-${day}T${hour}:${min}:${sec}Z`,
			allDay: false,
		};
	}

	// DateTime without Z (local time)
	if (/^\d{8}T\d{6}$/.test(value)) {
		const year = value.slice(0, 4);
		const month = value.slice(4, 6);
		const day = value.slice(6, 8);
		const hour = value.slice(9, 11);
		const min = value.slice(11, 13);
		const sec = value.slice(13, 15);
		return {
			iso: `${year}-${month}-${day}T${hour}:${min}:${sec}`,
			allDay: false,
		};
	}

	// Fallback: return as-is
	return { iso: value, allDay: false };
}

// Format ISO datetime to iCal format: 20260331T100000Z
function toICalDateTime(isoStr: string): string {
	return isoStr.replace(/[-:]/g, "").replace(".000", "");
}

// Extract a component block (VEVENT or VTODO) from iCal data
function extractComponent(data: string, component: string): string | undefined {
	const startTag = `BEGIN:${component}`;
	const endTag = `END:${component}`;
	const startIdx = data.indexOf(startTag);
	const endIdx = data.indexOf(endTag);
	if (startIdx === -1 || endIdx === -1) return undefined;
	return data.slice(startIdx, endIdx + endTag.length);
}

export interface CalendarBackend {
	listEvents(start: string, end: string): Promise<CalendarEvent[]>;
	listTodos(): Promise<CalendarTodo[]>;
	createEvent(
		summary: string,
		start: string,
		end: string,
		opts?: { location?: string; description?: string },
	): Promise<void>;
	completeTodo(id: string): Promise<void>;
}

export class TsdavCalendarBackend implements CalendarBackend {
	private config: CalDAVConfig;
	private retryDelayMs: number;

	constructor(config: CalDAVConfig, retryDelayMs = 1000) {
		this.config = config;
		this.retryDelayMs = retryDelayMs;
	}

	private async withConnection<T>(
		operation: (client: DAVClient) => Promise<T>,
	): Promise<T> {
		let lastError: Error | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			const client = new DAVClient({
				serverUrl: this.config.serverUrl,
				credentials: {
					username: this.config.username,
					password: this.config.password,
				},
				authMethod: "Basic",
				defaultAccountType: "caldav",
			});
			try {
				await client.login();
				return await operation(client);
			} catch (err) {
				lastError = err as Error;
				if (isAuthError(err)) throw err;
				if (!isTransientError(err)) throw err;
				if (attempt < 2) {
					await sleep(this.retryDelayMs * 2 ** attempt);
				}
			}
		}
		throw lastError;
	}

	async listEvents(start: string, end: string): Promise<CalendarEvent[]> {
		return this.withConnection(async (client) => {
			const calendars = await client.fetchCalendars();
			if (calendars.length === 0) return [];

			const events: CalendarEvent[] = [];
			for (const calendar of calendars) {
				const objects = await client.fetchCalendarObjects({
					calendar,
					timeRange: {
						start: start,
						end: end,
					},
				});

				for (const obj of objects) {
					const vevent = extractComponent(obj.data, "VEVENT");
					if (!vevent) continue;

					const uid = parseICalProp(vevent, "UID");
					const summary = parseICalProp(vevent, "SUMMARY");
					const dtstart = parseICalProp(vevent, "DTSTART");
					const dtend = parseICalProp(vevent, "DTEND");

					if (!uid || !summary || !dtstart || !dtend) continue;

					const startParsed = parseICalDateTime(dtstart);
					const endParsed = parseICalDateTime(dtend);

					events.push({
						id: uid,
						summary,
						start: startParsed.iso,
						end: endParsed.iso,
						location: parseICalProp(vevent, "LOCATION"),
						description: parseICalProp(vevent, "DESCRIPTION"),
						allDay: startParsed.allDay,
					});
				}
			}

			return events;
		});
	}

	async listTodos(): Promise<CalendarTodo[]> {
		return this.withConnection(async (client) => {
			const calendars = await client.fetchCalendars();
			if (calendars.length === 0) return [];

			const todos: CalendarTodo[] = [];
			for (const calendar of calendars) {
				const objects = await client.fetchCalendarObjects({
					calendar,
				});

				for (const obj of objects) {
					const vtodo = extractComponent(obj.data, "VTODO");
					if (!vtodo) continue;

					// Filter out completed todos
					const status = parseICalProp(vtodo, "STATUS");
					const completedProp = parseICalProp(vtodo, "COMPLETED");
					if (status === "COMPLETED" || completedProp) continue;

					const uid = parseICalProp(vtodo, "UID");
					const summary = parseICalProp(vtodo, "SUMMARY");
					if (!uid || !summary) continue;

					const dueProp = parseICalProp(vtodo, "DUE");
					const priorityProp = parseICalProp(vtodo, "PRIORITY");

					todos.push({
						id: uid,
						summary,
						due: dueProp
							? parseICalDateTime(dueProp).iso
							: undefined,
						completed: false,
						description: parseICalProp(vtodo, "DESCRIPTION"),
						priority: priorityProp
							? Number.parseInt(priorityProp, 10)
							: undefined,
					});
				}
			}

			return todos;
		});
	}

	async createEvent(
		summary: string,
		start: string,
		end: string,
		opts?: { location?: string; description?: string },
	): Promise<void> {
		return this.withConnection(async (client) => {
			const calendars = await client.fetchCalendars();
			if (calendars.length === 0) {
				throw new Error("No calendars found");
			}

			const uid = crypto.randomUUID();
			const dtstart = toICalDateTime(start);
			const dtend = toICalDateTime(end);

			const lines = [
				"BEGIN:VCALENDAR",
				"VERSION:2.0",
				"PRODID:-//Jarvis//Calendar//EN",
				"BEGIN:VEVENT",
				`UID:${uid}`,
				`SUMMARY:${summary}`,
				`DTSTART:${dtstart}`,
				`DTEND:${dtend}`,
			];

			if (opts?.location) {
				lines.push(`LOCATION:${opts.location}`);
			}
			if (opts?.description) {
				lines.push(`DESCRIPTION:${opts.description}`);
			}

			lines.push("END:VEVENT", "END:VCALENDAR");

			await client.createCalendarObject({
				calendar: calendars[0],
				filename: `${uid}.ics`,
				iCalString: lines.join("\r\n"),
				data: lines.join("\r\n"),
			});
		});
	}

	async completeTodo(id: string): Promise<void> {
		return this.withConnection(async (client) => {
			const calendars = await client.fetchCalendars();
			if (calendars.length === 0) {
				throw new Error("No calendars found");
			}

			// Find the todo object
			let foundObj: { url: string; etag: string; data: string } | undefined;
			for (const calendar of calendars) {
				const objects = await client.fetchCalendarObjects({ calendar });
				for (const obj of objects) {
					const vtodo = extractComponent(obj.data, "VTODO");
					if (!vtodo) continue;
					const uid = parseICalProp(vtodo, "UID");
					if (uid === id) {
						foundObj = obj;
						break;
					}
				}
				if (foundObj) break;
			}

			if (!foundObj) {
				throw new Error(`Todo with id '${id}' not found`);
			}

			// Update the VTODO: add STATUS:COMPLETED and COMPLETED:timestamp
			const now = new Date()
				.toISOString()
				.replace(/[-:]/g, "")
				.replace(/\.\d{3}/, "");

			let updatedData = foundObj.data;
			// Add STATUS:COMPLETED before END:VTODO
			updatedData = updatedData.replace(
				"END:VTODO",
				`STATUS:COMPLETED\r\nCOMPLETED:${now}\r\nEND:VTODO`,
			);

			await client.updateCalendarObject({
				calendarObject: {
					url: foundObj.url,
					etag: foundObj.etag,
					data: updatedData,
				},
				url: foundObj.url,
				etag: foundObj.etag,
				data: updatedData,
			});
		});
	}
}
