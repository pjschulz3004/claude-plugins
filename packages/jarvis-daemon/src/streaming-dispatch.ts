/**
 * Streaming dispatcher for interactive Telegram conversations.
 *
 * Spawns `claude -p --resume $sessionId --output-format stream-json --verbose`
 * and parses NDJSON events in real-time. Sends progress updates to a callback
 * as Claude thinks and uses tools.
 *
 * Key differences from batch Dispatcher:
 * - Maintains session_id per chat for conversation continuity
 * - Streams events: tool_use → progress callback → tool_result → text chunks
 * - Sends intermediate Telegram messages ("Checking your inbox...", "Found 12 emails...")
 * - Uses Max subscription via CLAUDE_CODE_OAUTH_TOKEN or existing CLI auth
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createLogger } from "./logger.js";

const log = createLogger("streaming");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamEvent {
	type: string;
	subtype?: string;
	// Tool use events
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	// Text content
	content?: Array<{ type: string; text?: string }>;
	// Result
	result?: string;
	session_id?: string;
	total_cost_usd?: number;
	duration_ms?: number;
	is_error?: boolean;
	usage?: {
		input_tokens: number;
		output_tokens: number;
		cache_read_input_tokens: number;
	};
}

export interface StreamingResult {
	text: string;
	sessionId: string;
	costUsd: number;
	durationMs: number;
	inputTokens: number;
	outputTokens: number;
	toolsUsed: string[];
}

export type ProgressCallback = (update: string) => Promise<void>;

// ---------------------------------------------------------------------------
// Tool name → human-friendly action description
// ---------------------------------------------------------------------------

const TOOL_DESCRIPTIONS: Record<string, string> = {
	list_unread: "Checking your inbox...",
	search: "Searching emails...",
	move: "Moving email...",
	flag: "Flagging email...",
	trash: "Trashing email...",
	archive: "Archiving email...",
	list_folders: "Listing folders...",
	set_keyword: "Tagging email...",
	mark_read: "Marking as read...",
	list_events: "Checking your calendar...",
	list_todos: "Looking at your tasks...",
	create_event: "Creating event...",
	complete_todo: "Completing task...",
	get_categories: "Checking your budget...",
	get_transactions: "Looking at transactions...",
	categorize_transaction: "Categorising transaction...",
	approve_transactions: "Approving transactions...",
	search_contacts: "Looking up contacts...",
	get_contact: "Getting contact details...",
	list_inbox: "Checking files...",
	Read: "Reading a file...",
	Write: "Writing a file...",
	Edit: "Editing a file...",
	Bash: "Running a command...",
	WebSearch: "Searching the web...",
};

function describeToolUse(toolName: string): string | null {
	// Strip MCP server prefix if present (e.g., "mcp__jarvis_email__list_unread" → "list_unread")
	const shortName = toolName.includes("__")
		? toolName.split("__").pop() ?? toolName
		: toolName;
	return TOOL_DESCRIPTIONS[shortName] ?? null;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const sessions = new Map<string, string>(); // chatId → sessionId

export function getSessionId(chatId: string): string | undefined {
	return sessions.get(chatId);
}

export function setSessionId(chatId: string, sessionId: string): void {
	sessions.set(chatId, sessionId);
	log.info("session_stored", { chatId, sessionId });
}

// ---------------------------------------------------------------------------
// Streaming dispatch
// ---------------------------------------------------------------------------

export async function dispatchStreaming(
	prompt: string,
	opts: {
		chatId: string;
		maxTurns?: number;
		timeoutMs?: number;
		onProgress?: ProgressCallback;
	},
): Promise<StreamingResult> {
	const sessionId = sessions.get(opts.chatId);
	const args = [
		"-p",
		prompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--dangerously-skip-permissions",
	];

	if (sessionId) {
		args.push("--resume", sessionId);
	}
	if (opts.maxTurns) {
		args.push("--max-turns", String(opts.maxTurns));
	}

	// Strip ANTHROPIC_API_KEY so it uses Max subscription
	const env = { ...process.env };
	delete env.ANTHROPIC_API_KEY;

	log.info("streaming_start", {
		chatId: opts.chatId,
		resuming: !!sessionId,
		sessionId: sessionId ?? "new",
		prompt_preview: prompt.slice(0, 80),
	});

	const startMs = Date.now();

	return new Promise<StreamingResult>((resolve, reject) => {
		const child = spawn("claude", args, {
			env,
			timeout: opts.timeoutMs ?? 180_000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		// Close stdin immediately (we pass prompt via args, not stdin)
		child.stdin.end();

		const toolsUsed: string[] = [];
		let resultText = "";
		let newSessionId = sessionId ?? "";
		let costUsd = 0;
		let inputTokens = 0;
		let outputTokens = 0;
		let lastProgressTool = "";

		// Parse NDJSON line by line from stdout
		const rl = createInterface({ input: child.stdout });

		rl.on("line", async (line) => {
			if (!line.trim()) return;

			let event: StreamEvent;
			try {
				event = JSON.parse(line) as StreamEvent;
			} catch {
				return; // Skip non-JSON lines
			}

			// Tool use → send progress update
			if (event.type === "assistant" && event.content) {
				for (const block of event.content) {
					if (block.type === "tool_use" && (event as unknown as Record<string, string>).tool_name) {
						const toolName = (event as unknown as Record<string, string>).tool_name;
						toolsUsed.push(toolName);
						const desc = describeToolUse(toolName);
						if (desc && desc !== lastProgressTool && opts.onProgress) {
							lastProgressTool = desc;
							opts.onProgress(desc).catch(() => {});
						}
					}
				}
			}

			// Also check for tool_use at event level (different stream formats)
			if (event.type === "tool_use" || event.subtype === "tool_use") {
				const toolName = event.tool_name ?? "";
				if (toolName) {
					toolsUsed.push(toolName);
					const desc = describeToolUse(toolName);
					if (desc && desc !== lastProgressTool && opts.onProgress) {
						lastProgressTool = desc;
						opts.onProgress(desc).catch(() => {});
					}
				}
			}

			// Final result
			if (event.type === "result") {
				resultText = event.result ?? "";
				newSessionId = event.session_id ?? newSessionId;
				costUsd = event.total_cost_usd ?? 0;
				if (event.usage) {
					inputTokens = event.usage.input_tokens ?? 0;
					outputTokens = event.usage.output_tokens ?? 0;
				}
			}
		});

		let stderrOutput = "";
		child.stderr.on("data", (chunk: Buffer) => {
			stderrOutput += chunk.toString();
		});

		child.on("close", (code) => {
			const durationMs = Date.now() - startMs;

			// Store session for next message
			if (newSessionId) {
				sessions.set(opts.chatId, newSessionId);
			}

			if (code !== 0 && !resultText) {
				log.error("streaming_failed", {
					chatId: opts.chatId,
					code,
					duration_ms: durationMs,
					stderr_preview: stderrOutput.slice(0, 200),
				});
				reject(new Error(`Claude exited with code ${code}: ${stderrOutput.slice(0, 200)}`));
				return;
			}

			log.info("streaming_complete", {
				chatId: opts.chatId,
				sessionId: newSessionId,
				duration_ms: durationMs,
				cost_usd: costUsd,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				tools_used: toolsUsed,
				result_preview: resultText.slice(0, 100),
			});

			resolve({
				text: resultText,
				sessionId: newSessionId,
				costUsd,
				durationMs,
				inputTokens,
				outputTokens,
				toolsUsed,
			});
		});

		child.on("error", (err) => {
			log.error("streaming_spawn_error", { error: err.message });
			reject(err);
		});
	});
}
