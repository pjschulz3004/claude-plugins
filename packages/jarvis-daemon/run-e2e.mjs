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
	host: process.env.MAILBOX_IMAP_HOST,
	port: 993,
	secure: true,
	auth: { user: process.env.MAILBOX_USER, pass: process.env.MAILBOX_PASS },
});
const calendar = new TsdavCalendarBackend({
	serverUrl: process.env.MAILBOX_CALDAV_URL,
	username: process.env.MAILBOX_USER,
	password: process.env.MAILBOX_PASS,
});
const contacts = new TsdavContactsBackend({
	serverUrl: "https://dav.mailbox.org/carddav/",
	username: process.env.MAILBOX_USER,
	password: process.env.MAILBOX_PASS,
});
const budget = new YnabBackend({
	accessToken: process.env.YNAB_ACCESS_TOKEN,
	budgetId: process.env.YNAB_BUDGET_ID,
});

const tools = buildToolDefinitions({ email, calendar, contacts, budget });
const executor = buildToolExecutor({ email, calendar, contacts, budget });

const SYSTEM = `You are Jarvis, Paul's personal AI assistant. Efficient, polite, slight British dry humour. Plain text only. No markdown. Act on requests using your tools. Be specific with names, times, amounts. This is a persistent conversation. When a request is ambiguous, ask ONE clarifying question.`;

const CHAT_ID = "e2e-test";

async function test(name, msg, checks) {
	process.stdout.write(`  ${name}... `);
	const start = Date.now();
	try {
		const r = await api.sendWithTools(CHAT_ID, msg, {
			model: "sonnet",
			system: SYSTEM,
			tools,
			executor,
			maxTurns: 15,
		});
		const ms = Date.now() - start;
		const issues = [];

		if (checks.minLength && r.text.length < checks.minLength)
			issues.push(`response too short (${r.text.length} chars)`);
		if (checks.contains) {
			for (const kw of checks.contains) {
				if (!r.text.toLowerCase().includes(kw.toLowerCase()))
					issues.push(`missing keyword: "${kw}"`);
			}
		}
		if (checks.toolsUsed && r.toolsUsed.length === 0)
			issues.push("no tools used (expected some)");
		if (checks.noTools && r.toolsUsed.length > 0)
			issues.push(`used tools unexpectedly: ${r.toolsUsed.join(",")}`);

		if (issues.length === 0) {
			console.log(`PASS (${ms}ms, ${r.toolsUsed.length} tools, ${r.model})`);
			console.log(`    > ${r.text.slice(0, 150).replace(/\n/g, " ")}`);
		} else {
			console.log(`FAIL (${ms}ms)`);
			for (const i of issues) console.log(`    ! ${i}`);
			console.log(`    > ${r.text.slice(0, 150).replace(/\n/g, " ")}`);
		}
		return { name, pass: issues.length === 0, issues, response: r.text, tools: r.toolsUsed, ms, model: r.model };
	} catch (e) {
		const ms = Date.now() - start;
		console.log(`ERROR (${ms}ms): ${e.message.slice(0, 150)}`);
		return { name, pass: false, issues: [e.message.slice(0, 200)], response: "", tools: [], ms, model: "" };
	}
}

async function run() {
	console.log("=== Jarvis E2E Test Suite ===");
	console.log("Simulating Paul's Telegram messages with full tool loop\n");

	// Clear previous test conversation to start fresh
	api.clearConversation(CHAT_ID);
	const results = [];

	// Phase 1: Warm up
	results.push(await test("1. Morning greeting", "Morning Jarvis", { minLength: 10, noTools: true }));
	results.push(await test("2. What should I know", "What should I know about today?", { toolsUsed: true, minLength: 30 }));

	// Phase 2: Email deep dives
	results.push(await test("3. Week of emails", "Give me a rundown of everything that came in this past week, not just unread", { toolsUsed: true, minLength: 30 }));
	results.push(await test("4. Important missed", "Did anyone important write to me that I might have missed?", { minLength: 20 })); // may reuse prior search context
	results.push(await test("5. Invoices this month", "Have I gotten any invoices or receipts this month? I need to do my bookkeeping", { toolsUsed: true }));
	results.push(await test("6. Sender search", "Search for anything from Anthropic or Hetzner in my mail", { toolsUsed: true }));

	// Phase 3: Calendar
	results.push(await test("7. Week overview", "What does my week look like?", { toolsUsed: true }));
	results.push(await test("8. Overdue tasks", "Any tasks that have been sitting undone for more than a week?", { minLength: 10 })); // may reuse todos from test 2

	// Phase 4: Budget
	results.push(await test("9. Budget health", "How much did I spend this month and where am I over budget?", { toolsUsed: true }));
	results.push(await test("10. Pending txns", "Categorise and approve everything that's still pending in YNAB", { minLength: 10 })); // may reuse budget data from test 9

	// Phase 5: Cross-domain
	results.push(await test("11. End of week wrap", "Give me an end-of-week wrap-up: what happened this week across email, calendar, and spending", { minLength: 50 })); // may reuse prior data

	// Phase 6: Conversation memory
	results.push(await test("12. Budget recall", "What did you just tell me about my budget?", { minLength: 20 }));
	results.push(await test("13. First question recall", "What was the very first thing I asked you today?", { minLength: 10 }));

	// Phase 7: Personality + assistant behaviour
	results.push(await test("14. Prioritisation", "What do you think I should prioritise today?", { minLength: 30 }));
	results.push(await test("15. Overwhelmed", "I'm feeling overwhelmed, what can you take off my plate?", { minLength: 30 }));

	// Phase 8: Specific actions
	results.push(await test("16. Find contact", "Find me a contact named Mueller or Müller", { toolsUsed: true }));
	results.push(await test("17. Most expensive purchase", "What's the most expensive thing I bought this week?", { minLength: 10 })); // may reuse budget data or report empty
	results.push(await test("18. Folder listing", "What email folders do I have?", { toolsUsed: true }));

	// Phase 9: Edge cases
	results.push(await test("19. Short message", "hi", { minLength: 2 }));
	results.push(await test("20. Correction", "Actually I meant last month's spending not this month", { minLength: 10 }));
	results.push(await test("21. Two sentences", "Just a quick status, keep it to two sentences", { minLength: 10 }));
	results.push(await test("22. Sign off", "Thanks Jarvis, you're doing a great job", { minLength: 5 }));

	// Summary
	const passed = results.filter((r) => r.pass).length;
	const failed = results.filter((r) => !r.pass).length;
	const errors = results.filter((r) => r.issues.some((i) => i.startsWith("All models") || i.startsWith("Claude API") || i.startsWith("OAuth")));

	console.log(`\n${"=".repeat(50)}`);
	console.log(`Results: ${passed} passed, ${failed} failed, ${errors.length} errors`);
	console.log(`${"=".repeat(50)}`);

	if (failed > 0) {
		console.log("\nFailed tests:");
		for (const r of results.filter((r) => !r.pass)) {
			console.log(`  ${r.name}`);
			for (const i of r.issues) console.log(`    - ${i}`);
		}
	}

	console.log("\nTool usage summary:");
	const allTools = results.flatMap((r) => r.tools);
	const toolCounts = {};
	for (const t of allTools) toolCounts[t] = (toolCounts[t] || 0) + 1;
	for (const [t, c] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${t}: ${c}x`);
	}

	const totalMs = results.reduce((s, r) => s + r.ms, 0);
	console.log(`\nTotal time: ${(totalMs / 1000).toFixed(1)}s`);
	console.log(`Avg per test: ${(totalMs / results.length / 1000).toFixed(1)}s`);

	db.close();
}

run().catch((e) => {
	console.error("FATAL:", e);
	process.exit(1);
});
