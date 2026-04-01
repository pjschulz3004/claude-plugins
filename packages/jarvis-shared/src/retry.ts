/**
 * Shared retry and transient error utilities.
 *
 * Extracted from 4 backend packages that all duplicated the same
 * TRANSIENT_CODES, isTransientError, isAuthError, sleep, and
 * withRetry/withConnection patterns.
 */

export const TRANSIENT_CODES = new Set([
	"ECONNRESET",
	"ETIMEDOUT",
	"ECONNREFUSED",
	"EPIPE",
	"EAI_AGAIN",
]);

export function isTransientError(err: unknown): boolean {
	if (err instanceof Error) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code && TRANSIENT_CODES.has(code)) return true;
	}
	return false;
}

export function isAuthError(err: unknown): boolean {
	if (err instanceof Error) {
		if (err.message.includes("Unauthorized") || err.message.includes("401"))
			return true;
		if ((err as Error & { status?: number }).status === 401) return true;
		if ((err as Error & { status?: number }).status === 403) return true;
	}
	if (typeof err === "object" && err !== null && "status" in err) {
		const status = (err as { status: number }).status;
		return status === 401 || status === 403;
	}
	return false;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryConfig {
	maxAttempts?: number;
	retryDelayMs?: number;
	shouldRetry?: (err: unknown) => boolean;
}

const DEFAULT_RETRY: Required<RetryConfig> = {
	maxAttempts: 3,
	retryDelayMs: 1000,
	shouldRetry: (err) => isTransientError(err) && !isAuthError(err),
};

/**
 * Execute an operation with retry on transient errors.
 * Uses exponential backoff between attempts.
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	config?: RetryConfig,
): Promise<T> {
	const { maxAttempts, retryDelayMs, shouldRetry } = {
		...DEFAULT_RETRY,
		...config,
	};

	let lastError: Error | undefined;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (err) {
			lastError = err as Error;
			if (!shouldRetry(err)) throw err;
			if (attempt < maxAttempts - 1) {
				await sleep(retryDelayMs * 2 ** attempt);
			}
		}
	}
	throw lastError;
}
