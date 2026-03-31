import type { BreakerConfig } from "./types.js";
import { BreakerState } from "./types.js";

const DEFAULT_CONFIG: BreakerConfig = {
	failureThreshold: 3,
	cooldownMs: 60_000,
};

export class CircuitBreaker {
	private _state: BreakerState = BreakerState.CLOSED;
	private failureCount = 0;
	private lastFailureTime = 0;
	private readonly config: BreakerConfig;
	private readonly nowFn: () => number;

	constructor(config?: BreakerConfig, nowFn?: () => number) {
		this.config = config ?? DEFAULT_CONFIG;
		this.nowFn = nowFn ?? Date.now;
	}

	get state(): BreakerState {
		return this._state;
	}

	shouldAllow(): boolean {
		if (this._state === BreakerState.CLOSED) {
			return true;
		}

		if (this._state === BreakerState.OPEN) {
			const elapsed = this.nowFn() - this.lastFailureTime;
			if (elapsed >= this.config.cooldownMs) {
				this._state = BreakerState.HALF_OPEN;
				return true;
			}
			return false;
		}

		// HALF_OPEN: allow one probe
		return true;
	}

	recordSuccess(): void {
		this.failureCount = 0;
		this._state = BreakerState.CLOSED;
	}

	recordFailure(): void {
		this.failureCount++;
		this.lastFailureTime = this.nowFn();

		if (this._state === BreakerState.HALF_OPEN) {
			this._state = BreakerState.OPEN;
			return;
		}

		if (this.failureCount >= this.config.failureThreshold) {
			this._state = BreakerState.OPEN;
		}
	}
}
