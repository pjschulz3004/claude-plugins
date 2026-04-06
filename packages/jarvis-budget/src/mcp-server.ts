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
	"Get all budget categories with balances in EUR (budgeted, activity, remaining). All amounts are in EUR.",
	{},
	async () => {
		try {
			const categories = await backend.getCategories();
			return textResult("Currency: EUR. All amounts in euros.\n" + JSON.stringify(categories, null, 2));
		} catch (err) {
			return textResult(`Error getting categories: ${(err as Error).message}`);
		}
	},
);

// Tool: get_transactions (BUD-02)
server.tool(
	"get_transactions",
	"Get transactions in EUR, optionally filtered by date range. All amounts in EUR.",
	{
		startDate: z.string().optional().describe("Start date (ISO format, e.g. 2026-01-01)"),
		endDate: z.string().optional().describe("End date (ISO format, e.g. 2026-01-31)"),
	},
	async ({ startDate, endDate }) => {
		try {
			const transactions = await backend.getTransactions(startDate, endDate);
			return textResult("Currency: EUR. All amounts in euros.\n" + JSON.stringify(transactions, null, 2));
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

// Tool: batch_categorize — categorize multiple transactions in one call
server.tool(
	"batch_categorize",
	"Categorize multiple transactions at once. Pass an array of {id, categoryId} pairs. Use get_uncategorized + get_categories first to build the mapping.",
	{
		assignments: z.array(z.object({
			id: z.string().describe("Transaction ID"),
			categoryId: z.string().describe("Category ID to assign"),
		})).describe("Array of transaction-to-category assignments"),
	},
	async ({ assignments }) => {
		try {
			let success = 0;
			let failed = 0;
			for (const { id, categoryId } of assignments) {
				try {
					await backend.categorizeTransaction(id, categoryId);
					success++;
				} catch {
					failed++;
				}
			}
			return textResult(`Categorized ${success} transaction(s)${failed > 0 ? `, ${failed} failed` : ""}. Currency: EUR.`);
		} catch (err) {
			return textResult(`Error: ${(err as Error).message}`);
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

// Tool: get_uncategorized
server.tool(
	"get_uncategorized",
	"Get all uncategorized transactions (need categorization). Amounts in EUR.",
	{},
	async () => {
		try {
			const txns = await backend.getUncategorized();
			return textResult(`${txns.length} uncategorized transaction(s). Currency: EUR.\n` + JSON.stringify(txns, null, 2));
		} catch (err) {
			return textResult(`Error: ${(err as Error).message}`);
		}
	},
);

// Tool: get_unapproved
server.tool(
	"get_unapproved",
	"Get all unapproved transactions (need approval). Amounts in EUR.",
	{},
	async () => {
		try {
			const txns = await backend.getUnapproved();
			return textResult(`${txns.length} unapproved transaction(s). Currency: EUR.\n` + JSON.stringify(txns, null, 2));
		} catch (err) {
			return textResult(`Error: ${(err as Error).message}`);
		}
	},
);

// Tool: get_by_category
server.tool(
	"get_by_category",
	"Get transactions for a specific budget category (fuzzy match on name). Amounts in EUR.",
	{
		category: z.string().describe("Category name to search for (e.g. 'Dining', 'Groceries', 'Rent')"),
	},
	async ({ category }) => {
		try {
			const txns = await backend.getByCategory(category);
			return textResult(`${txns.length} transaction(s) in '${category}'. Currency: EUR.\n` + JSON.stringify(txns, null, 2));
		} catch (err) {
			return textResult(`Error: ${(err as Error).message}`);
		}
	},
);

// Tool: get_by_payee
server.tool(
	"get_by_payee",
	"Get all transactions from a specific payee/vendor (fuzzy match). Amounts in EUR.",
	{
		payee: z.string().describe("Payee name to search for (e.g. 'REWE', 'Hetzner', 'HelloFresh')"),
	},
	async ({ payee }) => {
		try {
			const txns = await backend.getByPayee(payee);
			return textResult(`${txns.length} transaction(s) from '${payee}'. Currency: EUR.\n` + JSON.stringify(txns, null, 2));
		} catch (err) {
			return textResult(`Error: ${(err as Error).message}`);
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
