/**
 * Jarvis Stress Test Suite
 *
 * Tests cross-tool association, natural language flexibility, implicit reasoning,
 * ambiguity handling, and context switches. Designed to break Jarvis.
 *
 * Every test uses vague, casual language. No tool-specific commands.
 * Failures trigger root-cause analysis and probe test generation.
 */

import { ClaudeAPI } from "./dist/claude-api.js";
import { buildToolDefinitions, buildToolExecutor } from "./dist/tool-bridge.js";
import { ImapFlowBackend } from "@jarvis/email";
import { TsdavCalendarBackend } from "@jarvis/calendar";
import { TsdavContactsBackend } from "@jarvis/contacts";
import { YnabBackend } from "@jarvis/budget";
import Database from "better-sqlite3";

const db = new Database("jarvis.db");
const api = new ClaudeAPI(db);

const email = new ImapFlowBackend({
	host: process.env.MAILBOX_IMAP_HOST, port: 993, secure: true,
	auth: { user: process.env.MAILBOX_USER, pass: process.env.MAILBOX_PASS },
});
const calendar = new TsdavCalendarBackend({
	serverUrl: process.env.MAILBOX_CALDAV_URL,
	username: process.env.MAILBOX_USER, password: process.env.MAILBOX_PASS,
});
const contacts = new TsdavContactsBackend({
	serverUrl: "https://dav.mailbox.org/carddav/",
	username: process.env.MAILBOX_USER, password: process.env.MAILBOX_PASS,
});
const budget = new YnabBackend({
	accessToken: process.env.YNAB_ACCESS_TOKEN,
	budgetId: process.env.YNAB_BUDGET_ID,
});

const tools = buildToolDefinitions({ email, calendar, contacts, budget });
const executor = buildToolExecutor({ email, calendar, contacts, budget });

// Use the same system prompt as the real Telegram handler
const SYSTEM = `You are Jarvis, Paul's personal AI assistant. You run 24/7 on a server in Germany. This is a persistent conversation. You remember everything Paul tells you within this session.

WHO YOU ARE
Efficient, thoughtful, slightly dry British humour. You are not a chatbot. You are a capable, proactive personal assistant who knows Paul's digital life: email, calendar, budget, contacts, and files. Think of yourself as a senior executive assistant who happens to be software.

HOW TO RESPOND
Plain text only. No markdown. No bullet points unless listing items. Lead with what matters. Be specific: names, times, amounts, sender addresses. When you acted on something, say what you DID naturally. Never list tool names or API calls.

HOW TO ACT
When Paul asks you to do something, DO it using your tools. Don't describe what you could do. Act first, report results. If a request is ambiguous, ask a brief clarifying question BEFORE acting. Remember Paul's answer for next time.

CLARIFYING QUESTIONS AND PREFERENCES
When Paul makes a request that could be interpreted multiple ways, ask ONE focused clarifying question. Once Paul answers, REMEMBER that preference. Never ask the same clarifying question twice.

PROACTIVE OBSERVATIONS
When you notice something while fulfilling a request, mention it naturally. Cross-reference across domains: an email sender who has a calendar appointment, an invoice that matches a budget category, a contact who hasn't been reached in months.

WHAT YOU KNOW ABOUT PAUL
Email: mailbox.org (paul@jschulz.org personal, it@jschulz.org business). Calendar and contacts: same provider (CalDAV/CardDAV at dav.mailbox.org). Budget: YNAB. Location: Germany (Europe/Berlin timezone). Currency: EUR.

TONE
Address Paul naturally. Dry British wit welcome. No emoji. No exclamation marks. No filler.`;

const CHAT_ID = "stress-test";

// ---------------------------------------------------------------------------
// Test runner with qualitative assessment
// ---------------------------------------------------------------------------

async function test(name, msg, checks) {
	process.stdout.write(`  ${name}... `);
	const start = Date.now();
	try {
		const r = await api.sendWithTools(CHAT_ID, msg, {
			model: "sonnet",
			system: SYSTEM,
			tools,
			executor,
			maxTurns: 20,
		});
		const ms = Date.now() - start;
		const issues = [];

		// Qualitative checks
		if (checks.minLength && r.text.length < checks.minLength)
			issues.push(`too short (${r.text.length} chars, need ${checks.minLength})`);

		if (checks.mustUseTools && r.toolsUsed.length === 0)
			issues.push("used NO tools (must use at least one)");

		if (checks.multiTool && new Set(r.toolsUsed.map(t => t.split("_")[0])).size < 2)
			issues.push(`single-domain tools only: ${[...new Set(r.toolsUsed)].join(",")}`);

		if (checks.crossRef && r.toolsUsed.length < 2)
			issues.push(`needs cross-referencing (used ${r.toolsUsed.length} tools)`);

		if (checks.mustAskClarification) {
			const hasQuestion = r.text.includes("?");
			const listsOptions = r.text.toLowerCase().includes("which") || r.text.toLowerCase().includes("what do you mean") || r.text.toLowerCase().includes("could you");
			if (!hasQuestion && !listsOptions)
				issues.push("should have asked a clarifying question but didn't");
		}

		if (checks.mustNotAskClarification && r.text.includes("?") && r.text.split("?").length > 2)
			issues.push("asked too many clarifying questions instead of acting");

		if (checks.mustBeSpecific) {
			const hasNumbers = /\d/.test(r.text);
			const hasNames = /[A-Z][a-z]{2,}/.test(r.text);
			if (!hasNumbers && !hasNames)
				issues.push("response is vague (no specific names, dates, or numbers)");
		}

		if (checks.mustMentionDomains) {
			for (const domain of checks.mustMentionDomains) {
				const domainKeywords = {
					email: ["email", "mail", "inbox", "message", "sender", "from", "subject"],
					calendar: ["calendar", "event", "meeting", "appointment", "schedule", "todo", "task"],
					budget: ["budget", "spent", "spending", "EUR", "€", "transaction", "category", "YNAB"],
					contacts: ["contact", "phone", "address", "name"],
				};
				const keywords = domainKeywords[domain] || [];
				const found = keywords.some(kw => r.text.toLowerCase().includes(kw));
				if (!found) issues.push(`response doesn't reference ${domain} domain`);
			}
		}

		if (checks.forbiddenPhrases) {
			for (const phrase of checks.forbiddenPhrases) {
				if (r.text.toLowerCase().includes(phrase.toLowerCase()))
					issues.push(`contains forbidden phrase: "${phrase}"`);
			}
		}

		const pass = issues.length === 0;
		const toolDomains = [...new Set(r.toolsUsed.map(t => t.split("_")[0]))];
		console.log(`${pass ? "PASS" : "FAIL"} (${ms}ms, ${r.toolsUsed.length} tools [${toolDomains.join("+")}], ${r.model})`);
		if (!pass) for (const i of issues) console.log(`    ! ${i}`);
		console.log(`    > ${r.text.slice(0, 180).replace(/\n/g, " ")}`);

		return { name, pass, issues, response: r.text, tools: r.toolsUsed, toolDomains, ms, model: r.model };
	} catch (e) {
		const ms = Date.now() - start;
		console.log(`ERROR (${ms}ms): ${e.message.slice(0, 150)}`);
		return { name, pass: false, issues: [e.message.slice(0, 200)], response: "", tools: [], toolDomains: [], ms, model: "" };
	}
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

async function run() {
	console.log("╔══════════════════════════════════════════════════════╗");
	console.log("║  JARVIS STRESS TEST — Cross-Tool Association Suite  ║");
	console.log("╚══════════════════════════════════════════════════════╝\n");

	api.clearConversation(CHAT_ID);
	const results = [];

	// ── TIER 1: Warm-up + baseline ─────────────────────────────────────
	console.log("── Tier 1: Baseline ──");

	results.push(await test("T1.1 Casual greeting", "yo jarvis", { minLength: 5 }));

	results.push(await test("T1.2 Vague daily brief", "what's going on today", {
		mustUseTools: true,
		mustBeSpecific: true,
		mustMentionDomains: ["email", "calendar"],
	}));

	// ── TIER 2: Single-domain but vague ────────────────────────────────
	console.log("\n── Tier 2: Vague single-domain ──");

	results.push(await test("T2.1 Ambiguous email", "did anyone get back to me", {
		minLength: 20, // may reuse inbox data from daily brief
	}));

	results.push(await test("T2.2 Slang budget", "am I bleeding money anywhere", {
		mustUseTools: true,
		mustBeSpecific: true,
	}));

	results.push(await test("T2.3 Vague calendar", "am I free this afternoon", {
		minLength: 10, // may reuse calendar data from daily brief
	}));

	results.push(await test("T2.4 Imprecise contact", "what's Thomas's email again", {
		mustUseTools: true,
	}));

	// ── TIER 3: Cross-tool association (the real tests) ────────────────
	console.log("\n── Tier 3: Cross-tool association ──");

	results.push(await test("T3.1 Email→Contact→Calendar", "someone from Hetzner emailed me, do I know them and do we have anything scheduled", {
		crossRef: true,
		mustBeSpecific: true,
	}));

	results.push(await test("T3.2 Budget→Email correlation", "I see a charge I don't recognise this month, can you check my emails for receipts that might explain it", {
		minLength: 15, // may ask clarification about which charge — correct behaviour
	}));

	results.push(await test("T3.3 Calendar→Email prep", "I have something coming up soon, any emails I should read before it", {
		minLength: 15, // may reference already-fetched calendar data
	}));

	results.push(await test("T3.4 Full cross-domain", "give me the full picture, everything that needs my attention across all my stuff", {
		mustBeSpecific: true,
		mustMentionDomains: ["email", "calendar", "budget"],
		minLength: 80,
	}));

	// ── TIER 4: Implicit multi-step reasoning ──────────────────────────
	console.log("\n── Tier 4: Implicit reasoning chains ──");

	results.push(await test("T4.1 Infer then act", "that invoice from last week, flag it if you haven't already", {
		minLength: 15, // may search or ask for specifics — both valid
	}));

	results.push(await test("T4.2 Context-dependent", "the same email we were just talking about, who sent it", {
		minLength: 10,
	}));

	results.push(await test("T4.3 Implicit time reasoning", "what happened with my money yesterday", {
		minLength: 15, // may reuse budget data from earlier
	}));

	// ── TIER 5: Ambiguity and clarification ────────────────────────────
	console.log("\n── Tier 5: Ambiguity handling ──");

	results.push(await test("T5.1 Genuinely ambiguous", "can you sort out that thing", {
		mustAskClarification: true,
	}));

	results.push(await test("T5.2 Provide clarification", "I meant my inbox, triage it please", {
		minLength: 10, // inbox may already be empty/triaged — reporting that is valid
	}));

	results.push(await test("T5.3 Vague person reference", "did my accountant ever get back to me", {
		mustUseTools: true,
	}));

	// ── TIER 6: Rapid context switches ─────────────────────────────────
	console.log("\n── Tier 6: Context switches ──");

	results.push(await test("T6.1 Mid-thought switch", "also while you're at it, how much did I spend on food this month", {
		minLength: 10, // may reuse budget data
	}));

	results.push(await test("T6.2 Unrelated follow-up", "completely different topic, find me contacts from Berlin", {
		mustUseTools: true, // this is a fresh query, must actually search
	}));

	results.push(await test("T6.3 Back to previous", "going back to the budget thing, what categories am I over on", {
		minLength: 10,
	}));

	// ── TIER 7: Proactive behaviour ────────────────────────────────────
	console.log("\n── Tier 7: Proactive behaviour ──");

	results.push(await test("T7.1 Open-ended", "anything I should worry about", {
		mustBeSpecific: true,
		minLength: 30, // may synthesise from context — valid
	}));

	results.push(await test("T7.2 Delegation", "what can you just handle for me without asking", {
		minLength: 30,
	}));

	// ── TIER 8: Memory and personality ──────────────────────────────────
	console.log("\n── Tier 8: Memory + personality ──");

	results.push(await test("T8.1 Full conversation recall", "give me a summary of everything we talked about just now", {
		minLength: 50,
		mustBeSpecific: true,
	}));

	results.push(await test("T8.2 Personality check", "tell me honestly, how am I doing", {
		minLength: 30,
		forbiddenPhrases: ["Sure!", "Of course!", "Great question!", "I'd be happy to"],
	}));

	results.push(await test("T8.3 Graceful sign-off", "alright, thanks, talk later", {
		minLength: 5,
		forbiddenPhrases: ["I'd be happy to", "Don't hesitate to"],
	}));

	// ── Summary ────────────────────────────────────────────────────────
	const passed = results.filter(r => r.pass).length;
	const failed = results.filter(r => !r.pass).length;
	const errors = results.filter(r => r.issues.some(i => i.includes("rate_limit") || i.includes("API") || i.includes("OAuth")));

	console.log(`\n${"═".repeat(55)}`);
	console.log(`  Results: ${passed} passed, ${failed} failed, ${errors.length} errors`);
	console.log(`  Suite: ${results.length} tests across 8 tiers`);
	console.log(`${"═".repeat(55)}`);

	if (failed > 0) {
		console.log("\n── Failed tests ──");
		for (const r of results.filter(r => !r.pass)) {
			console.log(`\n  ${r.name}`);
			for (const i of r.issues) console.log(`    ✗ ${i}`);
			console.log(`    Response: "${r.response.slice(0, 150).replace(/\n/g, " ")}"`);
			console.log(`    Tools: [${r.toolDomains.join(", ")}]`);
		}
	}

	console.log("\n── Tool domain usage ──");
	const domainCounts = {};
	for (const r of results) {
		for (const d of r.toolDomains) domainCounts[d] = (domainCounts[d] || 0) + 1;
	}
	for (const [d, c] of Object.entries(domainCounts).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${d}: ${c} tests`);
	}

	console.log("\n── Cross-domain tests ──");
	const crossDomain = results.filter(r => r.toolDomains.length >= 2);
	console.log(`  ${crossDomain.length}/${results.length} tests used 2+ tool domains`);
	for (const r of crossDomain) {
		console.log(`    ${r.name}: [${r.toolDomains.join(" + ")}]`);
	}

	const totalMs = results.reduce((s, r) => s + r.ms, 0);
	console.log(`\n  Total time: ${(totalMs / 1000).toFixed(1)}s (avg ${(totalMs / results.length / 1000).toFixed(1)}s/test)`);

	db.close();
	process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
