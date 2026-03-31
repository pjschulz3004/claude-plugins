import { describe, it, expect, vi, beforeEach } from "vitest";
import { Dispatcher, addJitter } from "./dispatcher.js";

// We test the Dispatcher by injecting a mock executor function
// instead of mocking child_process directly. The Dispatcher accepts
// an optional execFn in its constructor for testability.

const SUCCESSFUL_RESULT = {
	type: "result",
	subtype: "success",
	result: "Task completed",
	session_id: "test-session-123",
	total_cost_usd: 0.001,
	duration_ms: 2500,
	usage: {
		input_tokens: 100,
		output_tokens: 50,
		cache_read_input_tokens: 1000,
	},
};

type ExecFn = (
	cmd: string,
	args: string[],
	opts: Record<string, unknown>,
) => Promise<{ stdout: string; stderr: string }>;

describe("Dispatcher", () => {
	let mockExec: ReturnType<typeof vi.fn<ExecFn>>;
	let dispatcher: Dispatcher;

	beforeEach(() => {
		mockExec = vi.fn<ExecFn>();
		dispatcher = new Dispatcher(mockExec);
	});

	it("spawns claude with correct args: -p, --output-format json, --dangerously-skip-permissions", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		await dispatcher.dispatch("Hello world");

		expect(mockExec).toHaveBeenCalledWith(
			"claude",
			expect.arrayContaining([
				"-p",
				"Hello world",
				"--output-format",
				"json",
				"--dangerously-skip-permissions",
			]),
			expect.objectContaining({
				timeout: 120_000,
				maxBuffer: 10 * 1024 * 1024,
			}),
		);
	});

	it("adds --model when model option is specified", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		await dispatcher.dispatch("Hello", { model: "sonnet" });

		const args = mockExec.mock.calls[0][1];
		expect(args).toContain("--model");
		expect(args).toContain("sonnet");
	});

	it("adds --plugin-dir for each directory", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		await dispatcher.dispatch("Hello", {
			pluginDirs: ["packages/jarvis-email", "packages/jarvis"],
		});

		const args = mockExec.mock.calls[0][1];
		const pluginDirIndices = args.reduce<number[]>((acc, arg, i) => {
			if (arg === "--plugin-dir") acc.push(i);
			return acc;
		}, []);

		expect(pluginDirIndices).toHaveLength(2);
		expect(args[pluginDirIndices[0] + 1]).toBe("packages/jarvis-email");
		expect(args[pluginDirIndices[1] + 1]).toBe("packages/jarvis");
	});

	it("adds --max-turns when specified", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		await dispatcher.dispatch("Hello", { maxTurns: 10 });

		const args = mockExec.mock.calls[0][1];
		expect(args).toContain("--max-turns");
		expect(args).toContain("10");
	});

	it("parses successful JSON output and returns ClaudeResult", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		const result = await dispatcher.dispatch("Hello");

		expect(result.type).toBe("result");
		expect(result.subtype).toBe("success");
		expect(result.result).toBe("Task completed");
		expect(result.total_cost_usd).toBe(0.001);
		expect(result.usage.input_tokens).toBe(100);
	});

	it("extracts JSON between first { and last } on non-JSON output", async () => {
		const mixed = `Some debug output\n${JSON.stringify(SUCCESSFUL_RESULT)}\nMore output`;
		mockExec.mockResolvedValue({ stdout: mixed, stderr: "" });

		const result = await dispatcher.dispatch("Hello");
		expect(result.subtype).toBe("success");
		expect(result.result).toBe("Task completed");
	});

	it("throws on timeout", async () => {
		const timeoutError = Object.assign(new Error("Command timed out"), {
			killed: true,
		});
		mockExec.mockRejectedValue(timeoutError);

		await expect(
			dispatcher.dispatch("Hello", { timeoutMs: 1000 }),
		).rejects.toThrow(/timed out/i);
	});

	it("throws on subtype not equal to success", async () => {
		const errorResult = {
			...SUCCESSFUL_RESULT,
			subtype: "error_max_turns",
			result: "Ran out of turns",
		};
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(errorResult),
			stderr: "",
		});

		await expect(dispatcher.dispatch("Hello")).rejects.toThrow(
			/error_max_turns/,
		);
	});

	it("does not set ANTHROPIC_API_KEY in env", async () => {
		mockExec.mockResolvedValue({
			stdout: JSON.stringify(SUCCESSFUL_RESULT),
			stderr: "",
		});

		await dispatcher.dispatch("Hello");

		const opts = mockExec.mock.calls[0][2] as {
			env: Record<string, string>;
		};
		expect(opts.env.ANTHROPIC_API_KEY).toBeUndefined();
	});
});

describe("addJitter", () => {
	it("returns a value between baseMs and baseMs + maxJitterMs", () => {
		for (let i = 0; i < 100; i++) {
			const result = addJitter(1000, 500);
			expect(result).toBeGreaterThanOrEqual(1000);
			expect(result).toBeLessThanOrEqual(1500);
		}
	});

	it("defaults maxJitterMs to 60000", () => {
		for (let i = 0; i < 100; i++) {
			const result = addJitter(0);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(60_000);
		}
	});
});
