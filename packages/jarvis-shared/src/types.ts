import { z } from "zod";

// MCP tool result shape
export interface ToolResult {
	content: Array<{ type: "text"; text: string }>;
}

// Credential loading config
export interface CredentialConfig {
	prefix: string;
	required: string[];
}

// Circuit breaker states
export enum BreakerState {
	CLOSED = "closed",
	OPEN = "open",
	HALF_OPEN = "half_open",
}

// Task ledger entry
export interface LedgerEntry {
	id?: number;
	task_name: string;
	status: "success" | "failure" | "skipped";
	started_at: string; // ISO 8601
	duration_ms: number;
	error?: string;
	cost_usd?: number;
	input_tokens?: number;
	output_tokens?: number;
	decision_summary?: string;
}

// Breaker configuration
export interface BreakerConfig {
	failureThreshold: number; // default 3
	cooldownMs: number; // default 60_000
}

// Helper to create MCP tool results
export function toolResult(text: string): ToolResult {
	return { content: [{ type: "text", text }] };
}

// Zod schema for LedgerEntry (for validation)
export const LedgerEntrySchema = z.object({
	task_name: z.string(),
	status: z.enum(["success", "failure", "skipped"]),
	started_at: z.string(),
	duration_ms: z.number(),
	error: z.string().optional(),
	cost_usd: z.number().optional(),
	input_tokens: z.number().optional(),
	output_tokens: z.number().optional(),
	decision_summary: z.string().optional(),
});
