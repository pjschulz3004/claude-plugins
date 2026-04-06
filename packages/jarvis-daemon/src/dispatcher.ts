import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createLogger } from "./logger.js";
import { createInterface } from "node:readline";

const execFileAsync = promisify(execFile);
const log = createLogger("dispatcher");

export interface ClaudeResult {
	type: "result";
	subtype: "success" | "error_max_turns" | "error_api";
	result: string;
	session_id: string;
	total_cost_usd: number;
	duration_ms: number;
	usage: {
		input_tokens: number;
		output_tokens: number;
		cache_read_input_tokens: number;
	};
}

export interface DispatchOptions {
	model?: string;
	pluginDirs?: string[];
	maxTurns?: number;
	timeoutMs?: number;
	/** Resume a previous session by ID. Maintains full conversation context. */
	resumeSessionId?: string;
	/** Number of retries on transient exec failure (e.g. CLI startup crash, MCP blip). Default: 0. */
	retries?: number;
}

type ExecFn = (
	cmd: string,
	args: string[],
	opts: Record<string, unknown>,
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Default executor using node:child_process execFile (safe against shell injection).
 * execFile does NOT spawn a shell -- args are passed directly to the binary.
 * Strips ANTHROPIC_API_KEY from env so claude CLI uses the Max subscription.
 */
async function defaultExecFn(
	cmd: string,
	args: string[],
	opts: Record<string, unknown>,
): Promise<{ stdout: string; stderr: string }> {
	return execFileAsync(cmd, args, opts);
}

export class Dispatcher {
	private readonly runCommand: ExecFn;

	constructor(execFn?: ExecFn) {
		this.runCommand = execFn ?? defaultExecFn;
	}

	async dispatch(
		prompt: string,
		opts: DispatchOptions = {},
	): Promise<ClaudeResult> {
		const args = [
			"-p",
			prompt,
			"--output-format",
			"json",
			"--dangerously-skip-permissions",
		];

		if (opts.resumeSessionId) {
			args.push("--resume", opts.resumeSessionId);
		}
		if (opts.model) {
			args.push("--model", opts.model);
		}
		if (opts.maxTurns) {
			args.push("--max-turns", String(opts.maxTurns));
		}
		for (const dir of opts.pluginDirs ?? []) {
			args.push("--plugin-dir", dir);
		}

		// Strip ANTHROPIC_API_KEY so claude CLI uses Max subscription (DAEMON-08)
		const env = { ...process.env };
		delete env.ANTHROPIC_API_KEY;

		const execOpts = {
			timeout: opts.timeoutMs ?? 120_000,
			maxBuffer: 10 * 1024 * 1024,
			env,
		};

		const maxAttempts = 1 + (opts.retries ?? 0);
		let lastError: Error | undefined;

		log.info("dispatch_start", {
			prompt_preview: prompt.slice(0, 100),
			model: opts.model ?? "default",
			maxTurns: opts.maxTurns ?? 0,
			timeoutMs: execOpts.timeout,
		});
		const dispatchStartMs = Date.now();

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			if (attempt > 1) {
				// Linear backoff: 5s per retry (handles transient MCP blips without long waits)
				await new Promise<void>((resolve) =>
					setTimeout(resolve, (attempt - 1) * 5_000),
				);
				log.warn("dispatch_retry", {
					attempt: attempt - 1,
					maxRetries: opts.retries ?? 0,
					reason: lastError?.message ?? "unknown",
				});
			}

			let stdout: string;
			try {
				const result = await this.runCommand("claude", args, execOpts);
				stdout = result.stdout;
			} catch (execErr) {
				// Exec failure (process crash, timeout, non-zero exit): eligible for retry
				lastError =
					execErr instanceof Error ? execErr : new Error(String(execErr));
				continue;
			}

			// Parse errors and Claude structural errors (error_max_turns, error_api) propagate
			// immediately without retry — they indicate a problem with the prompt or Claude,
			// not a transient infrastructure issue.
			const parsed = this.parseOutput(stdout);
			log.info("dispatch_complete", {
				model: opts.model ?? "default",
				duration_ms: Date.now() - dispatchStartMs,
				cost_usd: parsed.total_cost_usd,
				input_tokens: parsed.usage.input_tokens,
				output_tokens: parsed.usage.output_tokens,
				result_preview: parsed.result.slice(0, 100),
			});
			return parsed;
		}

		// Fallback: if we were resuming a session and it failed, retry without resume
		if (opts.resumeSessionId) {
			log.warn("dispatch_resume_fallback", {
				sessionId: opts.resumeSessionId,
				error: lastError?.message?.slice(0, 100) ?? "unknown",
			});
			const freshArgs = args.filter((a, i) => a !== "--resume" && args[i - 1] !== "--resume");
			try {
				const result = await this.runCommand("claude", freshArgs, execOpts);
				const parsed = this.parseOutput(result.stdout);
				log.info("dispatch_complete_fresh", {
					model: opts.model ?? "default",
					duration_ms: Date.now() - dispatchStartMs,
					result_preview: parsed.result.slice(0, 100),
				});
				return parsed;
			} catch {
				// Fresh attempt also failed — fall through to throw
			}
		}

		log.error("dispatch_failed", {
			error: lastError?.message ?? "unknown",
			duration_ms: Date.now() - dispatchStartMs,
		});
		throw lastError!;
	}

	private parseOutput(stdout: string): ClaudeResult {
		// Try direct JSON.parse first
		try {
			const result = JSON.parse(stdout) as ClaudeResult;
			return this.validateResult(result);
		} catch {
			// Fallback: extract JSON between first { and last } (Pitfall 4)
		}

		const firstBrace = stdout.indexOf("{");
		const lastBrace = stdout.lastIndexOf("}");
		if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
			throw new Error("No JSON found in claude -p output");
		}

		const json = stdout.slice(firstBrace, lastBrace + 1);
		const result = JSON.parse(json) as ClaudeResult;
		return this.validateResult(result);
	}

	private validateResult(result: ClaudeResult): ClaudeResult {
		if (result.subtype !== "success") {
			throw new Error(
				`Claude dispatch failed: ${result.subtype} - ${result.result}`,
			);
		}
		return result;
	}
}

/**
 * Add random jitter to a base delay to stagger task dispatch (DAEMON-09 / Pitfall 3).
 */
export function addJitter(baseMs: number, maxJitterMs = 60_000): number {
	return baseMs + Math.random() * maxJitterMs;
}
