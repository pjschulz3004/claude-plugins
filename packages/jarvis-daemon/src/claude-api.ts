/**
 * Direct Claude API client with agentic tool loop.
 *
 * Uses Max subscription via OAuth token. Zero API billing.
 * Implements the full tool use cycle:
 *   send message → Claude requests tool → execute locally → send result → loop
 *
 * Tools are executed in-process (IMAP, CalDAV, YNAB backends).
 * Claude only spends tokens on thinking, not on tool execution.
 *
 * Daily context compaction keeps conversation history lean.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createLogger } from "./logger.js";

const log = createLogger("claude-api");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
	constructor(message: string) { super(message); this.name = "RateLimitError"; }
}

export class AuthError extends Error {
	constructor(message: string) { super(message); this.name = "AuthError"; }
}

interface ContentBlock {
	type: "text" | "tool_use" | "tool_result";
	text?: string;
	id?: string;
	name?: string;
	input?: Record<string, unknown>;
	tool_use_id?: string;
	content?: string | Array<{ type: string; text?: string }>;
	is_error?: boolean;
}

export interface Message {
	role: "user" | "assistant";
	content: string | ContentBlock[];
}

export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: Record<string, unknown>;
}

/** Function that executes a tool and returns the result as a string */
export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<string>;

export interface ApiResponse {
	text: string;
	toolsUsed: string[];
	inputTokens: number;
	outputTokens: number;
	model: string;
}

export interface StreamDelta {
	type: "text" | "tool_start" | "tool_done" | "done";
	text?: string;
	toolName?: string;
}

// ---------------------------------------------------------------------------
// OAuth token management
// ---------------------------------------------------------------------------

interface OAuthCreds {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

function loadOAuthCreds(): OAuthCreds {
	const credPath = join(process.env.HOME ?? "/home/paul", ".claude", ".credentials.json");
	const raw = JSON.parse(readFileSync(credPath, "utf-8"));
	const oauth = raw.claudeAiOauth;
	return {
		accessToken: oauth.accessToken,
		refreshToken: oauth.refreshToken,
		expiresAt: typeof oauth.expiresAt === "number" ? oauth.expiresAt : Number(oauth.expiresAt),
	};
}

async function refreshOAuthToken(creds: OAuthCreds): Promise<OAuthCreds> {
	log.info("token_refresh_start");
	const resp = await fetch("https://console.anthropic.com/v1/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: creds.refreshToken,
			client_id: "ce61e8e7-4e6e-4a69-b637-27735ce13e3f",
		}),
	});

	if (!resp.ok) {
		log.error("token_refresh_failed", { status: resp.status });
		throw new AuthError("OAuth token refresh failed. Run 'claude login' on the VPS.");
	}

	const data = (await resp.json()) as { access_token: string; refresh_token?: string; expires_in: number };
	const newCreds: OAuthCreds = {
		accessToken: data.access_token,
		refreshToken: data.refresh_token ?? creds.refreshToken,
		expiresAt: Date.now() + data.expires_in * 1000,
	};

	// Persist
	try {
		const credPath = join(process.env.HOME ?? "/home/paul", ".claude", ".credentials.json");
		const raw = JSON.parse(readFileSync(credPath, "utf-8"));
		raw.claudeAiOauth.accessToken = newCreds.accessToken;
		raw.claudeAiOauth.refreshToken = newCreds.refreshToken;
		raw.claudeAiOauth.expiresAt = newCreds.expiresAt;
		writeFileSync(credPath, JSON.stringify(raw, null, 2));
		log.info("token_refreshed");
	} catch { /* non-fatal */ }

	return newCreds;
}

// ---------------------------------------------------------------------------
// API constants
// ---------------------------------------------------------------------------

const API_URL = "https://api.anthropic.com/v1/messages?beta=true";
const BETA_FLAGS = "oauth-2025-04-20,interleaved-thinking-2025-05-14,prompt-caching-scope-2026-01-05";

export const MODELS = {
	opus: "claude-opus-4-5",
	sonnet: "claude-sonnet-4-5",
	haiku: "claude-haiku-4-5",
} as const;

const FALLBACK_CHAIN: Record<string, string[]> = {
	"claude-opus-4-5": ["claude-sonnet-4-5", "claude-haiku-4-5"],
	"claude-sonnet-4-5": ["claude-haiku-4-5"],
	"claude-haiku-4-5": [],
};

export type ModelName = keyof typeof MODELS;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class ClaudeAPI {
	private creds: OAuthCreds;
	private conversations = new Map<string, Message[]>();

	constructor() {
		this.creds = loadOAuthCreds();
		log.info("api_initialized", { expires: new Date(this.creds.expiresAt).toISOString() });
	}

	private async token(): Promise<string> {
		if (Date.now() > this.creds.expiresAt - 5 * 60_000) {
			this.creds = await refreshOAuthToken(this.creds);
		}
		return this.creds.accessToken;
	}

	private async headers(): Promise<Record<string, string>> {
		return {
			Authorization: `Bearer ${await this.token()}`,
			"anthropic-version": "2023-06-01",
			"anthropic-beta": BETA_FLAGS,
			"anthropic-dangerous-direct-browser-access": "true",
			"content-type": "application/json",
		};
	}

	getConversation(chatId: string): Message[] {
		if (!this.conversations.has(chatId)) this.conversations.set(chatId, []);
		return this.conversations.get(chatId)!;
	}

	clearConversation(chatId: string): void {
		this.conversations.delete(chatId);
	}

	/**
	 * Send a message with the full agentic tool loop.
	 *
	 * Claude thinks on your Max subscription. Tools execute locally (zero tokens).
	 * Loops until Claude is done (stop_reason !== "tool_use") or maxTurns reached.
	 */
	async sendWithTools(
		chatId: string,
		userMessage: string,
		opts: {
			model?: ModelName;
			system?: string;
			tools?: ToolDefinition[];
			executor?: ToolExecutor;
			maxTurns?: number;
			onDelta?: (delta: StreamDelta) => void;
		} = {},
	): Promise<ApiResponse> {
		const messages = this.getConversation(chatId);
		messages.push({ role: "user", content: userMessage });

		const preferredModel = MODELS[opts.model ?? "sonnet"];
		const maxTurns = opts.maxTurns ?? 15;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;
		const toolsUsed: string[] = [];
		let finalText = "";
		let usedModel: string = preferredModel;

		for (let turn = 0; turn < maxTurns; turn++) {
			const body: Record<string, unknown> = {
				model: usedModel,
				max_tokens: 4096,
				messages,
			};
			if (opts.system) body.system = opts.system;
			if (opts.tools?.length) body.tools = opts.tools;

			log.info("api_turn", { chatId, turn, model: usedModel, msgCount: messages.length });

			const hdrs = await this.headers();
			let resp = await fetch(API_URL, {
				method: "POST",
				headers: hdrs,
				body: JSON.stringify(body),
			});

			// Handle rate limit with fallback
			if (resp.status === 429) {
				const fallbacks = FALLBACK_CHAIN[usedModel] ?? [];
				let resolved = false;
				for (const fb of fallbacks) {
					log.warn("rate_limit_fallback", { from: usedModel, to: fb });
					resp = await fetch(API_URL, {
						method: "POST",
						headers: hdrs,
						body: JSON.stringify({ ...body, model: fb }),
					});
					if (resp.ok) {
						usedModel = fb;
						resolved = true;
						break;
					}
				}
				if (!resolved) {
					messages.pop(); // remove user message
					throw new RateLimitError("All models rate limited. Try again in a few minutes.");
				}
			}

			if (resp.status === 401) {
				messages.pop();
				throw new AuthError("OAuth expired. Run 'claude login' on VPS.");
			}

			if (!resp.ok) {
				const errText = await resp.text();
				messages.pop();
				throw new Error(`Claude API ${resp.status}: ${errText.slice(0, 200)}`);
			}

			const data = (await resp.json()) as {
				content: ContentBlock[];
				usage: { input_tokens: number; output_tokens: number };
				stop_reason: string;
				model: string;
			};

			totalInputTokens += data.usage.input_tokens;
			totalOutputTokens += data.usage.output_tokens;

			// Add assistant response to history
			messages.push({ role: "assistant", content: data.content });

			// Extract text blocks
			for (const block of data.content) {
				if (block.type === "text" && block.text) {
					finalText += block.text;
					opts.onDelta?.({ type: "text", text: block.text });
				}
			}

			// Check for tool use
			const toolUseBlocks = data.content.filter((b) => b.type === "tool_use");

			if (toolUseBlocks.length === 0 || data.stop_reason !== "tool_use") {
				// Done — no more tool calls
				opts.onDelta?.({ type: "done" });
				break;
			}

			// Execute tools locally (zero tokens!)
			if (!opts.executor) {
				log.warn("tool_requested_no_executor", {
					tools: toolUseBlocks.map((b) => b.name),
				});
				opts.onDelta?.({ type: "done" });
				break;
			}

			const toolResults: ContentBlock[] = [];
			for (const block of toolUseBlocks) {
				const toolName = block.name!;
				const toolInput = block.input ?? {};
				const toolId = block.id!;
				toolsUsed.push(toolName);

				opts.onDelta?.({ type: "tool_start", toolName });
				log.info("tool_executing", { tool: toolName, input: JSON.stringify(toolInput).slice(0, 100) });

				try {
					const result = await opts.executor(toolName, toolInput);
					toolResults.push({
						type: "tool_result",
						tool_use_id: toolId,
						content: result,
					});
					opts.onDelta?.({ type: "tool_done", toolName });
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					log.error("tool_failed", { tool: toolName, error: errMsg });
					toolResults.push({
						type: "tool_result",
						tool_use_id: toolId,
						content: `Error: ${errMsg}`,
						is_error: true,
					});
				}
			}

			// Send tool results back as user message
			messages.push({ role: "user", content: toolResults });
		}

		log.info("api_complete", {
			chatId,
			model: usedModel,
			turns: messages.length,
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens,
			toolsUsed,
		});

		return {
			text: finalText,
			toolsUsed,
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens,
			model: usedModel,
		};
	}

	/**
	 * Simple text-only message (no tools). For quick responses.
	 */
	async send(chatId: string, userMessage: string, opts: { model?: ModelName; system?: string } = {}): Promise<ApiResponse> {
		return this.sendWithTools(chatId, userMessage, { ...opts, tools: [], executor: undefined });
	}

	/**
	 * Compact conversation history by summarising old messages.
	 * Keeps the last `keepRecent` messages verbatim, summarises the rest.
	 */
	async compactConversation(chatId: string, keepRecent = 6): Promise<void> {
		const messages = this.getConversation(chatId);
		if (messages.length <= keepRecent + 2) return; // nothing to compact

		const oldMessages = messages.slice(0, -keepRecent);
		const recentMessages = messages.slice(-keepRecent);

		// Summarise old messages using Haiku (cheapest)
		const summaryPrompt = `Summarise this conversation concisely, preserving key facts, decisions, and context:\n\n${
			oldMessages.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content).slice(0, 200)}`).join("\n")
		}`;

		try {
			const resp = await fetch(API_URL, {
				method: "POST",
				headers: await this.headers(),
				body: JSON.stringify({
					model: MODELS.haiku,
					max_tokens: 500,
					messages: [{ role: "user", content: summaryPrompt }],
				}),
			});

			if (resp.ok) {
				const data = (await resp.json()) as { content: ContentBlock[] };
				const summary = data.content.find((b) => b.type === "text")?.text ?? "";

				// Replace conversation with summary + recent messages
				this.conversations.set(chatId, [
					{ role: "user", content: `[Previous conversation summary: ${summary}]` },
					{ role: "assistant", content: "Understood. I have the context from our previous conversation." },
					...recentMessages,
				]);
				log.info("conversation_compacted", {
					chatId,
					from: messages.length,
					to: recentMessages.length + 2,
				});
			}
		} catch (err) {
			log.warn("compaction_failed", { error: err instanceof Error ? err.message : String(err) });
		}
	}

	/**
	 * Compact all conversations. Call this from a daily cron.
	 */
	compactAll(keepRecent = 6): Promise<void[]> {
		const tasks = Array.from(this.conversations.keys()).map((chatId) =>
			this.compactConversation(chatId, keepRecent),
		);
		return Promise.all(tasks);
	}
}
