import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PromptVersionStore } from "./state/prompt-versions.js";
import { PromptVersioner } from "./prompt-versioner.js";

const YAML_WITH_VERSIONS = `tasks:
  email_triage:
    schedule: "7 * * * *"
    hours: "7-23"
    prompt: |
      # version: 1
      You are Jarvis. Triage Paul's inbox.
  memory_consolidation:
    schedule: "0 3 * * *"
    prompt: |
      # version: 1
      You are Jarvis running nightly memory consolidation.
`;

describe("PromptVersioner", () => {
	let db: Database.Database;
	let store: PromptVersionStore;
	let tmpDir: string;
	let yamlPath: string;
	let versioner: PromptVersioner;

	beforeEach(() => {
		db = new Database(":memory:");
		db.pragma("journal_mode = WAL");
		store = new PromptVersionStore(db);

		tmpDir = mkdtempSync(join(tmpdir(), "versioner-test-"));
		yamlPath = join(tmpDir, "heartbeat.yaml");
		writeFileSync(yamlPath, YAML_WITH_VERSIONS);

		versioner = new PromptVersioner(store, yamlPath);
	});

	afterEach(() => {
		db.close();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("parseVersion", () => {
		it("extracts version number from # version: N comment in prompt", () => {
			const version = versioner.parseVersion("email_triage");
			expect(version).toBe(1);
		});

		it("returns 0 for task with no version comment", () => {
			writeFileSync(yamlPath, `tasks:
  no_version:
    schedule: "0 * * * *"
    prompt: "No version comment here"
`);
			const v = new PromptVersioner(store, yamlPath);
			expect(v.parseVersion("no_version")).toBe(0);
		});
	});

	describe("selectPrompt", () => {
		it("returns current prompt when no candidate exists", () => {
			store.registerVersion("email_triage", 1, "current prompt v1", "current");
			const selected = versioner.selectPrompt("email_triage");
			expect(selected.prompt).toBe("current prompt v1");
			expect(selected.version).toBe(1);
		});

		it("alternates between current and candidate based on run count parity", () => {
			store.registerVersion("email_triage", 1, "current prompt", "current");
			store.registerVersion("email_triage", 2, "candidate prompt", "candidate");

			// 0 total runs (even) -> current
			const first = versioner.selectPrompt("email_triage");
			expect(first.prompt).toBe("current prompt");

			// Record 1 metric for current -> 1 total run (odd) -> candidate
			store.recordMetric("email_triage", 1, 1, true, 1000, 100);
			const second = versioner.selectPrompt("email_triage");
			expect(second.prompt).toBe("candidate prompt");

			// Record 1 metric for candidate -> 2 total runs (even) -> current
			store.recordMetric("email_triage", 2, 2, true, 1000, 100);
			const third = versioner.selectPrompt("email_triage");
			expect(third.prompt).toBe("current prompt");
		});
	});

	describe("registerCandidate", () => {
		it("stores a new candidate version", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			versioner.registerCandidate("email_triage", "improved prompt v2", 2);

			const candidate = store.getCandidateVersion("email_triage");
			expect(candidate).toBeDefined();
			expect(candidate!.version).toBe(2);
			expect(candidate!.prompt_text).toBe("improved prompt v2");
		});
	});

	describe("evaluate", () => {
		it("returns no-winner when both have fewer than minRuns", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2", "candidate");
			// Only 2 runs each, minRuns=5
			store.recordMetric("email_triage", 1, 1, true, 1000, 100);
			store.recordMetric("email_triage", 1, 2, true, 1000, 100);
			store.recordMetric("email_triage", 2, 3, true, 900, 90);
			store.recordMetric("email_triage", 2, 4, true, 900, 90);

			const result = versioner.evaluate("email_triage", 5);
			expect(result).toBeNull();
		});

		it("promotes candidate with higher success rate", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2", "candidate");

			// Current: 2/3 success
			store.recordMetric("email_triage", 1, 1, true, 1000, 100);
			store.recordMetric("email_triage", 1, 2, true, 1000, 100);
			store.recordMetric("email_triage", 1, 3, false, 1000, 100);

			// Candidate: 3/3 success
			store.recordMetric("email_triage", 2, 4, true, 1000, 100);
			store.recordMetric("email_triage", 2, 5, true, 1000, 100);
			store.recordMetric("email_triage", 2, 6, true, 1000, 100);

			const result = versioner.evaluate("email_triage", 3);
			expect(result).not.toBeNull();
			expect(result!.winner).toBe("candidate");
			expect(result!.reason).toContain("success rate");
		});

		it("uses token efficiency as tiebreak when success rates are equal", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2", "candidate");

			// Both 100% success, but candidate uses fewer tokens
			store.recordMetric("email_triage", 1, 1, true, 1000, 200);
			store.recordMetric("email_triage", 1, 2, true, 1000, 200);
			store.recordMetric("email_triage", 1, 3, true, 1000, 200);

			store.recordMetric("email_triage", 2, 4, true, 1000, 100);
			store.recordMetric("email_triage", 2, 5, true, 1000, 100);
			store.recordMetric("email_triage", 2, 6, true, 1000, 100);

			const result = versioner.evaluate("email_triage", 3);
			expect(result).not.toBeNull();
			expect(result!.winner).toBe("candidate");
			expect(result!.reason).toContain("token");
		});

		it("reverts candidate when current wins", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2", "candidate");

			// Current: 3/3 success with fewer tokens
			store.recordMetric("email_triage", 1, 1, true, 1000, 50);
			store.recordMetric("email_triage", 1, 2, true, 1000, 50);
			store.recordMetric("email_triage", 1, 3, true, 1000, 50);

			// Candidate: 1/3 success
			store.recordMetric("email_triage", 2, 4, true, 1000, 100);
			store.recordMetric("email_triage", 2, 5, false, 1000, 100);
			store.recordMetric("email_triage", 2, 6, false, 1000, 100);

			const result = versioner.evaluate("email_triage", 3);
			expect(result).not.toBeNull();
			expect(result!.winner).toBe("current");
		});
	});

	describe("promote", () => {
		it("swaps candidate to current and current to retired", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2 improved", "candidate");

			versioner.promote("email_triage");

			const current = store.getCurrentVersion("email_triage");
			expect(current).toBeDefined();
			expect(current!.version).toBe(2);
			expect(current!.status).toBe("current");

			// Old current should be retired
			const retired = db
				.prepare("SELECT * FROM prompt_versions WHERE task_name = ? AND version = ?")
				.get("email_triage", 1) as any;
			expect(retired.status).toBe("retired");
		});

		it("updates heartbeat.yaml prompt text and version comment", () => {
			store.registerVersion("email_triage", 1, "# version: 1\nYou are Jarvis. Triage Paul's inbox.\n", "current");
			store.registerVersion("email_triage", 2, "# version: 2\nYou are Jarvis. Improved triage.\n", "candidate");

			versioner.promote("email_triage");

			const yaml = readFileSync(yamlPath, "utf-8");
			expect(yaml).toContain("# version: 2");
			expect(yaml).toContain("Improved triage");
		});
	});

	describe("revert", () => {
		it("sets candidate to retired", () => {
			store.registerVersion("email_triage", 1, "v1", "current");
			store.registerVersion("email_triage", 2, "v2", "candidate");

			versioner.revert("email_triage");

			const candidate = store.getCandidateVersion("email_triage");
			expect(candidate).toBeUndefined();

			// Current should still be there
			const current = store.getCurrentVersion("email_triage");
			expect(current).toBeDefined();
			expect(current!.version).toBe(1);
		});
	});
});
