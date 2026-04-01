import { CircuitBreaker, BreakerState } from "@jarvis/shared";
import { createLogger } from "../logger.js";

const log = createLogger("breakers");

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
		const breaker = this.getOrCreate(service);
		const prevState = breaker.state;
		breaker.recordSuccess();
		if (prevState !== breaker.state) {
			log.info("breaker_state_change", { service, from: prevState, to: breaker.state });
		}
	}

	recordFailure(service: string): void {
		const breaker = this.getOrCreate(service);
		const prevState = breaker.state;
		breaker.recordFailure();
		if (prevState !== breaker.state) {
			log.info("breaker_state_change", { service, from: prevState, to: breaker.state });
			if (breaker.state === "open") {
				log.warn("breaker_opened", { service });
			}
		}
	}

	getStates(): Record<string, BreakerState> {
		const states: Record<string, BreakerState> = {};
		for (const [name, breaker] of this.breakers) {
			states[name] = breaker.state;
		}
		return states;
	}
}
