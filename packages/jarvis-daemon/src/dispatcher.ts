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
		// Inject current date/time into every prompt so Claude always knows "now"
		const now = new Date();
		const dateStr = now.toISOString().slice(0, 10);
		const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
		const dayName = now.toLocaleDateString("en-GB", { timeZone: "Europe/Berlin", weekday: "long" });
		const timeContext = `[Current time: ${dayName} ${dateStr} ${timeStr} Europe/Berlin]\n\n`;

		const args = [
			"-p",
			timeContext + prompt,
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

// Tool name → human-friendly description for progress updates
const TOOL_PROGRESS: Record<string, string> = {
	list_unread: "Checking your inbox...",
	search: "Searching emails...",
	move: "Moving email...",
	flag: "Flagging...",
	trash: "Trashing...",
	archive: "Archiving...",
	mark_read: "Marking as read...",
	set_keyword: "Tagging email...",
	list_folders: "Listing folders...",
	list_events: "Checking your calendar...",
	list_todos: "Looking at your tasks...",
	create_event: "Creating event...",
	complete_todo: "Completing task...",
	search_contacts: "Looking up contacts...",
	get_contact: "Getting contact details...",
	get_categories: "Checking budget...",
	get_transactions: "Looking at transactions...",
	categorize_transaction: "Categorising...",
	approve_transactions: "Approving transactions...",
	get_accounts: "Checking accounts...",
	get_month: "Getting month summary...",
	Read: "Reading...",
	Bash: "Running command...",
	WebSearch: "Searching the web...",
};

export type ProgressCallback = (update: string) => Promise<void>;

/**
 * Streaming dispatch: spawns claude -p with stream-json output.
 * Calls onProgress with human-friendly updates as Claude uses tools.
 * Returns the final result.
 *
 * Uses stdbuf -oL on Linux to force line-buffered stdout.
 */
export async function dispatchWithProgress(
	prompt: string,
	opts: DispatchOptions & { onProgress?: ProgressCallback } = {},
): Promise<ClaudeResult> {
	// Inject current date/time
	const now = new Date();
	const dateStr = now.toISOString().slice(0, 10);
	const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
	const dayName = now.toLocaleDateString("en-GB", { timeZone: "Europe/Berlin", weekday: "long" });
	const timeContext = `[Current time: ${dayName} ${dateStr} ${timeStr} Europe/Berlin]\n\n`;

	const args = [
		"-oL", "claude",
		"-p", timeContext + prompt,
		"--output-format", "stream-json",
		"--verbose",
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

	const env = { ...process.env };
	delete env.ANTHROPIC_API_KEY;

	log.info("dispatch_streaming_start", {
		prompt_preview: prompt.slice(0, 100),
		model: opts.model ?? "default",
	});
	const startMs = Date.now();

	return new Promise<ClaudeResult>((resolve, reject) => {
		const child = spawn("stdbuf", args, {
			env,
			stdio: ["pipe", "pipe", "pipe"],
		});

		child.stdin.end();

		const rl = createInterface({ input: child.stdout });
		let result: ClaudeResult | null = null;
		let lastProgress = "";
		let killTimer: ReturnType<typeof setTimeout> | null = null;

		// Timeout
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error("Dispatch timed out"));
		}, opts.timeoutMs ?? 300_000);

		rl.on("line", async (line) => {
			if (!line.trim()) return;
			let msg: Record<string, unknown>;
			try {
				msg = JSON.parse(line);
			} catch {
				return;
			}

			// Tool use events → progress update
			if (msg.type === "assistant" && msg.message) {
				const message = msg.message as Record<string, unknown>;
				const content = message.content as Array<Record<string, unknown>> | undefined;
				if (content) {
					for (const block of content) {
						if (block.type === "tool_use" && block.name) {
							const toolName = String(block.name).split("__").pop() ?? String(block.name);
							const desc = TOOL_PROGRESS[toolName] ?? `Working on it...`;
							if (desc !== lastProgress && opts.onProgress) {
								lastProgress = desc;
								opts.onProgress(desc).catch(() => {});
							}
						}
					}
				}
			}

			// Result event → we're done
			if (msg.type === "result") {
				result = msg as unknown as ClaudeResult;
				// Kill the process (it hangs after result — known bug #25629)
				killTimer = setTimeout(() => child.kill("SIGTERM"), 3000);
			}
		});

		let stderr = "";
		child.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on("close", () => {
			clearTimeout(timeout);
			if (killTimer) clearTimeout(killTimer);
			const durationMs = Date.now() - startMs;

			if (result) {
				if (result.subtype !== "success") {
					log.error("dispatch_streaming_failed", {
						subtype: result.subtype,
						duration_ms: durationMs,
					});
					reject(new Error(`Claude dispatch failed: ${result.subtype} - ${result.result}`));
					return;
				}
				log.info("dispatch_streaming_complete", {
					duration_ms: durationMs,
					cost_usd: result.total_cost_usd,
					result_preview: result.result?.slice(0, 100),
				});
				resolve(result);
			} else {
				// No result event — process crashed or was killed
				log.error("dispatch_streaming_no_result", {
					duration_ms: durationMs,
					stderr_preview: stderr.slice(0, 200),
				});
				reject(new Error(`claude -p exited without result: ${stderr.slice(0, 200)}`));
			}
		});

		child.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});
	});
}

/**
 * Add random jitter to a base delay to stagger task dispatch (DAEMON-09 / Pitfall 3).
 */
export function addJitter(baseMs: number, maxJitterMs = 60_000): number {
	return baseMs + Math.random() * maxJitterMs;
}
