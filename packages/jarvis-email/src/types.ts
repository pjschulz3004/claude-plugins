import { z } from "zod";

// IMAP connection configuration
export interface IMAPConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
}

// Email sender info
export interface EmailAddress {
	name: string;
	address: string;
}

// Summary of a single email message
export interface EmailSummary {
	uid: string;
	from: EmailAddress;
	subject: string;
	date: string; // ISO 8601
	flags: string[];
	folder: string;
}

// Search query for filtering emails
export interface EmailSearchQuery {
	from?: string;
	subject?: string;
	since?: string; // ISO date string
	before?: string; // ISO date string
	folder?: string;
	flagged?: boolean;
	seen?: boolean;
}

// IMAP folder info
export interface EmailFolder {
	path: string;
	name: string;
	specialUse?: string;
	totalMessages: number;
	unseenMessages: number;
}

// Zod schemas for MCP tool input validation

export const EmailSearchQuerySchema = z.object({
	from: z.string().optional(),
	subject: z.string().optional(),
	since: z.string().optional(),
	before: z.string().optional(),
	folder: z.string().optional(),
	flagged: z.boolean().optional(),
	seen: z.boolean().optional(),
});

export const ListUnreadInputSchema = z.object({
	limit: z.number().optional(),
});

export const MoveEmailInputSchema = z.object({
	uid: z.string(),
	folder: z.string(),
});

export const FlagEmailInputSchema = z.object({
	uid: z.string(),
});

export const SetKeywordInputSchema = z.object({
	uid: z.string(),
	keyword: z.string(),
});

export const MarkReadInputSchema = z.object({
	uid: z.string(),
});
