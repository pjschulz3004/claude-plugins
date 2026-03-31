import { CircuitBreaker, BreakerState } from "@jarvis/shared";

export class BreakerManager {
	private readonly breakers = new Map<string, CircuitBreaker>();

	getOrCreate(service: string): CircuitBreaker {
		let breaker = this.breakers.get(service);
		if (!breaker) {
			breaker = new CircuitBreaker();
			this.breakers.set(service, breaker);
		}
		return breaker;
	}

	shouldAllow(service: string): boolean {
		return this.getOrCreate(service).shouldAllow();
	}

	recordSuccess(service: string): void {
		this.getOrCreate(service).recordSuccess();
	}

	recordFailure(service: string): void {
		this.getOrCreate(service).recordFailure();
	}

	getStates(): Record<string, BreakerState> {
		const states: Record<string, BreakerState> = {};
		for (const [name, breaker] of this.breakers) {
			states[name] = breaker.state;
		}
		return states;
	}
}
