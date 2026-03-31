import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadCredentials, requireCredentials } from "./credentials.js";

describe("loadCredentials", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Clear any JARVIS_ vars
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("JARVIS_")) {
				delete process.env[key];
			}
		}
	});

	afterEach(() => {
		// Restore original env
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("JARVIS_")) {
				delete process.env[key];
			}
		}
		Object.assign(process.env, originalEnv);
	});

	it("returns matching env vars with prefix stripped and keys lowercased", () => {
		process.env.JARVIS_MAILBOX_EMAIL = "paul@example.com";
		process.env.JARVIS_MAILBOX_PASSWORD = "secret123";

		const creds = loadCredentials("MAILBOX");
		expect(creds).toEqual({
			email: "paul@example.com",
			password: "secret123",
		});
	});

	it("returns empty object when no matching env vars exist", () => {
		const creds = loadCredentials("MAILBOX");
		expect(creds).toEqual({});
	});

	it("reads all env vars matching JARVIS_MAILBOX_* prefix", () => {
		process.env.JARVIS_MAILBOX_EMAIL = "paul@example.com";
		process.env.JARVIS_MAILBOX_PASSWORD = "secret";
		process.env.JARVIS_MAILBOX_IMAP_HOST = "imap.example.com";
		process.env.JARVIS_YNAB_TOKEN = "should-not-appear";

		const creds = loadCredentials("MAILBOX");
		expect(Object.keys(creds)).toHaveLength(3);
		expect(creds.imap_host).toBe("imap.example.com");
		expect(creds).not.toHaveProperty("token");
	});

	it("handles lowercase prefix input", () => {
		process.env.JARVIS_MAILBOX_EMAIL = "paul@example.com";
		const creds = loadCredentials("mailbox");
		expect(creds.email).toBe("paul@example.com");
	});
});

describe("requireCredentials", () => {
	beforeEach(() => {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("JARVIS_")) {
				delete process.env[key];
			}
		}
	});

	afterEach(() => {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("JARVIS_")) {
				delete process.env[key];
			}
		}
	});

	it("returns credentials when all required keys are present", () => {
		process.env.JARVIS_MAILBOX_EMAIL = "paul@example.com";
		process.env.JARVIS_MAILBOX_PASSWORD = "secret";

		const creds = requireCredentials("MAILBOX", ["EMAIL", "PASSWORD"]);
		expect(creds.email).toBe("paul@example.com");
		expect(creds.password).toBe("secret");
	});

	it("throws error naming missing vars when required key is absent", () => {
		process.env.JARVIS_MAILBOX_EMAIL = "paul@example.com";

		expect(() => requireCredentials("MAILBOX", ["EMAIL", "PASSWORD"])).toThrow(
			"JARVIS_MAILBOX_PASSWORD",
		);
	});

	it("throws error listing all missing vars", () => {
		expect(() =>
			requireCredentials("MAILBOX", ["EMAIL", "PASSWORD"]),
		).toThrow("JARVIS_MAILBOX_EMAIL");
	});
});
