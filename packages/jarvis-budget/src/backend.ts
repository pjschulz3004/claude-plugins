import ynab from "ynab";
import { isTransientError, isAuthError, sleep } from "@jarvis/shared";
import type { YNABConfig, BudgetCategory, Transaction } from "./types.js";

export interface BudgetBackend {
	getCategories(): Promise<BudgetCategory[]>;
	getTransactions(startDate?: string, endDate?: string): Promise<Transaction[]>;
	getTransaction(id: string): Promise<{ category_name: string }>;
	categorizeTransaction(transactionId: string, categoryId: string): Promise<void>;
	approveTransactions(transactionIds: string[]): Promise<void>;
}

export class YnabBackend implements BudgetBackend {
	private config: YNABConfig;
	private retryDelayMs: number;

	constructor(config: YNABConfig, retryDelayMs = 1000) {
		this.config = config;
		this.retryDelayMs = retryDelayMs;
	}

	private createApi(): ynab.API {
		return new ynab.API(this.config.accessToken);
	}

	private async withRetry<T>(operation: (api: ynab.API) => Promise<T>): Promise<T> {
		let lastError: Error | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			const api = this.createApi();
			try {
				return await operation(api);
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

	async getCategories(): Promise<BudgetCategory[]> {
		return this.withRetry(async (api) => {
			const response = await api.categories.getCategories(this.config.budgetId);
			const groups = response.data.category_groups;
			const categories: BudgetCategory[] = [];

			for (const group of groups) {
				for (const cat of group.categories) {
					if (cat.hidden || cat.deleted) continue;
					categories.push({
						id: String(cat.id),
						name: cat.name,
						groupName: group.name,
						budgeted: cat.budgeted / 1000,
						activity: cat.activity / 1000,
						balance: cat.balance / 1000,
					});
				}
			}

			return categories;
		});
	}

	async getTransactions(startDate?: string, endDate?: string): Promise<Transaction[]> {
		return this.withRetry(async (api) => {
			const response = await api.transactions.getTransactions(
				this.config.budgetId,
				startDate,
			);
			let transactions = response.data.transactions;

			// Client-side endDate filter (YNAB API only supports sinceDate)
			if (endDate) {
				transactions = transactions.filter((t) => t.date <= endDate);
			}

			return transactions.map((t) => ({
				id: String(t.id),
				date: t.date,
				amount: t.amount / 1000,
				payee: t.payee_name ?? "",
				categoryName: t.category_name ?? undefined,
				categoryId: t.category_id ? String(t.category_id) : undefined,
				memo: t.memo ?? undefined,
				approved: t.approved,
				cleared: t.cleared,
			}));
		});
	}

	async getTransaction(id: string): Promise<{ category_name: string }> {
		return this.withRetry(async (api) => {
			const response = await api.transactions.getTransactionById(
				this.config.budgetId,
				id,
			);
			return { category_name: response.data.transaction.category_name ?? "" };
		});
	}

	async categorizeTransaction(transactionId: string, categoryId: string): Promise<void> {
		await this.withRetry(async (api) => {
			await api.transactions.updateTransaction(
				this.config.budgetId,
				transactionId,
				{ transaction: { category_id: categoryId } } as Parameters<typeof api.transactions.updateTransaction>[2],
			);
		});
	}

	async approveTransactions(transactionIds: string[]): Promise<void> {
		await this.withRetry(async (api) => {
			await api.transactions.updateTransactions(
				this.config.budgetId,
				{
					transactions: transactionIds.map((id) => ({
						id,
						approved: true,
					})),
				} as Parameters<typeof api.transactions.updateTransactions>[1],
			);
		});
	}

	async getAccounts(): Promise<Array<{ id: string; name: string; type: string; balance: number; cleared_balance: number }>> {
		return this.withRetry(async (api) => {
			const response = await api.accounts.getAccounts(this.config.budgetId);
			return response.data.accounts
				.filter((a) => !a.closed && !a.deleted)
				.map((a) => ({
					id: String(a.id),
					name: a.name,
					type: String(a.type),
					balance: a.balance / 1000,
					cleared_balance: a.cleared_balance / 1000,
				}));
		});
	}

	async getMonthSummary(month: string): Promise<{ month: string; budgeted: number; activity: number; to_be_budgeted: number; age_of_money: number | null }> {
		return this.withRetry(async (api) => {
			const response = await api.months.getBudgetMonth(this.config.budgetId, month);
			const m = response.data.month;
			return {
				month: String(m.month),
				budgeted: m.budgeted / 1000,
				activity: m.activity / 1000,
				to_be_budgeted: m.to_be_budgeted / 1000,
				age_of_money: m.age_of_money ?? null,
			};
		});
	}
}
