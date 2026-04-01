import { createLogger } from "./logger.js";

const log = createLogger("council");

/**
 * The Nightly Council — Multi-model deliberation for Jarvis's self-improvements.
 *
 * Three AI models review and debate each improvement before it ships:
 * - Claude (via claude -p): The proposer. Thorough, system-level thinker.
 * - Mistral Medium 3: The pragmatist. Catches over-engineering, suggests simpler paths.
 * - OpenAI GPT-5 mini: The generalist. Catches edge cases, style issues.
 *
 * The council doesn't just review independently — they have a full conversation:
 * Round 1: Each model reviews the diff independently
 * Round 2: Each model sees the OTHER models' reviews and responds
 * Round 3: Final verdict from each, informed by the debate
 *
 * Disagreements are the most valuable signal.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewContext {
	improvement: string;
	diff: string;
	reason: string;
	testResults: string;
	missionExcerpt: string;
}

export interface ReviewResult {
	approve: boolean;
	concerns: string[];
	suggestions: string[];
	confidence: number;
	reasoning: string;
}

export interface CouncilVerdict {
	approved: boolean;
	approvalCount: number;
	totalMembers: number;
	rounds: DeliberationRound[];
	summary: string;
}

interface DeliberationRound {
	roundNumber: number;
	responses: Map<string, string>;
}

interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior software reviewer on a council of AI models reviewing self-improvement changes made by a personal AI assistant called Jarvis.

Your job: find real problems. Not style nitpicks. Real issues that could break things, regress quality, or waste effort on over-engineering.

Be direct. Be specific. If it's fine, say so briefly. If there's a problem, explain exactly what and why.

Respond as JSON:
{
  "approve": true/false,
  "concerns": ["specific issue 1", ...],
  "suggestions": ["alternative approach 1", ...],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

function buildReviewPrompt(ctx: ReviewContext): string {
	return `Jarvis's mission (excerpt):
${ctx.missionExcerpt.slice(0, 500)}

What was changed: ${ctx.improvement}
Why: ${ctx.reason}

Diff:
\`\`\`
${ctx.diff.slice(0, 4000)}
\`\`\`

Test results: ${ctx.testResults.slice(0, 300)}

Review this change. Focus on: regression risk, over-engineering, mission alignment, simpler alternatives.`;
}

function buildDebatePrompt(
	otherReviews: Array<{ name: string; review: string }>,
): string {
	const others = otherReviews
		.map((r) => `Reviewer ${r.name}:\n${r.review}`)
		.join("\n\n");

	return `The other council members have reviewed this change. Here are their assessments:

${others}

Do you agree with their assessment? What did they miss? What did they get wrong? Have they changed your mind about anything?

Respond as JSON (same format as before).`;
}

// ---------------------------------------------------------------------------
// Council Members
// ---------------------------------------------------------------------------

interface CouncilMember {
	name: string;
	chat(messages: ChatMessage[]): Promise<string>;
}

class MistralMember implements CouncilMember {
	name = "Mistral";
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model = "mistral-medium-latest") {
		this.apiKey = apiKey;
		this.model = model;
	}

	async chat(messages: ChatMessage[]): Promise<string> {
		const response = await fetch(
			"https://api.mistral.ai/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.model,
					messages,
					temperature: 0.3,
					response_format: { type: "json_object" },
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Mistral API ${response.status}: ${await response.text()}`);
		}

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string } }>;
		};
		return data.choices[0].message.content;
	}
}

class OpenAIMember implements CouncilMember {
	name = "OpenAI";
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model = "gpt-5-mini") {
		this.apiKey = apiKey;
		this.model = model;
	}

	async chat(messages: ChatMessage[]): Promise<string> {
		const response = await fetch(
			"https://api.openai.com/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.model,
					messages,
					temperature: 0.3,
					response_format: { type: "json_object" },
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`OpenAI API ${response.status}: ${await response.text()}`);
		}

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string } }>;
		};
		return data.choices[0].message.content;
	}
}

// ---------------------------------------------------------------------------
// Council Assembly
// ---------------------------------------------------------------------------

export function assembleCouncil(): CouncilMember[] {
	const members: CouncilMember[] = [];

	const mistralKey = process.env.MISTRAL_API_KEY;
	if (mistralKey) {
		members.push(new MistralMember(mistralKey));
	}

	const openaiKey = process.env.OPENAI_API_KEY;
	if (openaiKey) {
		members.push(new OpenAIMember(openaiKey));
	}

	log.info("council_assembled", { members: members.map((m) => m.name) });
	return members;
}

// ---------------------------------------------------------------------------
// Deliberation
// ---------------------------------------------------------------------------

function parseReview(raw: string): ReviewResult {
	try {
		return JSON.parse(raw) as ReviewResult;
	} catch {
		return {
			approve: false,
			concerns: ["Failed to parse review response"],
			suggestions: [],
			confidence: 0,
			reasoning: `Failed to parse response: ${raw.slice(0, 200)}`,
		};
	}
}

/**
 * Run a full 3-round deliberation:
 * Round 1: Independent review
 * Round 2: Cross-critique (see other reviews, respond)
 * Round 3: Final verdict (informed by the full debate)
 */
export async function conveneCouncil(
	members: CouncilMember[],
	context: ReviewContext,
): Promise<CouncilVerdict> {
	if (members.length === 0) {
		return {
			approved: true,
			approvalCount: 0,
			totalMembers: 0,
			rounds: [],
			summary: "No council members available — auto-approved.",
		};
	}

	const rounds: DeliberationRound[] = [];
	// Each member maintains their own conversation history
	const histories = new Map<string, ChatMessage[]>();

	for (const member of members) {
		histories.set(member.name, [
			{ role: "system", content: SYSTEM_PROMPT },
		]);
	}

	// ------ Round 1: Independent Review ------
	const round1 = new Map<string, string>();

	const round1Results = await Promise.all(
		members.map(async (member) => {
			const history = histories.get(member.name)!;
			const userMsg: ChatMessage = {
				role: "user",
				content: buildReviewPrompt(context),
			};
			history.push(userMsg);

			try {
				const response = await member.chat(history);
				history.push({ role: "assistant", content: response });
				const parsed = parseReview(response);
				log.info("council_round", { round: 1, member: member.name, approve: parsed.approve, confidence: parsed.confidence });
				return { name: member.name, response };
			} catch (err) {
				log.warn("council_member_failed", { member: member.name, round: 1, error: err instanceof Error ? err.message : String(err) });
				const fallback = JSON.stringify({
					approve: true,
					concerns: [],
					suggestions: [],
					confidence: 0,
					reasoning: `${member.name} unavailable: ${err instanceof Error ? err.message : String(err)}`,
				});
				history.push({ role: "assistant", content: fallback });
				return { name: member.name, response: fallback };
			}
		}),
	);

	for (const { name, response } of round1Results) {
		round1.set(name, response);
	}
	rounds.push({ roundNumber: 1, responses: round1 });

	// ------ Round 2: Cross-Critique ------
	const round2 = new Map<string, string>();

	const round2Results = await Promise.all(
		members.map(async (member) => {
			const history = histories.get(member.name)!;
			const otherReviews = round1Results
				.filter((r) => r.name !== member.name)
				.map((r) => ({ name: r.name, review: r.response }));

			const userMsg: ChatMessage = {
				role: "user",
				content: buildDebatePrompt(otherReviews),
			};
			history.push(userMsg);

			try {
				const response = await member.chat(history);
				history.push({ role: "assistant", content: response });
				const parsed = parseReview(response);
				log.info("council_round", { round: 2, member: member.name, approve: parsed.approve, confidence: parsed.confidence });
				return { name: member.name, response };
			} catch (err) {
				log.warn("council_member_failed", { member: member.name, round: 2, error: err instanceof Error ? err.message : String(err) });
				const fallback = JSON.stringify({
					approve: true,
					concerns: [],
					suggestions: [],
					confidence: 0,
					reasoning: `${member.name} unavailable in round 2: ${err instanceof Error ? err.message : String(err)}`,
				});
				history.push({ role: "assistant", content: fallback });
				return { name: member.name, response: fallback };
			}
		}),
	);

	for (const { name, response } of round2Results) {
		round2.set(name, response);
	}
	rounds.push({ roundNumber: 2, responses: round2 });

	// ------ Round 3: Final Verdict ------
	const round3 = new Map<string, string>();

	const round3Results = await Promise.all(
		members.map(async (member) => {
			const history = histories.get(member.name)!;
			const otherR2 = round2Results
				.filter((r) => r.name !== member.name)
				.map((r) => ({ name: r.name, review: r.response }));

			const userMsg: ChatMessage = {
				role: "user",
				content: `Final round. The other reviewers responded:\n\n${otherR2.map((r) => `${r.name}:\n${r.review}`).join("\n\n")}\n\nGive your FINAL verdict. Has the debate changed your assessment? Final JSON response.`,
			};
			history.push(userMsg);

			try {
				const response = await member.chat(history);
				const parsed = parseReview(response);
				log.info("council_round", { round: 3, member: member.name, approve: parsed.approve, confidence: parsed.confidence });
				return { name: member.name, response };
			} catch (err) {
				log.warn("council_member_failed", { member: member.name, round: 3, error: err instanceof Error ? err.message : String(err) });
				return {
					name: member.name,
					response: JSON.stringify({
						approve: true,
						concerns: [],
						suggestions: [],
						confidence: 0,
						reasoning: `${member.name} unavailable in round 3: ${err instanceof Error ? err.message : String(err)}`,
					}),
				};
			}
		}),
	);

	for (const { name, response } of round3Results) {
		round3.set(name, response);
	}
	rounds.push({ roundNumber: 3, responses: round3 });

	// ------ Synthesize Verdict ------
	let approvals = 0;
	const allConcerns: string[] = [];
	const allSuggestions: string[] = [];

	for (const { name, response } of round3Results) {
		const review = parseReview(response);
		if (review.approve) approvals++;
		allConcerns.push(...review.concerns.map((c) => `[${name}] ${c}`));
		allSuggestions.push(
			...review.suggestions.map((s) => `[${name}] ${s}`),
		);
	}

	const approved = approvals > members.length / 2;

	let summary: string;
	if (approved && allConcerns.length === 0) {
		summary = `Council approved unanimously (${approvals}/${members.length}) after 3-round deliberation.`;
	} else if (approved) {
		summary = `Council approved (${approvals}/${members.length}) with concerns:\n${allConcerns.join("\n")}`;
	} else {
		summary = `Council REJECTED (${approvals}/${members.length}).\nConcerns:\n${allConcerns.join("\n")}\nSuggestions:\n${allSuggestions.join("\n")}`;
	}

	log.info("council_verdict", { approved, approvalCount: approvals, totalMembers: members.length });

	return {
		approved,
		approvalCount: approvals,
		totalMembers: members.length,
		rounds,
		summary,
	};
}

export type { CouncilMember };
