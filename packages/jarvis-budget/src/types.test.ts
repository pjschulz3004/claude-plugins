import { describe, expect, it } from "vitest";
import {
	GetCategoriesInputSchema,
	GetTransactionsInputSchema,
	CategorizeTransactionInputSchema,
	ApproveTransactionsInputSchema,
} from "./types.js";

describe("GetCategoriesInputSchema", () => {
	it("accepts empty object", () => {
		expect(GetCategoriesInputSchema.parse({})).toEqual({});
	});
});

describe("GetTransactionsInputSchema", () => {
	it("accepts empty object", () => {
		expect(GetTransactionsInputSchema.parse({})).toEqual({});
	});

	it("accepts startDate only", () => {
		const result = GetTransactionsInputSchema.parse({ startDate: "2026-01-01" });
		expect(result.startDate).toBe("2026-01-01");
		expect(result.endDate).toBeUndefined();
	});

	it("accepts both dates", () => {
		const result = GetTransactionsInputSchema.parse({
			startDate: "2026-01-01",
			endDate: "2026-01-31",
		});
		expect(result.startDate).toBe("2026-01-01");
		expect(result.endDate).toBe("2026-01-31");
	});
});

describe("CategorizeTransactionInputSchema", () => {
	it("requires transactionId and categoryId", () => {
		const result = CategorizeTransactionInputSchema.parse({
			transactionId: "abc-123",
			categoryId: "def-456",
		});
		expect(result.transactionId).toBe("abc-123");
		expect(result.categoryId).toBe("def-456");
	});

	it("rejects missing transactionId", () => {
		expect(() =>
			CategorizeTransactionInputSchema.parse({ categoryId: "def-456" }),
		).toThrow();
	});

	it("rejects missing categoryId", () => {
		expect(() =>
			CategorizeTransactionInputSchema.parse({ transactionId: "abc-123" }),
		).toThrow();
	});
});

describe("ApproveTransactionsInputSchema", () => {
	it("accepts array of transaction IDs", () => {
		const result = ApproveTransactionsInputSchema.parse({
			transactionIds: ["id-1", "id-2", "id-3"],
		});
		expect(result.transactionIds).toEqual(["id-1", "id-2", "id-3"]);
	});

	it("accepts empty array", () => {
		const result = ApproveTransactionsInputSchema.parse({
			transactionIds: [],
		});
		expect(result.transactionIds).toEqual([]);
	});

	it("rejects missing transactionIds", () => {
		expect(() => ApproveTransactionsInputSchema.parse({})).toThrow();
	});
});
