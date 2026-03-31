import { describe, it, expect } from "vitest";
import { splitMessage } from "./telegram.js";

describe("splitMessage", () => {
	it("returns single-element array for short text", () => {
		expect(splitMessage("hello")).toEqual(["hello"]);
	});

	it("returns single-element array for text exactly at limit", () => {
		const text = "x".repeat(4000);
		expect(splitMessage(text)).toEqual([text]);
	});

	it("splits at paragraph boundary when text exceeds limit", () => {
		const p1 = "a".repeat(3000);
		const p2 = "b".repeat(2000);
		const text = `${p1}\n\n${p2}`;
		const chunks = splitMessage(text, 4000);
		expect(chunks).toHaveLength(2);
		expect(chunks[0]).toContain("[1/2]");
		expect(chunks[0]).toContain(p1);
		expect(chunks[1]).toContain("[2/2]");
		expect(chunks[1]).toContain(p2);
	});

	it("splits at newline when single paragraph exceeds limit", () => {
		const line1 = "a".repeat(3000);
		const line2 = "b".repeat(2000);
		const text = `${line1}\n${line2}`;
		const chunks = splitMessage(text, 4000);
		expect(chunks).toHaveLength(2);
		expect(chunks[0]).toContain(line1);
		expect(chunks[1]).toContain(line2);
	});

	it("hard-splits when no newline found before limit", () => {
		const text = "x".repeat(5000);
		const chunks = splitMessage(text, 4000);
		expect(chunks).toHaveLength(2);
		// Account for "[1/2] " prefix (6 chars)
		expect(chunks[0].length).toBeLessThanOrEqual(4000);
		expect(chunks[1].length).toBeLessThanOrEqual(4000);
	});

	it("adds chunk numbering prefix when multiple chunks", () => {
		const text = "a".repeat(3000) + "\n\n" + "b".repeat(3000);
		const chunks = splitMessage(text, 4000);
		expect(chunks[0]).toMatch(/^\[1\/2\] /);
		expect(chunks[1]).toMatch(/^\[2\/2\] /);
	});

	it("does not add numbering for single chunk", () => {
		expect(splitMessage("short text")[0]).toBe("short text");
	});

	it("handles empty string", () => {
		expect(splitMessage("")).toEqual([""]);
	});

	it("handles three-way split", () => {
		const parts = [
			"a".repeat(3500),
			"b".repeat(3500),
			"c".repeat(3500),
		];
		const text = parts.join("\n\n");
		const chunks = splitMessage(text, 4000);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toMatch(/^\[1\/3\]/);
		expect(chunks[2]).toMatch(/^\[3\/3\]/);
	});
});
