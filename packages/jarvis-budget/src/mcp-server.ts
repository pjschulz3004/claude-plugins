#!/usr/bin/env node

import { requireCredentials } from "@jarvis/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { YnabBackend } from "./backend.js";
import type { YNABConfig } from "./types.js";

const creds = requireCredentials("YNAB", ["access_token", "budget_id"]);

const config: YNABConfig = {
	accessToken: creds.access_token,
	budgetId: creds.budget_id,
};

const backend = new YnabBackend(config);
const server = new McpServer({ name: "jarvis-budget", version: "0.1.0" });

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
	return { content: [{ type: "text" as const, text }] };
}

// Tool: get_categories (BUD-01)
server.tool(
	"get_categories",
	"Get all budget categories with balances (budgeted, activity, remaining)",
	{},
	async () => {
		try {
			const categories = await backend.getCategories();
			return textResult(JSON.stringify(categories, null, 2));
		} catch (err) {
			return textResult(`Error getting categories: ${(err as Error).message}`);
		}
	},
);

// Tool: get_transactions (BUD-02)
server.tool(
	"get_transactions",
	"Get transactions, optionally filtered by date range",
	{
		startDate: z.string().optional().describe("Start date (ISO format, e.g. 2026-01-01)"),
		endDate: z.string().optional().describe("End date (ISO format, e.g. 2026-01-31)"),
	},
	async ({ startDate, endDate }) => {
		try {
			const transactions = await backend.getTransactions(startDate, endDate);
			return textResult(JSON.stringify(transactions, null, 2));
		} catch (err) {
			return textResult(`Error getting transactions: ${(err as Error).message}`);
		}
	},
);

// Tool: categorize_transaction (BUD-03)
server.tool(
	"categorize_transaction",
	"Assign a category to a transaction",
	{
		transactionId: z.string().describe("Transaction ID"),
		categoryId: z.string().describe("Category ID to assign"),
	},
	async ({ transactionId, categoryId }) => {
		try {
			await backend.categorizeTransaction(transactionId, categoryId);
			return textResult(`Categorized transaction ${transactionId} to category ${categoryId}`);
		} catch (err) {
			return textResult(`Error categorizing transaction: ${(err as Error).message}`);
		}
	},
);

// Tool: approve_transactions (BUD-04)
server.tool(
	"approve_transactions",
	"Approve one or more transactions",
	{
		transactionIds: z.array(z.string()).describe("Array of transaction IDs to approve"),
	},
	async ({ transactionIds }) => {
		try {
			await backend.approveTransactions(transactionIds);
			return textResult(`Approved ${transactionIds.length} transaction(s)`);
		} catch (err) {
			return textResult(`Error approving transactions: ${(err as Error).message}`);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
