import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { CalDAVConfig } from "./types.js";

// Controllable mock behavior
let mockBehavior: {
	loginFn: () => Promise<void>;
	fetchCalendarsFn: () => Promise<
		Array<{ url: string; displayName?: string }>
	>;
	fetchCalendarObjectsFn: () => Promise<
		Array<{ url: string; etag: string; data: string }>
	>;
	createCalendarObjectFn: () => Promise<void>;
	updateCalendarObjectFn: () => Promise<void>;
};

let mockInstances: Array<{
	login: Mock;
	fetchCalendars: Mock;
	fetchCalendarObjects: Mock;
	createCalendarObject: Mock;
	updateCalendarObject: Mock;
}>;

function resetMockBehavior() {
	mockBehavior = {
		loginFn: async () => {},
		fetchCalendarsFn: async () => [
			{ url: "/caldav/calendars/default/", displayName: "Default" },
		],
		fetchCalendarObjectsFn: async () => [],
		createCalendarObjectFn: async () => {},
		updateCalendarObjectFn: async () => {},
	};
}

// Mock tsdav module
vi.mock("tsdav", () => {
	class MockDAVClient {
		login: Mock;
		fetchCalendars: Mock;
		fetchCalendarObjects: Mock;
		createCalendarObject: Mock;
		updateCalendarObject: Mock;

		constructor() {
			this.login = vi.fn().mockImplementation(() => mockBehavior.loginFn());
			this.fetchCalendars = vi
				.fn()
				.mockImplementation(() => mockBehavior.fetchCalendarsFn());
			this.fetchCalendarObjects = vi
				.fn()
				.mockImplementation(() => mockBehavior.fetchCalendarObjectsFn());
			this.createCalendarObject = vi
				.fn()
				.mockImplementation(() => mockBehavior.createCalendarObjectFn());
			this.updateCalendarObject = vi
				.fn()
				.mockImplementation(() => mockBehavior.updateCalendarObjectFn());
			mockInstances.push(this);
		}
	}
	return { DAVClient: MockDAVClient };
});

// Import after mocking
const { TsdavCalendarBackend } = await import("./backend.js");

const testConfig: CalDAVConfig = {
	serverUrl: "https://dav.mailbox.org/caldav/",
	username: "test@mailbox.org",
	password: "secret",
};

describe("TsdavCalendarBackend", () => {
	let backend: InstanceType<typeof TsdavCalendarBackend>;

	beforeEach(() => {
		mockInstances = [];
		resetMockBehavior();
		vi.clearAllMocks();
		backend = new TsdavCalendarBackend(testConfig, 0); // 0ms retry delay for tests
	});

	describe("listEvents", () => {
		it("creates connection, fetches calendars and objects, parses VEVENT", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [
				{
					url: "/caldav/calendars/default/event1.ics",
					etag: '"etag1"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VEVENT",
						"UID:event-uid-1",
						"SUMMARY:Team Meeting",
						"DTSTART:20260331T100000Z",
						"DTEND:20260331T110000Z",
						"LOCATION:Room 42",
						"DESCRIPTION:Weekly sync",
						"END:VEVENT",
						"END:VCALENDAR",
					].join("\r\n"),
				},
			];

			const events = await backend.listEvents(
				"2026-03-31T00:00:00Z",
				"2026-04-01T00:00:00Z",
			);

			expect(mockInstances).toHaveLength(1);
			expect(mockInstances[0].login).toHaveBeenCalledOnce();
			expect(events).toHaveLength(1);
			expect(events[0].id).toBe("event-uid-1");
			expect(events[0].summary).toBe("Team Meeting");
			expect(events[0].start).toBe("2026-03-31T10:00:00Z");
			expect(events[0].end).toBe("2026-03-31T11:00:00Z");
			expect(events[0].location).toBe("Room 42");
			expect(events[0].description).toBe("Weekly sync");
			expect(events[0].allDay).toBe(false);
		});

		it("handles all-day events (DATE format without time)", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [
				{
					url: "/caldav/calendars/default/allday.ics",
					etag: '"etag2"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VEVENT",
						"UID:allday-uid",
						"SUMMARY:Holiday",
						"DTSTART;VALUE=DATE:20260401",
						"DTEND;VALUE=DATE:20260402",
						"END:VEVENT",
						"END:VCALENDAR",
					].join("\r\n"),
				},
			];

			const events = await backend.listEvents(
				"2026-04-01T00:00:00Z",
				"2026-04-02T00:00:00Z",
			);

			expect(events).toHaveLength(1);
			expect(events[0].id).toBe("allday-uid");
			expect(events[0].summary).toBe("Holiday");
			expect(events[0].allDay).toBe(true);
			expect(events[0].start).toBe("2026-04-01");
			expect(events[0].end).toBe("2026-04-02");
		});

		it("returns empty array when no events found", async () => {
			const events = await backend.listEvents(
				"2026-03-31T00:00:00Z",
				"2026-04-01T00:00:00Z",
			);
			expect(events).toEqual([]);
		});
	});

	describe("listTodos", () => {
		it("returns pending (non-completed) todos", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [
				{
					url: "/caldav/calendars/default/todo1.ics",
					etag: '"etag3"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VTODO",
						"UID:todo-uid-1",
						"SUMMARY:Buy groceries",
						"DUE:20260401T180000Z",
						"PRIORITY:1",
						"DESCRIPTION:Milk and eggs",
						"END:VTODO",
						"END:VCALENDAR",
					].join("\r\n"),
				},
				{
					url: "/caldav/calendars/default/todo2.ics",
					etag: '"etag4"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VTODO",
						"UID:todo-uid-2",
						"SUMMARY:Completed task",
						"STATUS:COMPLETED",
						"COMPLETED:20260330T120000Z",
						"END:VTODO",
						"END:VCALENDAR",
					].join("\r\n"),
				},
			];

			const todos = await backend.listTodos();

			expect(todos).toHaveLength(1);
			expect(todos[0].id).toBe("todo-uid-1");
			expect(todos[0].summary).toBe("Buy groceries");
			expect(todos[0].due).toBe("2026-04-01T18:00:00Z");
			expect(todos[0].completed).toBe(false);
			expect(todos[0].description).toBe("Milk and eggs");
			expect(todos[0].priority).toBe(1);
		});

		it("filters out todos with COMPLETED property", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [
				{
					url: "/caldav/calendars/default/todo-done.ics",
					etag: '"etag5"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VTODO",
						"UID:todo-done",
						"SUMMARY:Done task",
						"COMPLETED:20260330T120000Z",
						"END:VTODO",
						"END:VCALENDAR",
					].join("\r\n"),
				},
			];

			const todos = await backend.listTodos();
			expect(todos).toEqual([]);
		});
	});

	describe("createEvent", () => {
		it("builds valid iCal VEVENT and calls createCalendarObject", async () => {
			await backend.createEvent(
				"New Meeting",
				"2026-03-31T10:00:00Z",
				"2026-03-31T11:00:00Z",
				{ location: "Office", description: "Standup" },
			);

			const inst = mockInstances[0];
			expect(inst.login).toHaveBeenCalledOnce();
			expect(inst.createCalendarObject).toHaveBeenCalledOnce();

			const callArgs = inst.createCalendarObject.mock.calls[0][0];
			expect(callArgs.data).toContain("BEGIN:VCALENDAR");
			expect(callArgs.data).toContain("BEGIN:VEVENT");
			expect(callArgs.data).toContain("SUMMARY:New Meeting");
			expect(callArgs.data).toContain("DTSTART:20260331T100000Z");
			expect(callArgs.data).toContain("DTEND:20260331T110000Z");
			expect(callArgs.data).toContain("LOCATION:Office");
			expect(callArgs.data).toContain("DESCRIPTION:Standup");
			expect(callArgs.data).toContain("END:VEVENT");
			expect(callArgs.data).toContain("END:VCALENDAR");
			// Should have a UID
			expect(callArgs.data).toMatch(/UID:.+/);
		});

		it("creates event without optional fields", async () => {
			await backend.createEvent(
				"Simple Event",
				"2026-03-31T14:00:00Z",
				"2026-03-31T15:00:00Z",
			);

			const inst = mockInstances[0];
			const callArgs = inst.createCalendarObject.mock.calls[0][0];
			expect(callArgs.data).toContain("SUMMARY:Simple Event");
			expect(callArgs.data).not.toContain("LOCATION:");
			expect(callArgs.data).not.toContain("DESCRIPTION:");
		});
	});

	describe("completeTodo", () => {
		it("fetches todo, updates STATUS and COMPLETED, calls updateCalendarObject", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [
				{
					url: "/caldav/calendars/default/todo1.ics",
					etag: '"etag-todo1"',
					data: [
						"BEGIN:VCALENDAR",
						"BEGIN:VTODO",
						"UID:todo-uid-1",
						"SUMMARY:Buy groceries",
						"END:VTODO",
						"END:VCALENDAR",
					].join("\r\n"),
				},
			];

			await backend.completeTodo("todo-uid-1");

			const inst = mockInstances[0];
			expect(inst.login).toHaveBeenCalledOnce();
			expect(inst.updateCalendarObject).toHaveBeenCalledOnce();

			const callArgs = inst.updateCalendarObject.mock.calls[0][0];
			expect(callArgs.data).toContain("STATUS:COMPLETED");
			expect(callArgs.data).toMatch(/COMPLETED:\d{8}T\d{6}Z/);
			expect(callArgs.url).toBe("/caldav/calendars/default/todo1.ics");
			expect(callArgs.etag).toBe('"etag-todo1"');
		});

		it("throws when todo not found", async () => {
			mockBehavior.fetchCalendarObjectsFn = async () => [];

			await expect(backend.completeTodo("nonexistent")).rejects.toThrow(
				/not found/i,
			);
		});
	});

	describe("retry logic", () => {
		it("retries on transient error (ECONNRESET) up to 3 times", async () => {
			let loginCallCount = 0;
			mockBehavior.loginFn = async () => {
				loginCallCount++;
				if (loginCallCount <= 2) {
					const err = new Error("Connection reset");
					(err as NodeJS.ErrnoException).code = "ECONNRESET";
					throw err;
				}
			};

			const events = await backend.listEvents(
				"2026-03-31T00:00:00Z",
				"2026-04-01T00:00:00Z",
			);
			expect(events).toEqual([]);
			// 3 DAVClient instances created (one per attempt)
			expect(mockInstances).toHaveLength(3);
		});

		it("does NOT retry auth errors", async () => {
			mockBehavior.loginFn = async () => {
				const err = new Error("Unauthorized");
				(err as NodeJS.ErrnoException).code = "ERR_BAD_RESPONSE";
				(err as Error & { status?: number }).status = 401;
				throw err;
			};

			await expect(
				backend.listEvents(
					"2026-03-31T00:00:00Z",
					"2026-04-01T00:00:00Z",
				),
			).rejects.toThrow("Unauthorized");
			// Only 1 attempt, no retries
			expect(mockInstances).toHaveLength(1);
		});

		it("throws last error after 3 failed attempts", async () => {
			mockBehavior.loginFn = async () => {
				const err = new Error("Connection timeout");
				(err as NodeJS.ErrnoException).code = "ETIMEDOUT";
				throw err;
			};

			await expect(
				backend.listEvents(
					"2026-03-31T00:00:00Z",
					"2026-04-01T00:00:00Z",
				),
			).rejects.toThrow("Connection timeout");
			expect(mockInstances).toHaveLength(3);
		});
	});
});
