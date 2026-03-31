import { z } from "zod";

// YNAB API configuration
export interface YNABConfig {
	accessToken: string;
	budgetId: string;
}

// Budget category with dollar amounts (converted from milliunits)
export interface BudgetCategory {
	id: string;
	name: string;
	groupName: string;
	budgeted: number;
	activity: number;
	balance: number;
}

// Transaction with dollar amounts (converted from milliunits)
export interface Transaction {
	id: string;
	date: string; // ISO 8601
	amount: number;
	payee: string;
	categoryName?: string;
	categoryId?: string;
	memo?: string;
	approved: boolean;
	cleared: string;
}

// Zod schemas for MCP tool input validation

export const GetCategoriesInputSchema = z.object({});

export const GetTransactionsInputSchema = z.object({
	startDate: z.string().optional().describe("Start date (ISO format, e.g. 2026-01-01)"),
	endDate: z.string().optional().describe("End date (ISO format, e.g. 2026-01-31)"),
});

export const CategorizeTransactionInputSchema = z.object({
	transactionId: z.string().describe("Transaction ID"),
	categoryId: z.string().describe("Category ID to assign"),
});

export const ApproveTransactionsInputSchema = z.object({
	transactionIds: z.array(z.string()).describe("Array of transaction IDs to approve"),
});
