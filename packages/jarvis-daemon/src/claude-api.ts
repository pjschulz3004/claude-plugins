/**
 * Direct Claude API client using Max subscription OAuth token.
 *
 * No CLI subprocess. No cold start. Direct HTTPS to api.anthropic.com
 * with Bearer token auth and the oauth-2025-04-20 beta flag.
 *
 * Supports:
 * - Multi-turn conversations (maintains message history)
 * - Streaming responses (SSE)
 * - Tool use (MCP tools defined inline)
 * - Token refresh when OAuth token expires
 * - Model selection (opus, sonnet, haiku)
 */

import { createLogger } from "./logger.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const log = createLogger("claude-api");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RateLimitError";
	}
}

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthError";
	}
}

export interface Message {
	role: "user" | "assistant";
	content: string | ContentBlock[];
}

export interface ContentBlock {
	type: "text" | "tool_use" | "tool_result";
	text?: string;
	id?: string;
	name?: string;
	input?: Record<string, unknown>;
	tool_use_id?: string;
	content?: string;
}

export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: Record<string, unknown>;
}

export interface StreamDelta {
	type: "text" | "tool_use_start" | "tool_use_input" | "done" | "error";
	text?: string;
	toolName?: string;
	error?: string;
}

export interface ApiResponse {
	text: string;
	toolCalls: Array<{ name: string; input: Record<string, unknown>; id: string }>;
	inputTokens: number;
	outputTokens: number;
	stopReason: string;
}

// ---------------------------------------------------------------------------
// OAuth token management
// ---------------------------------------------------------------------------

interface OAuthCredentials {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

function loadCredentials(): OAuthCredentials {
	const credPath = join(
		process.env.HOME ?? "/home/paul",
		".claude",
		".credentials.json",
	);
	const raw = JSON.parse(readFileSync(credPath, "utf-8"));
	const oauth = raw.claudeAiOauth;
	return {
		accessToken: oauth.accessToken,
		refreshToken: oauth.refreshToken,
		expiresAt: oauth.expiresAt,
	};
}

function isTokenExpired(creds: OAuthCredentials): boolean {
	// Refresh 5 minutes before expiry
	return Date.now() > creds.expiresAt - 5 * 60 * 1000;
}

async function refreshToken(creds: OAuthCredentials): Promise<OAuthCredentials> {
	log.info("token_refresh_start");
	const response = await fetch("https://claude.ai/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "refresh_token",
			refresh_token: creds.refreshToken,
			client_id: "ce61e8e7-4e6e-4a69-b637-27735ce13e3f", // Claude Code PKCE client
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		log.error("token_refresh_failed", { status: response.status, body: text.slice(0, 200) });
		throw new Error(`Token refresh failed: ${response.status}`);
	}

	const data = (await response.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	};

	const newCreds: OAuthCredentials = {
		accessToken: data.access_token,
		refreshToken: data.refresh_token ?? creds.refreshToken,
		expiresAt: Date.now() + data.expires_in * 1000,
	};

	// Persist refreshed token
	try {
		const credPath = join(
			process.env.HOME ?? "/home/paul",
			".claude",
			".credentials.json",
		);
		const raw = JSON.parse(readFileSync(credPath, "utf-8"));
		raw.claudeAiOauth.accessToken = newCreds.accessToken;
		raw.claudeAiOauth.refreshToken = newCreds.refreshToken;
		raw.claudeAiOauth.expiresAt = newCreds.expiresAt;
		writeFileSync(credPath, JSON.stringify(raw, null, 2));
		log.info("token_refresh_persisted");
	} catch (err) {
		log.warn("token_refresh_persist_failed", {
			error: err instanceof Error ? err.message : String(err),
		});
	}

	return newCreds;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const API_URL = "https://api.anthropic.com/v1/messages?beta=true";
const BETA_FLAGS = "oauth-2025-04-20,interleaved-thinking-2025-05-14,prompt-caching-scope-2026-01-05";

export const MODELS = {
	opus: "claude-opus-4-5",
	sonnet: "claude-sonnet-4-5",
	haiku: "claude-haiku-4-5",
} as const;

/** Fallback chain: try preferred model, then fall back to cheaper models */
const FALLBACK_CHAIN: Record<string, string[]> = {
	"claude-opus-4-5": ["claude-sonnet-4-5", "claude-haiku-4-5"],
	"claude-sonnet-4-5": ["claude-haiku-4-5"],
	"claude-haiku-4-5": [],
};

export type ModelName = keyof typeof MODELS;

export class ClaudeAPI {
	private creds: OAuthCredentials;
	private conversations: Map<string, Message[]> = new Map();

	constructor() {
		this.creds = loadCredentials();
		log.info("api_client_initialized", {
			tokenExpires: new Date(this.creds.expiresAt).toISOString(),
		});
	}

	private async ensureToken(): Promise<string> {
		if (isTokenExpired(this.creds)) {
			this.creds = await refreshToken(this.creds);
		}
		return this.creds.accessToken;
	}

	private headers(token: string): Record<string, string> {
		return {
			Authorization: `Bearer ${token}`,
			"anthropic-version": "2023-06-01",
			"anthropic-beta": BETA_FLAGS,
			"anthropic-dangerous-direct-browser-access": "true",
			"content-type": "application/json",
		};
	}

	/**
	 * Get or create a conversation for a chat ID.
	 */
	getConversation(chatId: string): Message[] {
		if (!this.conversations.has(chatId)) {
			this.conversations.set(chatId, []);
		}
		return this.conversations.get(chatId)!;
	}

	/**
	 * Clear conversation history for a chat.
	 */
	clearConversation(chatId: string): void {
		this.conversations.delete(chatId);
		log.info("conversation_cleared", { chatId });
	}

	/**
	 * Send a message and get a complete response (non-streaming).
	 */
	async send(
		chatId: string,
		userMessage: string,
		opts: {
			model?: ModelName;
			system?: string;
			maxTokens?: number;
			tools?: ToolDefinition[];
		} = {},
	): Promise<ApiResponse> {
		const token = await this.ensureToken();
		const messages = this.getConversation(chatId);

		// Add user message to history
		messages.push({ role: "user", content: userMessage });

		const model = MODELS[opts.model ?? "sonnet"];
		const body: Record<string, unknown> = {
			model,
			max_tokens: opts.maxTokens ?? 4096,
			messages,
		};
		if (opts.system) body.system = opts.system;
		if (opts.tools?.length) body.tools = opts.tools;

		log.info("api_request", {
			chatId,
			model,
			messageCount: messages.length,
			userPreview: userMessage.slice(0, 80),
		});

		const startMs = Date.now();
		const response = await fetch(API_URL, {
			method: "POST",
			headers: this.headers(token),
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();

			// Try fallback models on rate limit
			if (response.status === 429) {
				const fallbacks = FALLBACK_CHAIN[model] ?? [];
				for (const fallbackModel of fallbacks) {
					log.warn("api_rate_limited_fallback", { from: model, to: fallbackModel });
					const fallbackBody = { ...body, model: fallbackModel };
					const fallbackResponse = await fetch(API_URL, {
						method: "POST",
						headers: this.headers(token),
						body: JSON.stringify(fallbackBody),
					});
					if (fallbackResponse.ok) {
						const fbData = (await fallbackResponse.json()) as {
							content: ContentBlock[];
							usage: { input_tokens: number; output_tokens: number };
							stop_reason: string;
						};
						let fbText = "";
						const fbToolCalls: ApiResponse["toolCalls"] = [];
						for (const block of fbData.content) {
							if (block.type === "text" && block.text) fbText += block.text;
							else if (block.type === "tool_use" && block.name && block.id)
								fbToolCalls.push({ name: block.name, input: block.input ?? {}, id: block.id });
						}
						messages.push({ role: "assistant", content: fbData.content });
						log.info("api_fallback_success", { model: fallbackModel });
						return {
							text: fbText,
							toolCalls: fbToolCalls,
							inputTokens: fbData.usage.input_tokens,
							outputTokens: fbData.usage.output_tokens,
							stopReason: fbData.stop_reason,
						};
					}
					// This fallback also rate limited, try next
				}
				// All fallbacks exhausted
				messages.pop();
				throw new RateLimitError("All models are currently rate limited. Try again in a few minutes.");
			}

			if (response.status === 401) {
				messages.pop();
				throw new AuthError("OAuth token expired. Run 'claude login' on the VPS to refresh.");
			}

			log.error("api_error", { status: response.status, error: errorText.slice(0, 200) });
			messages.pop();
			throw new Error(`Claude API ${response.status}: ${errorText.slice(0, 200)}`);
		}

		const data = (await response.json()) as {
			content: ContentBlock[];
			usage: { input_tokens: number; output_tokens: number };
			stop_reason: string;
		};

		// Extract text and tool calls
		let text = "";
		const toolCalls: ApiResponse["toolCalls"] = [];
		for (const block of data.content) {
			if (block.type === "text" && block.text) {
				text += block.text;
			} else if (block.type === "tool_use" && block.name && block.id) {
				toolCalls.push({
					name: block.name,
					input: block.input ?? {},
					id: block.id,
				});
			}
		}

		// Add assistant response to history
		messages.push({ role: "assistant", content: data.content });

		const durationMs = Date.now() - startMs;
		log.info("api_response", {
			chatId,
			model,
			duration_ms: durationMs,
			input_tokens: data.usage.input_tokens,
			output_tokens: data.usage.output_tokens,
			stop_reason: data.stop_reason,
			text_preview: text.slice(0, 80),
			tool_calls: toolCalls.length,
		});

		return {
			text,
			toolCalls,
			inputTokens: data.usage.input_tokens,
			outputTokens: data.usage.output_tokens,
			stopReason: data.stop_reason,
		};
	}

	/**
	 * Send a message with streaming response.
	 * Calls onDelta for each text chunk or tool use event.
	 */
	async sendStreaming(
		chatId: string,
		userMessage: string,
		opts: {
			model?: ModelName;
			system?: string;
			maxTokens?: number;
			tools?: ToolDefinition[];
			onDelta?: (delta: StreamDelta) => void;
		} = {},
	): Promise<ApiResponse> {
		const token = await this.ensureToken();
		const messages = this.getConversation(chatId);

		messages.push({ role: "user", content: userMessage });

		const model = MODELS[opts.model ?? "sonnet"];
		const body: Record<string, unknown> = {
			model,
			max_tokens: opts.maxTokens ?? 4096,
			messages,
			stream: true,
		};
		if (opts.system) body.system = opts.system;
		if (opts.tools?.length) body.tools = opts.tools;

		log.info("api_stream_start", {
			chatId,
			model,
			messageCount: messages.length,
		});

		const startMs = Date.now();
		const response = await fetch(API_URL, {
			method: "POST",
			headers: this.headers(token),
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			if (response.status === 429) {
				// Try fallback models
				const fallbacks = FALLBACK_CHAIN[model] ?? [];
				for (const fb of fallbacks) {
					log.warn("api_stream_rate_limited_fallback", { from: model, to: fb });
					const fbBody = { ...body, model: fb };
					const fbResponse = await fetch(API_URL, {
						method: "POST",
						headers: this.headers(token),
						body: JSON.stringify(fbBody),
					});
					if (fbResponse.ok) {
						// Replace response variable and continue with streaming parse below
						// Can't easily swap — just do non-streaming fallback
						const fbData = (await fbResponse.json()) as {
							content: ContentBlock[];
							usage: { input_tokens: number; output_tokens: number };
							stop_reason: string;
						};
						let fbText = "";
						const fbToolCalls: ApiResponse["toolCalls"] = [];
						for (const block of fbData.content) {
							if (block.type === "text" && block.text) fbText += block.text;
							else if (block.type === "tool_use" && block.name && block.id)
								fbToolCalls.push({ name: block.name, input: block.input ?? {}, id: block.id });
						}
						messages.push({ role: "assistant", content: fbData.content });
						opts.onDelta?.({ type: "text", text: fbText });
						opts.onDelta?.({ type: "done" });
						return {
							text: fbText, toolCalls: fbToolCalls,
							inputTokens: fbData.usage.input_tokens, outputTokens: fbData.usage.output_tokens,
							stopReason: fbData.stop_reason,
						};
					}
				}
				messages.pop();
				throw new RateLimitError("All models are currently rate limited. Try again in a few minutes.");
			}
			if (response.status === 401) {
				messages.pop();
				throw new AuthError("OAuth token expired. Run 'claude login' on the VPS to refresh.");
			}
			messages.pop();
			throw new Error(`Claude API ${response.status}: ${errorText.slice(0, 200)}`);
		}

		// Parse SSE stream
		let fullText = "";
		const toolCalls: ApiResponse["toolCalls"] = [];
		let inputTokens = 0;
		let outputTokens = 0;
		let stopReason = "";
		let currentToolName = "";
		let currentToolId = "";
		let currentToolInput = "";

		const reader = response.body?.getReader();
		if (!reader) throw new Error("No response body");

		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const jsonStr = line.slice(6).trim();
				if (jsonStr === "[DONE]") continue;

				let event: Record<string, unknown>;
				try {
					event = JSON.parse(jsonStr);
				} catch {
					continue;
				}

				const eventType = event.type as string;

				if (eventType === "content_block_start") {
					const blockType = (event.content_block as Record<string, unknown>)?.type;
					if (blockType === "tool_use") {
						currentToolName = (event.content_block as Record<string, string>)?.name ?? "";
						currentToolId = (event.content_block as Record<string, string>)?.id ?? "";
						currentToolInput = "";
						opts.onDelta?.({
							type: "tool_use_start",
							toolName: currentToolName,
						});
					}
				} else if (eventType === "content_block_delta") {
					const delta = event.delta as Record<string, string> | undefined;
					if (delta?.type === "text_delta" && delta.text) {
						fullText += delta.text;
						opts.onDelta?.({ type: "text", text: delta.text });
					} else if (delta?.type === "input_json_delta" && delta.partial_json) {
						currentToolInput += delta.partial_json;
					}
				} else if (eventType === "content_block_stop") {
					if (currentToolName && currentToolId) {
						let parsedInput: Record<string, unknown> = {};
						try {
							parsedInput = JSON.parse(currentToolInput);
						} catch { /* empty */ }
						toolCalls.push({
							name: currentToolName,
							input: parsedInput,
							id: currentToolId,
						});
						currentToolName = "";
						currentToolId = "";
						currentToolInput = "";
					}
				} else if (eventType === "message_delta") {
					stopReason = (event.delta as Record<string, string>)?.stop_reason ?? "";
					const usage = event.usage as Record<string, number> | undefined;
					if (usage?.output_tokens) outputTokens = usage.output_tokens;
				} else if (eventType === "message_start") {
					const usage = (event.message as Record<string, unknown>)?.usage as Record<string, number> | undefined;
					if (usage?.input_tokens) inputTokens = usage.input_tokens;
				}
			}
		}

		// Add assistant response to history
		const contentBlocks: ContentBlock[] = [];
		if (fullText) contentBlocks.push({ type: "text", text: fullText });
		for (const tc of toolCalls) {
			contentBlocks.push({
				type: "tool_use",
				id: tc.id,
				name: tc.name,
				input: tc.input,
			});
		}
		messages.push({ role: "assistant", content: contentBlocks });

		opts.onDelta?.({ type: "done" });

		const durationMs = Date.now() - startMs;
		log.info("api_stream_complete", {
			chatId,
			model,
			duration_ms: durationMs,
			input_tokens: inputTokens,
			output_tokens: outputTokens,
			text_length: fullText.length,
			tool_calls: toolCalls.length,
		});

		return {
			text: fullText,
			toolCalls,
			inputTokens,
			outputTokens,
			stopReason,
		};
	}

	/**
	 * Prune old conversations to prevent memory growth.
	 * Keeps only the last N messages per chat.
	 */
	pruneConversations(maxMessagesPerChat = 50): void {
		for (const [chatId, messages] of this.conversations) {
			if (messages.length > maxMessagesPerChat) {
				const pruned = messages.slice(-maxMessagesPerChat);
				this.conversations.set(chatId, pruned);
				log.debug("conversation_pruned", {
					chatId,
					from: messages.length,
					to: pruned.length,
				});
			}
		}
	}
}
