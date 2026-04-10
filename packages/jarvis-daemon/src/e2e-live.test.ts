import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KnowledgeGraphClient } from "@jarvis/kg";
import { KGContextInjector } from "./kg-context.js";
import { Scheduler } from "./scheduler.js";
import Database from "better-sqlite3";

const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "jarviskg2026";

describe("KG Context Injection - Live E2E", () => {
  let kgClient: KnowledgeGraphClient;
  let kgInjector: KGContextInjector;
  let yamlPath: string;

  kgClient = new KnowledgeGraphClient({
    uri: "bolt://localhost:7687",
    user: "neo4j",
    password: NEO4J_PASSWORD,
  });
  kgInjector = new KGContextInjector(kgClient);

  const yaml = [
    "tasks:",
    "  test_email_triage:",
    '    schedule: \"0 0 1 1 *\"',
    "    model: sonnet",
    "    max_turns: 5",
    "    timeout_ms: 30000",
    '    kg_domains: [\"email\", \"sender\", \"contact\", \"invoice\"]',
    "    kg_days_back: 30",
    "    prompt: |",
    "      # version: 4",
    "      You are Jarvis. Triage Pauls inbox.",
  ].join("\n");

  const tmpDir = mkdtempSync(join(tmpdir(), "jarvis-e2e-"));
  yamlPath = join(tmpDir, "heartbeat.yaml");
  writeFileSync(yamlPath, yaml);

  afterAll(async () => {
    try { unlinkSync(yamlPath); } catch {}
    await kgClient.close();
  });

  it("real scheduler dispatches prompt with real KG context from live Neo4j", async () => {
    let capturedPrompt = "";
    const mockDispatcher = {
      dispatch: async (prompt: string) => {
        capturedPrompt = prompt;
        return {
          type: "result", subtype: "success", result: "test",
          session_id: "e2e-test", total_cost_usd: 0, duration_ms: 1,
          usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 },
        };
      },
    };

    const db = new Database(":memory:");
    const scheduler = new Scheduler({
      yamlPath,
      dispatcher: mockDispatcher as any,
      ledger: { database: db, record: () => 1, getConsecutiveFailures: () => 0 } as any,
      breakers: { shouldAllow: () => true, recordSuccess: () => {}, recordFailure: () => {} } as any,
      kgInjector,
    });

    scheduler.start();
    await scheduler.fireTask("test_email_triage");
    scheduler.stop();
    db.close();

    // The prompt must contain KG context from real Neo4j
    expect(capturedPrompt).toContain("[Cross-domain context]");
    // Must have real entity data (not undefined or empty)
    expect(capturedPrompt).toContain("(Entity)");
    // Must still have the task prompt after the context
    expect(capturedPrompt).toContain("# version: 4");
    // Context must appear BEFORE the task prompt
    const contextIdx = capturedPrompt.indexOf("[Cross-domain context]");
    const promptIdx = capturedPrompt.indexOf("# version: 4");
    expect(contextIdx).toBeLessThan(promptIdx);
    // Should have multiple entity lines
    const entityLines = capturedPrompt.split("\n").filter(l => l.startsWith("- ")).length;
    expect(entityLines).toBeGreaterThanOrEqual(2);

    console.log("Captured prompt (first 800 chars):");
    console.log(capturedPrompt.slice(0, 800));
    console.log("Entity lines:", entityLines);
  });
});
