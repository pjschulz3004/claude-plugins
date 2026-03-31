import { describe, expect, it } from "vitest";
import {
	SearchContactsInputSchema,
	GetContactInputSchema,
	CreateContactInputSchema,
	UpdateContactInputSchema,
} from "./types.js";

describe("SearchContactsInputSchema", () => {
	it("accepts valid query", () => {
		const result = SearchContactsInputSchema.parse({ query: "John" });
		expect(result.query).toBe("John");
	});

	it("rejects missing query", () => {
		expect(() => SearchContactsInputSchema.parse({})).toThrow();
	});

	it("rejects non-string query", () => {
		expect(() => SearchContactsInputSchema.parse({ query: 123 })).toThrow();
	});
});

describe("GetContactInputSchema", () => {
	it("accepts valid id", () => {
		const result = GetContactInputSchema.parse({ id: "/carddav/addr/abc.vcf" });
		expect(result.id).toBe("/carddav/addr/abc.vcf");
	});

	it("rejects missing id", () => {
		expect(() => GetContactInputSchema.parse({})).toThrow();
	});
});

describe("CreateContactInputSchema", () => {
	it("accepts minimal input (fullName only)", () => {
		const result = CreateContactInputSchema.parse({ fullName: "Jane Doe" });
		expect(result.fullName).toBe("Jane Doe");
		expect(result.emails).toBeUndefined();
	});

	it("accepts full input", () => {
		const result = CreateContactInputSchema.parse({
			fullName: "Jane Doe",
			emails: ["jane@example.com", "jane2@example.com"],
			phones: ["+49123456"],
			organization: "ACME",
			addresses: ["123 Main St"],
			notes: "VIP contact",
		});
		expect(result.emails).toHaveLength(2);
		expect(result.organization).toBe("ACME");
	});

	it("rejects missing fullName", () => {
		expect(() => CreateContactInputSchema.parse({ emails: ["a@b.com"] })).toThrow();
	});
});

describe("UpdateContactInputSchema", () => {
	it("accepts id with partial update", () => {
		const result = UpdateContactInputSchema.parse({
			id: "/carddav/addr/abc.vcf",
			phones: ["+49999"],
		});
		expect(result.id).toBe("/carddav/addr/abc.vcf");
		expect(result.phones).toEqual(["+49999"]);
		expect(result.fullName).toBeUndefined();
	});

	it("rejects missing id", () => {
		expect(() => UpdateContactInputSchema.parse({ fullName: "Updated" })).toThrow();
	});
});
