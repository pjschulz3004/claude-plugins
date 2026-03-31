import { z } from "zod";

// CardDAV connection configuration
export interface CardDAVConfig {
	serverUrl: string;
	username: string;
	password: string;
}

// Full contact details
export interface Contact {
	id: string;
	fullName: string;
	emails: string[];
	phones: string[];
	organization?: string;
	addresses: string[];
	notes?: string;
}

// Lightweight contact for search results
export interface ContactSummary {
	id: string;
	fullName: string;
	primaryEmail?: string;
	organization?: string;
}

// Zod schemas for MCP tool input validation

export const SearchContactsInputSchema = z.object({
	query: z.string().describe("Search term to match against name, email, or organization"),
});

export const GetContactInputSchema = z.object({
	id: z.string().describe("Contact ID (vCard URL)"),
});

export const CreateContactInputSchema = z.object({
	fullName: z.string().describe("Full name of the contact"),
	emails: z.array(z.string()).optional().describe("Email addresses"),
	phones: z.array(z.string()).optional().describe("Phone numbers"),
	organization: z.string().optional().describe("Organization name"),
	addresses: z.array(z.string()).optional().describe("Physical addresses"),
	notes: z.string().optional().describe("Notes about the contact"),
});

export const UpdateContactInputSchema = z.object({
	id: z.string().describe("Contact ID (vCard URL)"),
	fullName: z.string().optional().describe("Full name"),
	emails: z.array(z.string()).optional().describe("Email addresses"),
	phones: z.array(z.string()).optional().describe("Phone numbers"),
	organization: z.string().optional().describe("Organization name"),
	addresses: z.array(z.string()).optional().describe("Physical addresses"),
	notes: z.string().optional().describe("Notes"),
});
