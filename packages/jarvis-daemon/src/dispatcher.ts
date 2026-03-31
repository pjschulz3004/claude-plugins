import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

		const { stdout } = await this.runCommand("claude", args, {
			timeout: opts.timeoutMs ?? 120_000,
			maxBuffer: 10 * 1024 * 1024,
			env,
		});

		return this.parseOutput(stdout);
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
