import { describe, expect, it } from "vitest";
import {
	TRANSIENT_CODES,
	isTransientError,
	isAuthError,
	sleep,
	withRetry,
} from "./retry.js";

describe("TRANSIENT_CODES", () => {
	it("contains expected network error codes", () => {
		expect(TRANSIENT_CODES.has("ECONNRESET")).toBe(true);
		expect(TRANSIENT_CODES.has("ETIMEDOUT")).toBe(true);
		expect(TRANSIENT_CODES.has("ECONNREFUSED")).toBe(true);
		expect(TRANSIENT_CODES.has("EPIPE")).toBe(true);
		expect(TRANSIENT_CODES.has("EAI_AGAIN")).toBe(true);
	});

	it("does not contain non-transient codes", () => {
		expect(TRANSIENT_CODES.has("ENOENT")).toBe(false);
		expect(TRANSIENT_CODES.has("EACCES")).toBe(false);
	});
});

describe("isTransientError", () => {
	it("returns true for errors with transient codes", () => {
		const err = new Error("Connection reset");
		(err as NodeJS.ErrnoException).code = "ECONNRESET";
		expect(isTransientError(err)).toBe(true);
	});

	it("returns false for non-transient errors", () => {
		const err = new Error("File not found");
		(err as NodeJS.ErrnoException).code = "ENOENT";
		expect(isTransientError(err)).toBe(false);
	});

	it("returns false for errors without code", () => {
		expect(isTransientError(new Error("generic"))).toBe(false);
	});

	it("returns false for non-Error values", () => {
		expect(isTransientError("string error")).toBe(false);
		expect(isTransientError(42)).toBe(false);
		expect(isTransientError(null)).toBe(false);
	});
});

describe("isAuthError", () => {
	it("detects 401 in error message", () => {
		expect(isAuthError(new Error("Unauthorized"))).toBe(true);
		expect(isAuthError(new Error("401 Not Authorized"))).toBe(true);
	});

	it("detects status 401 on Error objects", () => {
		const err = Object.assign(new Error("auth failed"), { status: 401 });
		expect(isAuthError(err)).toBe(true);
	});

	it("detects status 403 on Error objects", () => {
		const err = Object.assign(new Error("forbidden"), { status: 403 });
		expect(isAuthError(err)).toBe(true);
	});

	it("detects status on plain objects (YNAB-style)", () => {
		expect(isAuthError({ status: 401 })).toBe(true);
		expect(isAuthError({ status: 403 })).toBe(true);
	});

	it("returns false for non-auth errors", () => {
		expect(isAuthError(new Error("timeout"))).toBe(false);
		expect(isAuthError({ status: 500 })).toBe(false);
	});
});

describe("sleep", () => {
	it("resolves after delay", async () => {
		const start = Date.now();
		await sleep(50);
		expect(Date.now() - start).toBeGreaterThanOrEqual(40);
	});
});

describe("withRetry", () => {
	it("returns result on first success", async () => {
		const result = await withRetry(() => Promise.resolve(42));
		expect(result).toBe(42);
	});

	it("retries on transient error", async () => {
		let calls = 0;
		const result = await withRetry(
			() => {
				calls++;
				if (calls === 1) {
					const err = new Error("reset");
					(err as NodeJS.ErrnoException).code = "ECONNRESET";
					return Promise.reject(err);
				}
				return Promise.resolve("ok");
			},
			{ retryDelayMs: 0 },
		);
		expect(result).toBe("ok");
		expect(calls).toBe(2);
	});

	it("throws immediately on non-transient error", async () => {
		let calls = 0;
		await expect(
			withRetry(
				() => {
					calls++;
					return Promise.reject(new Error("bad request"));
				},
				{ retryDelayMs: 0 },
			),
		).rejects.toThrow("bad request");
		expect(calls).toBe(1);
	});

	it("throws after max attempts exhausted", async () => {
		let calls = 0;
		await expect(
			withRetry(
				() => {
					calls++;
					const err = new Error("reset");
					(err as NodeJS.ErrnoException).code = "ECONNRESET";
					return Promise.reject(err);
				},
				{ maxAttempts: 2, retryDelayMs: 0 },
			),
		).rejects.toThrow("reset");
		expect(calls).toBe(2);
	});

	it("respects custom shouldRetry predicate", async () => {
		let calls = 0;
		await expect(
			withRetry(
				() => {
					calls++;
					return Promise.reject(new Error("custom"));
				},
				{
					retryDelayMs: 0,
					shouldRetry: (err) =>
						err instanceof Error && err.message === "custom" && calls < 2,
				},
			),
		).rejects.toThrow("custom");
		expect(calls).toBe(2);
	});
});
