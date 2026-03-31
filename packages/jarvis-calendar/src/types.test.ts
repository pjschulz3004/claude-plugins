import { describe, expect, it } from "vitest";
import {
	CalendarEventSchema,
	CalendarTodoSchema,
	CompleteTodoInputSchema,
	CreateEventInputSchema,
	ListEventsInputSchema,
	ListTodosInputSchema,
} from "./types.js";
import type { CalDAVConfig, CalendarEvent, CalendarTodo } from "./types.js";

describe("CalDAVConfig", () => {
	it("has serverUrl, username, password fields", () => {
		const config: CalDAVConfig = {
			serverUrl: "https://dav.mailbox.org/caldav/",
			username: "test@mailbox.org",
			password: "secret",
		};
		expect(config.serverUrl).toBe("https://dav.mailbox.org/caldav/");
		expect(config.username).toBe("test@mailbox.org");
		expect(config.password).toBe("secret");
	});
});

describe("CalendarEvent", () => {
	it("has id, summary, start, end, allDay, optional location/description", () => {
		const event: CalendarEvent = {
			id: "uid-123",
			summary: "Team meeting",
			start: "2026-03-31T10:00:00Z",
			end: "2026-03-31T11:00:00Z",
			location: "Room 42",
			description: "Weekly sync",
			allDay: false,
		};
		expect(event.id).toBe("uid-123");
		expect(event.summary).toBe("Team meeting");
		expect(event.allDay).toBe(false);
		expect(event.location).toBe("Room 42");
	});

	it("allows location and description to be undefined", () => {
		const event: CalendarEvent = {
			id: "uid-456",
			summary: "All day event",
			start: "2026-04-01",
			end: "2026-04-02",
			allDay: true,
		};
		expect(event.location).toBeUndefined();
		expect(event.description).toBeUndefined();
	});
});

describe("CalendarTodo", () => {
	it("has id, summary, completed, optional due/description/priority", () => {
		const todo: CalendarTodo = {
			id: "todo-1",
			summary: "Buy groceries",
			due: "2026-04-01T18:00:00Z",
			completed: false,
			description: "Milk, eggs, bread",
			priority: 1,
		};
		expect(todo.id).toBe("todo-1");
		expect(todo.completed).toBe(false);
		expect(todo.priority).toBe(1);
	});

	it("allows due, description, priority to be undefined", () => {
		const todo: CalendarTodo = {
			id: "todo-2",
			summary: "Quick task",
			completed: true,
		};
		expect(todo.due).toBeUndefined();
		expect(todo.description).toBeUndefined();
		expect(todo.priority).toBeUndefined();
	});
});

describe("CalendarEventSchema", () => {
	it("accepts valid event data", () => {
		const result = CalendarEventSchema.safeParse({
			id: "uid-1",
			summary: "Meeting",
			start: "2026-03-31T10:00:00Z",
			end: "2026-03-31T11:00:00Z",
			allDay: false,
		});
		expect(result.success).toBe(true);
	});

	it("accepts event with optional fields", () => {
		const result = CalendarEventSchema.safeParse({
			id: "uid-1",
			summary: "Meeting",
			start: "2026-03-31T10:00:00Z",
			end: "2026-03-31T11:00:00Z",
			location: "Room A",
			description: "Standup",
			allDay: false,
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing required fields", () => {
		const result = CalendarEventSchema.safeParse({
			id: "uid-1",
			summary: "Meeting",
		});
		expect(result.success).toBe(false);
	});

	it("rejects wrong type for allDay", () => {
		const result = CalendarEventSchema.safeParse({
			id: "uid-1",
			summary: "Meeting",
			start: "2026-03-31T10:00:00Z",
			end: "2026-03-31T11:00:00Z",
			allDay: "yes",
		});
		expect(result.success).toBe(false);
	});
});

describe("CalendarTodoSchema", () => {
	it("accepts valid todo data", () => {
		const result = CalendarTodoSchema.safeParse({
			id: "todo-1",
			summary: "Task",
			completed: false,
		});
		expect(result.success).toBe(true);
	});

	it("accepts todo with all fields", () => {
		const result = CalendarTodoSchema.safeParse({
			id: "todo-1",
			summary: "Task",
			due: "2026-04-01",
			completed: false,
			description: "Details",
			priority: 3,
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing summary", () => {
		const result = CalendarTodoSchema.safeParse({
			id: "todo-1",
			completed: false,
		});
		expect(result.success).toBe(false);
	});
});

describe("ListEventsInputSchema", () => {
	it("accepts startDate and endDate", () => {
		const result = ListEventsInputSchema.safeParse({
			startDate: "2026-03-31T00:00:00Z",
			endDate: "2026-04-01T00:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing dates", () => {
		expect(ListEventsInputSchema.safeParse({}).success).toBe(false);
		expect(
			ListEventsInputSchema.safeParse({ startDate: "2026-03-31" }).success,
		).toBe(false);
	});
});

describe("CreateEventInputSchema", () => {
	it("accepts required fields", () => {
		const result = CreateEventInputSchema.safeParse({
			summary: "New event",
			startDate: "2026-03-31T10:00:00Z",
			endDate: "2026-03-31T11:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("accepts optional location and description", () => {
		const result = CreateEventInputSchema.safeParse({
			summary: "New event",
			startDate: "2026-03-31T10:00:00Z",
			endDate: "2026-03-31T11:00:00Z",
			location: "Office",
			description: "Team meeting",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing summary", () => {
		const result = CreateEventInputSchema.safeParse({
			startDate: "2026-03-31T10:00:00Z",
			endDate: "2026-03-31T11:00:00Z",
		});
		expect(result.success).toBe(false);
	});
});

describe("CompleteTodoInputSchema", () => {
	it("accepts an id", () => {
		const result = CompleteTodoInputSchema.safeParse({ id: "todo-1" });
		expect(result.success).toBe(true);
	});

	it("rejects missing id", () => {
		const result = CompleteTodoInputSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe("ListTodosInputSchema", () => {
	it("accepts empty object", () => {
		const result = ListTodosInputSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});
