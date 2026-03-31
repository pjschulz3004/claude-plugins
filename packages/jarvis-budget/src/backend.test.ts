import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock UUID objects — YNAB SDK returns these, not plain strings
class FakeUUID {
	private value: string;
	constructor(value: string) {
		this.value = value;
	}
	toString() {
		return this.value;
	}
}

// Mock the ynab module
vi.mock("ynab", () => {
	return {
		default: {
			API: vi.fn(),
		},
	};
});

import ynab from "ynab";
import { YnabBackend } from "./backend.js";
import type { YNABConfig } from "./types.js";

const mockConfig: YNABConfig = {
	accessToken: "test-token",
	budgetId: "test-budget-id",
};

function createMockApi(overrides: Record<string, unknown> = {}) {
	return {
		categories: {
			getCategories: vi.fn().mockResolvedValue({
				data: {
					category_groups: [
						{
							id: new FakeUUID("group-1-uuid"),
							name: "Bills",
							hidden: false,
							deleted: false,
							categories: [
								{
									id: new FakeUUID("cat-1-uuid"),
									name: "Rent",
									hidden: false,
									deleted: false,
									budgeted: 1500000, // milliunits
									activity: -1200000,
									balance: 300000,
								},
								{
									id: new FakeUUID("cat-2-uuid"),
									name: "Hidden Category",
									hidden: true,
									deleted: false,
									budgeted: 0,
									activity: 0,
									balance: 0,
								},
								{
									id: new FakeUUID("cat-3-uuid"),
									name: "Deleted Category",
									hidden: false,
									deleted: true,
									budgeted: 0,
									activity: 0,
									balance: 0,
								},
							],
						},
						{
							id: new FakeUUID("group-2-uuid"),
							name: "Food",
							hidden: false,
							deleted: false,
							categories: [
								{
									id: new FakeUUID("cat-4-uuid"),
									name: "Groceries",
									hidden: false,
									deleted: false,
									budgeted: 500000,
									activity: -350000,
									balance: 150000,
								},
							],
						},
					],
				},
			}),
		},
		transactions: {
			getTransactions: vi.fn().mockResolvedValue({
				data: {
					transactions: [
						{
							id: new FakeUUID("txn-1-uuid"),
							date: "2026-03-15",
							amount: -25500, // milliunits
							payee_name: "Grocery Store",
							category_name: "Groceries",
							category_id: new FakeUUID("cat-4-uuid"),
							memo: "Weekly shopping",
							approved: true,
							cleared: "cleared",
						},
						{
							id: new FakeUUID("txn-2-uuid"),
							date: "2026-03-20",
							amount: 1000000,
							payee_name: "Employer",
							category_name: "Income",
							category_id: new FakeUUID("cat-income-uuid"),
							memo: null,
							approved: false,
							cleared: "uncleared",
						},
					],
				},
			}),
			updateTransaction: vi.fn().mockResolvedValue({}),
			updateTransactions: vi.fn().mockResolvedValue({}),
		},
		...overrides,
	};
}

describe("YnabBackend", () => {
	let mockApi: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApi = createMockApi();
		vi.mocked(ynab.API).mockImplementation(function () {
			return mockApi as unknown as ynab.API;
		});
	});

	describe("getCategories", () => {
		it("returns flattened, filtered categories with string IDs and dollar amounts", async () => {
			const backend = new YnabBackend(mockConfig);
			const categories = await backend.getCategories();

			expect(categories).toHaveLength(2);

			// Check first category
			expect(categories[0]).toEqual({
				id: "cat-1-uuid",
				name: "Rent",
				groupName: "Bills",
				budgeted: 1500,
				activity: -1200,
				balance: 300,
			});

			// Check second category
			expect(categories[1]).toEqual({
				id: "cat-4-uuid",
				name: "Groceries",
				groupName: "Food",
				budgeted: 500,
				activity: -350,
				balance: 150,
			});
		});

		it("returns string IDs, not UUID objects", async () => {
			const backend = new YnabBackend(mockConfig);
			const categories = await backend.getCategories();

			for (const cat of categories) {
				expect(typeof cat.id).toBe("string");
				// Ensure it's a plain string, not a FakeUUID
				expect(cat.id).toBe(String(cat.id));
				expect(cat.id.constructor).toBe(String);
			}
		});

		it("filters out hidden and deleted categories", async () => {
			const backend = new YnabBackend(mockConfig);
			const categories = await backend.getCategories();

			const names = categories.map((c) => c.name);
			expect(names).not.toContain("Hidden Category");
			expect(names).not.toContain("Deleted Category");
		});
	});

	describe("getTransactions", () => {
		it("maps transactions with string IDs and dollar amounts", async () => {
			const backend = new YnabBackend(mockConfig);
			const transactions = await backend.getTransactions();

			expect(transactions).toHaveLength(2);
			expect(transactions[0]).toEqual({
				id: "txn-1-uuid",
				date: "2026-03-15",
				amount: -25.5,
				payee: "Grocery Store",
				categoryName: "Groceries",
				categoryId: "cat-4-uuid",
				memo: "Weekly shopping",
				approved: true,
				cleared: "cleared",
			});
		});

		it("returns string IDs, not UUID objects", async () => {
			const backend = new YnabBackend(mockConfig);
			const transactions = await backend.getTransactions();

			for (const txn of transactions) {
				expect(typeof txn.id).toBe("string");
				expect(txn.id.constructor).toBe(String);
				if (txn.categoryId) {
					expect(typeof txn.categoryId).toBe("string");
					expect(txn.categoryId.constructor).toBe(String);
				}
			}
		});

		it("handles null memo as undefined", async () => {
			const backend = new YnabBackend(mockConfig);
			const transactions = await backend.getTransactions();

			expect(transactions[1].memo).toBeUndefined();
		});

		it("passes startDate to YNAB API", async () => {
			const backend = new YnabBackend(mockConfig);
			await backend.getTransactions("2026-03-01");

			expect(mockApi.transactions.getTransactions).toHaveBeenCalledWith(
				"test-budget-id",
				"2026-03-01",
			);
		});

		it("filters by endDate client-side", async () => {
			const backend = new YnabBackend(mockConfig);
			// Both transactions are in March, filter to before March 18
			const transactions = await backend.getTransactions(undefined, "2026-03-18");

			expect(transactions).toHaveLength(1);
			expect(transactions[0].date).toBe("2026-03-15");
		});
	});

	describe("categorizeTransaction", () => {
		it("calls updateTransaction with correct args", async () => {
			const backend = new YnabBackend(mockConfig);
			await backend.categorizeTransaction("txn-1", "cat-1");

			expect(mockApi.transactions.updateTransaction).toHaveBeenCalledWith(
				"test-budget-id",
				"txn-1",
				{ transaction: { category_id: "cat-1" } },
			);
		});
	});

	describe("approveTransactions", () => {
		it("calls updateTransactions with correct args", async () => {
			const backend = new YnabBackend(mockConfig);
			await backend.approveTransactions(["txn-1", "txn-2"]);

			expect(mockApi.transactions.updateTransactions).toHaveBeenCalledWith(
				"test-budget-id",
				{
					transactions: [
						{ id: "txn-1", approved: true },
						{ id: "txn-2", approved: true },
					],
				},
			);
		});
	});

	describe("retry logic", () => {
		it("retries on transient network error", async () => {
			const failApi = createMockApi();
			let callCount = 0;
			failApi.categories.getCategories = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					const err = new Error("Connection reset");
					(err as NodeJS.ErrnoException).code = "ECONNRESET";
					throw err;
				}
				return Promise.resolve({
					data: {
						category_groups: [
							{
								id: new FakeUUID("g1"),
								name: "Group",
								hidden: false,
								deleted: false,
								categories: [
									{
										id: new FakeUUID("c1"),
										name: "Cat",
										hidden: false,
										deleted: false,
										budgeted: 1000,
										activity: 0,
										balance: 1000,
									},
								],
							},
						],
					},
				});
			});
			vi.mocked(ynab.API).mockImplementation(function () {
				return failApi as unknown as ynab.API;
			});

			const backend = new YnabBackend(mockConfig, 1); // 1ms retry delay
			const result = await backend.getCategories();
			expect(result).toHaveLength(1);
			expect(callCount).toBe(2);
		});

		it("does not retry on 401 auth error", async () => {
			const failApi = createMockApi();
			failApi.categories.getCategories = vi.fn().mockImplementation(() => {
				const err = new Error("Unauthorized") as Error & { status?: number };
				err.status = 401;
				throw err;
			});
			vi.mocked(ynab.API).mockImplementation(function () {
				return failApi as unknown as ynab.API;
			});

			const backend = new YnabBackend(mockConfig, 1);
			await expect(backend.getCategories()).rejects.toThrow("Unauthorized");
			expect(failApi.categories.getCategories).toHaveBeenCalledTimes(1);
		});

		it("does not retry on 403 forbidden error", async () => {
			const failApi = createMockApi();
			failApi.categories.getCategories = vi.fn().mockImplementation(() => {
				const err = new Error("Forbidden") as Error & { status?: number };
				err.status = 403;
				throw err;
			});
			vi.mocked(ynab.API).mockImplementation(function () {
				return failApi as unknown as ynab.API;
			});

			const backend = new YnabBackend(mockConfig, 1);
			await expect(backend.getCategories()).rejects.toThrow("Forbidden");
			expect(failApi.categories.getCategories).toHaveBeenCalledTimes(1);
		});
	});
});
