import { describe, it, expect } from "vitest";
import {
	BreakerState,
	toolResult,
	LedgerEntrySchema,
} from "./types.js";
import type { ToolResult, CredentialConfig, LedgerEntry, BreakerConfig } from "./types.js";

describe("ToolResult", () => {
	it("has content array with type text and text string", () => {
		const result: ToolResult = {
			content: [{ type: "text", text: "hello" }],
		};
		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(result.content[0].text).toBe("hello");
	});
});

describe("CredentialConfig", () => {
	it("has prefix string and required string array", () => {
		const config: CredentialConfig = {
			prefix: "MAILBOX",
			required: ["email", "password"],
		};
		expect(config.prefix).toBe("MAILBOX");
		expect(config.required).toEqual(["email", "password"]);
	});
});

describe("BreakerState", () => {
	it("has CLOSED, OPEN, and HALF_OPEN values", () => {
		expect(BreakerState.CLOSED).toBe("closed");
		expect(BreakerState.OPEN).toBe("open");
		expect(BreakerState.HALF_OPEN).toBe("half_open");
	});
});

describe("LedgerEntry", () => {
	it("has required fields and optional error", () => {
		const entry: LedgerEntry = {
			task_name: "email_triage",
			status: "success",
			started_at: "2026-03-31T12:00:00Z",
			duration_ms: 1500,
		};
		expect(entry.task_name).toBe("email_triage");
		expect(entry.error).toBeUndefined();

		const failed: LedgerEntry = {
			task_name: "email_triage",
			status: "failure",
			started_at: "2026-03-31T12:00:00Z",
			duration_ms: 500,
			error: "IMAP connection refused",
		};
		expect(failed.error).toBe("IMAP connection refused");
	});
});

describe("toolResult helper", () => {
	it("creates a ToolResult from a string", () => {
		const result = toolResult("test output");
		expect(result).toEqual({
			content: [{ type: "text", text: "test output" }],
		});
	});
});

describe("LedgerEntrySchema", () => {
	it("validates a correct entry", () => {
		const result = LedgerEntrySchema.parse({
			task_name: "test",
			status: "success",
			started_at: "2026-03-31T12:00:00Z",
			duration_ms: 100,
		});
		expect(result.task_name).toBe("test");
	});

	it("rejects invalid status", () => {
		expect(() =>
			LedgerEntrySchema.parse({
				task_name: "test",
				status: "invalid",
				started_at: "2026-03-31T12:00:00Z",
				duration_ms: 100,
			}),
		).toThrow();
	});
});

describe("BreakerConfig", () => {
	it("has failureThreshold and cooldownMs", () => {
		const config: BreakerConfig = {
			failureThreshold: 3,
			cooldownMs: 60_000,
		};
		expect(config.failureThreshold).toBe(3);
		expect(config.cooldownMs).toBe(60_000);
	});
});
