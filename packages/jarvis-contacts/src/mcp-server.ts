#!/usr/bin/env node

import { requireCredentials } from "@jarvis/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TsdavContactsBackend } from "./backend.js";
import type { CardDAVConfig } from "./types.js";

const creds = requireCredentials("MAILBOX", ["email", "password"]);

const config: CardDAVConfig = {
	serverUrl: "https://dav.mailbox.org/carddav/",
	username: creds.email,
	password: creds.password,
};

const backend = new TsdavContactsBackend(config);
const server = new McpServer({ name: "jarvis-contacts", version: "0.1.0" });

function textResult(text: string) {
	return { content: [{ type: "text" as const, text }] };
}

// Tool: search_contacts
server.tool(
	"search_contacts",
	"Search contacts by name, email, or organization",
	{
		query: z.string().describe("Search term to match against name, email, or organization"),
	},
	async ({ query }) => {
		try {
			const contacts = await backend.searchContacts(query);
			return textResult(JSON.stringify(contacts, null, 2));
		} catch (err) {
			return textResult(`Error searching contacts: ${(err as Error).message}`);
		}
	},
);

// Tool: get_contact
server.tool(
	"get_contact",
	"Get full details for a specific contact",
	{
		id: z.string().describe("Contact ID (vCard URL)"),
	},
	async ({ id }) => {
		try {
			const contact = await backend.getContact(id);
			return textResult(JSON.stringify(contact, null, 2));
		} catch (err) {
			return textResult(`Error getting contact: ${(err as Error).message}`);
		}
	},
);

// Tool: create_contact
server.tool(
	"create_contact",
	"Create a new contact",
	{
		fullName: z.string().describe("Full name of the contact"),
		emails: z.array(z.string()).optional().describe("Email addresses"),
		phones: z.array(z.string()).optional().describe("Phone numbers"),
		organization: z.string().optional().describe("Organization name"),
		addresses: z.array(z.string()).optional().describe("Physical addresses"),
		notes: z.string().optional().describe("Notes about the contact"),
	},
	async (data) => {
		try {
			await backend.createContact(data);
			return textResult(`Created contact: ${data.fullName}`);
		} catch (err) {
			return textResult(`Error creating contact: ${(err as Error).message}`);
		}
	},
);

// Tool: update_contact
server.tool(
	"update_contact",
	"Update an existing contact's fields",
	{
		id: z.string().describe("Contact ID (vCard URL)"),
		fullName: z.string().optional().describe("Full name"),
		emails: z.array(z.string()).optional().describe("Email addresses"),
		phones: z.array(z.string()).optional().describe("Phone numbers"),
		organization: z.string().optional().describe("Organization name"),
		addresses: z.array(z.string()).optional().describe("Physical addresses"),
		notes: z.string().optional().describe("Notes"),
	},
	async ({ id, ...fields }) => {
		try {
			await backend.updateContact(id, fields);
			return textResult(`Updated contact: ${id}`);
		} catch (err) {
			return textResult(`Error updating contact: ${(err as Error).message}`);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
