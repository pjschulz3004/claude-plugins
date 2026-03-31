import { describe, it, expect } from "vitest";
import {
	ListFilesInputSchema,
	SaveToInboxInputSchema,
	MoveToOutboxInputSchema,
	ArchiveFileInputSchema,
	SyncWebdavInputSchema,
} from "./types.js";

describe("Zod schemas", () => {
	describe("ListFilesInputSchema", () => {
		it("accepts empty object", () => {
			expect(ListFilesInputSchema.parse({})).toEqual({});
		});
	});

	describe("SaveToInboxInputSchema", () => {
		it("accepts valid filename and content", () => {
			const result = SaveToInboxInputSchema.parse({
				filename: "report.pdf",
				content: "file contents here",
			});
			expect(result.filename).toBe("report.pdf");
			expect(result.content).toBe("file contents here");
		});

		it("rejects missing filename", () => {
			expect(() =>
				SaveToInboxInputSchema.parse({ content: "data" }),
			).toThrow();
		});

		it("rejects missing content", () => {
			expect(() =>
				SaveToInboxInputSchema.parse({ filename: "test.txt" }),
			).toThrow();
		});
	});

	describe("MoveToOutboxInputSchema", () => {
		it("accepts valid filename", () => {
			const result = MoveToOutboxInputSchema.parse({ filename: "doc.pdf" });
			expect(result.filename).toBe("doc.pdf");
		});

		it("rejects missing filename", () => {
			expect(() => MoveToOutboxInputSchema.parse({})).toThrow();
		});
	});

	describe("ArchiveFileInputSchema", () => {
		it("accepts valid filename", () => {
			const result = ArchiveFileInputSchema.parse({ filename: "invoice.pdf" });
			expect(result.filename).toBe("invoice.pdf");
		});

		it("rejects missing filename", () => {
			expect(() => ArchiveFileInputSchema.parse({})).toThrow();
		});
	});

	describe("SyncWebdavInputSchema", () => {
		it("accepts empty object", () => {
			expect(SyncWebdavInputSchema.parse({})).toEqual({});
		});
	});
});
