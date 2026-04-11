import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Scheduler } from "./scheduler.js";
import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";
import type { Dispatcher, ClaudeResult } from "./dispatcher.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const YAML_CONTENT = `tasks:
  email_triage:
    schedule: "7 * * * *"
    hours: "7-23"
    service: imap
    autonomy: full
    model: sonnet
    max_turns: 10
    timeout_ms: 120000
    plugin_dirs:
      - packages/jarvis-email
    prompt: "Triage email inbox"
  daily_summary:
    schedule: "0 8 * * *"
    service: imap
    model: sonnet
    max_turns: 5
    timeout_ms: 60000
    prompt: "Summarize today"
  morning_briefing:
    schedule: "35 7 * * *"
    autonomy: notify
    notify_raw: true
    model: sonnet
    max_turns: 20
    timeout_ms: 150000
    prompt: "Write morning briefing"
`;

function makeResult(overrides: Partial<ClaudeResult> = {}): ClaudeResult {
	return {
		type: "result",
		subtype: "success",
		result: "Done",
		session_id: "sess-123",
		total_cost_usd: 0.001,
		duration_ms: 2000,
		usage: {
			input_tokens: 100,
			output_tokens: 50,
			cache_read_input_tokens: 500,
		},
		...overrides,
	};
}

describe("Scheduler", () => {
	let tmpDir: string;
	let yamlPath: string;
	let ledger: TaskLedger;
	let breakers: BreakerManager;
	let mockDispatcher: Dispatcher;
	let scheduler: Scheduler;

	beforeEach(() => {
		vi.useFakeTimers();

		tmpDir = mkdtempSync(join(tmpdir(), "scheduler-test-"));
		yamlPath = join(tmpDir, "heartbeat.yaml");
		writeFileSync(yamlPath, YAML_CONTENT);

		ledger = new TaskLedger(":memory:");
		breakers = new BreakerManager();
		mockDispatcher = {
			dispatch: vi.fn<
				[string, Record<string, unknown>],
				Promise<ClaudeResult>
			>(),
		} as unknown as Dispatcher;

		scheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
		});
	});

	afterEach(() => {
		scheduler.stop();
		ledger.close();
		vi.useRealTimers();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("reads heartbeat.yaml and creates a Cron job per task", () => {
		scheduler.start();
		expect(scheduler.getTaskNames()).toEqual(
			expect.arrayContaining(["email_triage", "daily_summary", "morning_briefing"]),
		);
		expect(scheduler.getTaskNames()).toHaveLength(3);
	});

	it("when a task fires and breaker is open: records skipped, does not dispatch", async () => {
		// Trip the imap breaker
		breakers.recordFailure("imap");
		breakers.recordFailure("imap");
		breakers.recordFailure("imap");

		scheduler.start();

		// Fire the email_triage task manually
		await scheduler.fireTask("email_triage");

		expect(mockDispatcher.dispatch).not.toHaveBeenCalled();

		const recent = ledger.getRecent("email_triage", 1);
		expect(recent).toHaveLength(1);
		expect(recent[0].status).toBe("skipped");
	});

	it("when a task fires and breaker is closed: calls dispatcher.dispatch", async () => {
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		scheduler.start();
		await scheduler.fireTask("email_triage");

		expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
			"Triage email inbox",
			expect.objectContaining({
				model: "sonnet",
				maxTurns: 10,
				timeoutMs: 120000,
				pluginDirs: ["packages/jarvis-email"],
			}),
		);
	});

	it("on dispatch success: records success in ledger, resets breaker", async () => {
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(
			makeResult({ total_cost_usd: 0.005, duration_ms: 3000 }),
		);

		scheduler.start();
		await scheduler.fireTask("email_triage");

		const recent = ledger.getRecent("email_triage", 1);
		expect(recent).toHaveLength(1);
		expect(recent[0].status).toBe("success");
		expect(recent[0].cost_usd).toBe(0.005);

		// Breaker should be closed (success resets it)
		expect(breakers.shouldAllow("imap")).toBe(true);
	});

	it("on dispatch failure: records failure in ledger, increments breaker", async () => {
		vi.mocked(mockDispatcher.dispatch).mockRejectedValue(
			new Error("timeout"),
		);

		scheduler.start();
		await scheduler.fireTask("email_triage");

		const recent = ledger.getRecent("email_triage", 1);
		expect(recent).toHaveLength(1);
		expect(recent[0].status).toBe("failure");
		expect(recent[0].error).toBe("timeout");
	});

	it("stop() prevents further executions", () => {
		scheduler.start();
		scheduler.stop();
		expect(scheduler.getTaskNames()).toHaveLength(0);
	});

	it("notify_raw: sends result directly without task-status wrapper", async () => {
		const sent: string[] = [];
		const captureChannel = {
			name: "capture",
			send: async (text: string) => { sent.push(text); },
		};

		const briefingResult = makeResult({ result: "Good morning, Paul.\n\nYou have two meetings today." });
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(briefingResult);

		const briefingScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			notifyChannels: [captureChannel],
		});
		briefingScheduler.start();

		await briefingScheduler.fireTask("morning_briefing");
		briefingScheduler.stop();

		expect(sent).toHaveLength(1);
		expect(sent[0]).toBe("Good morning, Paul.\n\nYou have two meetings today.");
		expect(sent[0]).not.toContain("completed successfully");
	});

	it("substitutes {{date}} and {{tomorrow}} in prompts before dispatch", async () => {
		// Pin time to a known date so we can assert exact substitution
		vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));

		const templateYaml = YAML_CONTENT.replace(
			'prompt: "Summarize today"',
			'prompt: "Get events for {{date}} through {{tomorrow}}"',
		);
		writeFileSync(yamlPath, templateYaml);

		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const templateScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
		});
		templateScheduler.start();
		await templateScheduler.fireTask("daily_summary");
		templateScheduler.stop();

		expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
			"Get events for 2026-04-15 through 2026-04-16",
			expect.any(Object),
		);
	});

	it("hot-reloads task config when heartbeat.yaml changes on disk", async () => {
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		scheduler.start();
		await scheduler.fireTask("email_triage");

		// Verify initial config was used
		expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
			"Triage email inbox",
			expect.objectContaining({ maxTurns: 10, timeoutMs: 120000 }),
		);

		// Rewrite YAML with updated config (simulates a growth session editing heartbeat.yaml)
		const updatedYaml = YAML_CONTENT
			.replace("max_turns: 10", "max_turns: 30")
			.replace("timeout_ms: 120000", "timeout_ms: 240000")
			.replace('prompt: "Triage email inbox"', 'prompt: "Triage email inbox v2"');
		writeFileSync(yamlPath, updatedYaml);

		vi.mocked(mockDispatcher.dispatch).mockClear();
		await scheduler.fireTask("email_triage");

		// Verify updated config is now used without restart
		expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
			"Triage email inbox v2",
			expect.objectContaining({ maxTurns: 30, timeoutMs: 240000 }),
		);
	});


	// ── KG context injection tests ────────────────────────────────────────────

	it("KG injection: when task has kg_domains and injector returns context, prompt is prepended with [Cross-domain context] block", async () => {
		const KG_YAML = [
			"tasks:",
			"  kg_task:",
			'    schedule: "0 9 * * *"',
			"    service: imap",
			"    model: sonnet",
			"    max_turns: 5",
			"    timeout_ms: 60000",
			"    kg_domains:",
			"      - email",
			"      - budget",
			"    kg_days_back: 14",
			'    prompt: "Check everything"',
		].join("\n") + "\n";
		writeFileSync(yamlPath, KG_YAML);

		const kgContext = "[Cross-domain context]\nYou have 3 unread emails and a budget overrun.\n";
		const mockKgInjector = {
			getContext: vi.fn<[string[], number | undefined], Promise<string>>().mockResolvedValue(kgContext),
		};

		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const kgScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			kgInjector: mockKgInjector as unknown as import("./kg-context.js").KGContextInjector,
		});
		kgScheduler.start();
		await kgScheduler.fireTask("kg_task");
		kgScheduler.stop();

		expect(mockKgInjector.getContext).toHaveBeenCalledWith(["email", "budget"], 14);

		const dispatchedPrompt = vi.mocked(mockDispatcher.dispatch).mock.calls[0][0];
		expect(dispatchedPrompt).toContain("[Cross-domain context]");
		expect(dispatchedPrompt).toContain("You have 3 unread emails and a budget overrun.");
		expect(dispatchedPrompt).toContain("Check everything");
		// Context must be prepended (appears before the task prompt)
		expect(dispatchedPrompt.indexOf("[Cross-domain context]")).toBeLessThan(dispatchedPrompt.indexOf("Check everything"));
	});

	it("KG injection: when task has no kg_domains, injector is NOT called and prompt is unchanged", async () => {
		const NO_KG_YAML = [
			"tasks:",
			"  plain_task:",
			'    schedule: "0 9 * * *"',
			"    service: imap",
			"    model: sonnet",
			"    max_turns: 5",
			"    timeout_ms: 60000",
			'    prompt: "Plain prompt without KG"',
		].join("\n") + "\n";
		writeFileSync(yamlPath, NO_KG_YAML);

		const mockKgInjector = {
			getContext: vi.fn<[string[], number | undefined], Promise<string>>(),
		};

		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const kgScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			kgInjector: mockKgInjector as unknown as import("./kg-context.js").KGContextInjector,
		});
		kgScheduler.start();
		await kgScheduler.fireTask("plain_task");
		kgScheduler.stop();

		expect(mockKgInjector.getContext).not.toHaveBeenCalled();

		const dispatchedPrompt = vi.mocked(mockDispatcher.dispatch).mock.calls[0][0];
		expect(dispatchedPrompt).toBe("Plain prompt without KG");
		expect(dispatchedPrompt).not.toContain("[Cross-domain context]");
	});

	it("KG injection: when injector returns empty string, no context block is prepended", async () => {
		const KG_EMPTY_YAML = [
			"tasks:",
			"  kg_empty_task:",
			'    schedule: "0 9 * * *"',
			"    service: imap",
			"    model: sonnet",
			"    max_turns: 5",
			"    timeout_ms: 60000",
			"    kg_domains:",
			"      - calendar",
			'    prompt: "Check calendar events"',
		].join("\n") + "\n";
		writeFileSync(yamlPath, KG_EMPTY_YAML);

		const mockKgInjector = {
			getContext: vi.fn<[string[], number | undefined], Promise<string>>().mockResolvedValue(""),
		};

		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const kgScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			kgInjector: mockKgInjector as unknown as import("./kg-context.js").KGContextInjector,
		});
		kgScheduler.start();
		await kgScheduler.fireTask("kg_empty_task");
		kgScheduler.stop();

		expect(mockKgInjector.getContext).toHaveBeenCalledWith(["calendar"], undefined);

		const dispatchedPrompt = vi.mocked(mockDispatcher.dispatch).mock.calls[0][0];
		expect(dispatchedPrompt).toBe("Check calendar events");
		expect(dispatchedPrompt).not.toContain("[Cross-domain context]");
	});


	// ── Situation injection tests ─────────────────────────────────────────────

	it("Situation injection: when collector returns data, prompt is prepended with [Situation] block", async () => {
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const mockSituationCollector = {
			collect: vi.fn().mockResolvedValue({
				timestamp: new Date().toISOString(),
				location: "Berlin",
				currentActivity: "Working from home",
				unreadCount: 3,
				flaggedCount: 1,
				pendingTodos: 2,
				overdueTodos: 0,
				budgetAlerts: [],
				dayContext: "Friday, workday",
			}),
		};

		const sitScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			situationCollector: mockSituationCollector as unknown as import("./situation.js").SituationCollector,
		});
		sitScheduler.start();
		await sitScheduler.fireTask("email_triage");
		sitScheduler.stop();

		expect(mockSituationCollector.collect).toHaveBeenCalledOnce();

		const dispatchedPrompt = vi.mocked(mockDispatcher.dispatch).mock.calls[0][0];
		expect(dispatchedPrompt).toContain("[Situation]");
		expect(dispatchedPrompt).toContain("Berlin");
		expect(dispatchedPrompt).toContain("Working from home");
		expect(dispatchedPrompt).toContain("Triage email inbox");
		// [Situation] block must be prepended (appears before the task prompt)
		expect(dispatchedPrompt.indexOf("[Situation]")).toBeLessThan(
			dispatchedPrompt.indexOf("Triage email inbox"),
		);
	});

	it("Situation injection: when collector returns null, no [Situation] block is prepended", async () => {
		vi.mocked(mockDispatcher.dispatch).mockResolvedValue(makeResult());

		const mockSituationCollector = {
			collect: vi.fn().mockResolvedValue(null),
		};

		const sitScheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			situationCollector: mockSituationCollector as unknown as import("./situation.js").SituationCollector,
		});
		sitScheduler.start();
		await sitScheduler.fireTask("email_triage");
		sitScheduler.stop();

		expect(mockSituationCollector.collect).toHaveBeenCalledOnce();

		const dispatchedPrompt = vi.mocked(mockDispatcher.dispatch).mock.calls[0][0];
		expect(dispatchedPrompt).toBe("Triage email inbox");
		expect(dispatchedPrompt).not.toContain("[Situation]");
	});

});
