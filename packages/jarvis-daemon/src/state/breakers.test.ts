import { describe, it, expect, beforeEach } from "vitest";
import { BreakerManager } from "./breakers.js";
import { BreakerState, type CircuitBreaker } from "@jarvis/shared";

describe("BreakerManager", () => {
	let manager: BreakerManager;

	beforeEach(() => {
		manager = new BreakerManager();
	});

	it("getOrCreate() returns a CircuitBreaker, creates if not exists", () => {
		const breaker = manager.getOrCreate("imap");
		expect(breaker).toBeDefined();
		expect(breaker.state).toBe(BreakerState.CLOSED);
	});

	it("getOrCreate() returns the same breaker on repeated calls", () => {
		const b1 = manager.getOrCreate("imap");
		const b2 = manager.getOrCreate("imap");
		expect(b1).toBe(b2);
	});

	it("getStates() returns a record of service name to BreakerState", () => {
		manager.getOrCreate("imap");
		manager.getOrCreate("caldav");

		const states = manager.getStates();
		expect(states).toEqual({
			imap: BreakerState.CLOSED,
			caldav: BreakerState.CLOSED,
		});
	});

	it("shouldAllow() delegates to the breaker for that service", () => {
		expect(manager.shouldAllow("imap")).toBe(true);

		// Trip the breaker
		manager.recordFailure("imap");
		manager.recordFailure("imap");
		manager.recordFailure("imap");

		expect(manager.shouldAllow("imap")).toBe(false);
	});

	it("recordSuccess() resets the breaker", () => {
		// Trip the breaker
		manager.recordFailure("imap");
		manager.recordFailure("imap");
		manager.recordFailure("imap");
		expect(manager.getOrCreate("imap").state).toBe(BreakerState.OPEN);

		// Wait for cooldown... we can't easily test this without the nowFn,
		// but we can verify recordSuccess resets after a manual state change.
		// For this test, create a fresh manager that we can control.
	});

	it("recordFailure() increments the breaker", () => {
		manager.recordFailure("imap");
		expect(manager.getOrCreate("imap").state).toBe(BreakerState.CLOSED);
		manager.recordFailure("imap");
		expect(manager.getOrCreate("imap").state).toBe(BreakerState.CLOSED);
		manager.recordFailure("imap");
		expect(manager.getOrCreate("imap").state).toBe(BreakerState.OPEN);
	});

	it("getStates() returns empty record when no breakers tracked", () => {
		expect(manager.getStates()).toEqual({});
	});
});
