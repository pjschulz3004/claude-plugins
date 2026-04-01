import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "./circuit-breaker.js";
import { BreakerState } from "./types.js";

describe("CircuitBreaker", () => {
	it("starts in CLOSED state", () => {
		const breaker = new CircuitBreaker();
		expect(breaker.state).toBe(BreakerState.CLOSED);
	});

	it("transitions to OPEN after 3 consecutive failures", () => {
		const breaker = new CircuitBreaker();
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.CLOSED);
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.CLOSED);
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);
	});

	it("shouldAllow returns false in OPEN state", () => {
		const breaker = new CircuitBreaker();
		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordFailure();
		expect(breaker.shouldAllow()).toBe(false);
	});

	it("shouldAllow returns true after cooldown (HALF_OPEN)", () => {
		let now = 1000;
		const breaker = new CircuitBreaker(
			{ failureThreshold: 3, cooldownMs: 60_000 },
			() => now,
		);

		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);

		// Advance past cooldown
		now += 60_001;
		expect(breaker.shouldAllow()).toBe(true);
		expect(breaker.state).toBe(BreakerState.HALF_OPEN);
	});

	it("recordSuccess in HALF_OPEN resets to CLOSED", () => {
		let now = 1000;
		const breaker = new CircuitBreaker(
			{ failureThreshold: 3, cooldownMs: 60_000 },
			() => now,
		);

		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordFailure();

		now += 60_001;
		breaker.shouldAllow(); // transitions to HALF_OPEN

		breaker.recordSuccess();
		expect(breaker.state).toBe(BreakerState.CLOSED);
	});

	it("recordSuccess in CLOSED resets failure count", () => {
		const breaker = new CircuitBreaker();
		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordSuccess();

		// Should need 3 more failures to trip, not 1
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.CLOSED);
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.CLOSED);
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);
	});

	it("non-consecutive failures do not trip the breaker", () => {
		const breaker = new CircuitBreaker();
		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordSuccess(); // resets count
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.CLOSED);
	});

	it("failure in HALF_OPEN returns to OPEN", () => {
		let now = 1000;
		const breaker = new CircuitBreaker(
			{ failureThreshold: 3, cooldownMs: 60_000 },
			() => now,
		);

		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordFailure();

		now += 60_001;
		breaker.shouldAllow(); // HALF_OPEN

		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);
	});

	it("trips immediately with failureThreshold of 1", () => {
		const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000 });
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);
	});

	it("shouldAllow returns true in CLOSED state", () => {
		const breaker = new CircuitBreaker();
		expect(breaker.shouldAllow()).toBe(true);
	});

	it("uses default config of 3 failures and 60s cooldown", () => {
		let now = 1000;
		const breaker = new CircuitBreaker(undefined, () => now);

		breaker.recordFailure();
		breaker.recordFailure();
		breaker.recordFailure();
		expect(breaker.state).toBe(BreakerState.OPEN);

		// Not yet past 60s
		now += 59_999;
		expect(breaker.shouldAllow()).toBe(false);

		// Past 60s
		now += 2;
		expect(breaker.shouldAllow()).toBe(true);
	});
});
