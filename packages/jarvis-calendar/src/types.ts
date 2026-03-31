import { z } from "zod";

// CalDAV connection configuration
export interface CalDAVConfig {
	serverUrl: string;
	username: string;
	password: string;
}

// Calendar event
export interface CalendarEvent {
	id: string;
	summary: string;
	start: string; // ISO 8601
	end: string; // ISO 8601
	location?: string;
	description?: string;
	allDay: boolean;
}

// Calendar todo (VTODO)
export interface CalendarTodo {
	id: string;
	summary: string;
	due?: string; // ISO 8601
	completed: boolean;
	description?: string;
	priority?: number;
}

// Zod schemas for MCP tool input validation

export const CalendarEventSchema = z.object({
	id: z.string(),
	summary: z.string(),
	start: z.string(),
	end: z.string(),
	location: z.string().optional(),
	description: z.string().optional(),
	allDay: z.boolean(),
});

export const CalendarTodoSchema = z.object({
	id: z.string(),
	summary: z.string(),
	due: z.string().optional(),
	completed: z.boolean(),
	description: z.string().optional(),
	priority: z.number().optional(),
});

export const ListEventsInputSchema = z.object({
	startDate: z.string().describe("Start of date range (ISO 8601)"),
	endDate: z.string().describe("End of date range (ISO 8601)"),
});

export const CreateEventInputSchema = z.object({
	summary: z.string().describe("Event title"),
	startDate: z.string().describe("Event start (ISO 8601)"),
	endDate: z.string().describe("Event end (ISO 8601)"),
	location: z.string().optional().describe("Event location"),
	description: z.string().optional().describe("Event description"),
});

export const CompleteTodoInputSchema = z.object({
	id: z.string().describe("Todo UID to mark as completed"),
});

export const ListTodosInputSchema = z.object({});
