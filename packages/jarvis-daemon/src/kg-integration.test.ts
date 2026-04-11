import { describe, it, expect, beforeAll, afterAll } from "vitest";
import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";
import { KnowledgeGraphClient } from "@jarvis/kg";
import { KGContextProvider } from "./context-providers.js";
import { Scheduler } from "./scheduler.js";
import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";
import type { Dispatcher, ClaudeResult } from "./dispatcher.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";

const NEO4J_URI = "bolt://localhost:7687";
const NEO4J_USER = "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "jarviskg2026";

describe("KG Context Injection E2E", () => {
	let kgClient: KnowledgeGraphClient;
	// Separate raw driver for seeding/cleanup (KnowledgeGraphClient doesn't expose session directly)
	let seedDriver: Driver;
	let neo4jAvailable = true;

	beforeAll(async () => {
		// Attempt connection — skip suite if Neo4j is not reachable
		try {
			seedDriver = neo4j.driver(
				NEO4J_URI,
				neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
			);
			const probe = seedDriver.session();
			await probe.run("RETURN 1");
			await probe.close();
		} catch (err) {
			neo4jAvailable = false;
			console.warn("[E2E] Neo4j unavailable, skipping integration tests:", (err as Error).message);
			return;
		}

		kgClient = new KnowledgeGraphClient({
			uri: NEO4J_URI,
			user: NEO4J_USER,
			password: NEO4J_PASSWORD,
		});

		// Clean up any leftover test data from previous failed runs
		const cleanupSession = seedDriver.session();
		try {
			await cleanupSession.run(
				"MATCH (n) WHERE n.name ENDS WITH '_E2E' DETACH DELETE n",
			);
		} finally {
			await cleanupSession.close();
		}

		// Seed test entities using Graphiti schema:
		// - Entity nodes with group_id, summary, labels (list)
		// - RelatesToNode_ intermediate node for the edge
		const seedSession = seedDriver.session();
		try {
			await seedSession.run(
				`MERGE (p:Entity {name: 'TestPerson_E2E'})
				 SET p.group_id = 'jarvis',
				     p.summary = 'TestPerson_E2E SENT_EMAIL to TestInvoice_E2E',
				     p.labels = ['person'],
				     p.uuid = 'e2e-person-uuid',
				     p.created_at = datetime()
				 MERGE (i:Entity {name: 'TestInvoice_E2E'})
				 SET i.group_id = 'jarvis',
				     i.summary = 'TestInvoice_E2E is a test invoice received via email',
				     i.labels = ['invoice'],
				     i.uuid = 'e2e-invoice-uuid',
				     i.created_at = datetime()
				 MERGE (edge:RelatesToNode_ {uuid: 'e2e-edge-uuid'})
				 SET edge.group_id = 'jarvis',
				     edge.name = 'SENT_EMAIL',
				     edge.fact = 'TestPerson_E2E SENT_EMAIL to TestInvoice_E2E',
				     edge.created_at = datetime()
				 MERGE (p)-[:RELATES_TO]->(edge)
				 MERGE (edge)-[:RELATES_TO]->(i)`,
			);
		} finally {
			await seedSession.close();
		}
	}, 30_000);

	afterAll(async () => {
		if (!neo4jAvailable) return;

		// Remove all _E2E test data
		const cleanupSession = seedDriver.session();
		try {
			await cleanupSession.run(
				"MATCH (n) WHERE n.name ENDS WITH '_E2E' OR n.uuid STARTS WITH 'e2e-' DETACH DELETE n",
			);
		} finally {
			await cleanupSession.close();
		}

		await kgClient.close();
		await seedDriver.close();
	}, 15_000);

	it("searchForContext returns formatted results from real Neo4j (Graphiti schema)", async () => {
		if (!neo4jAvailable) {
			console.warn("Skipping: Neo4j unavailable");
			return;
		}

		const result = await kgClient.searchForContext({
			keywords: ["TestPerson_E2E"],
			limit: 5,
		});

		expect(result).toContain("TestPerson_E2E");
		// Summary contains SENT_EMAIL and TestInvoice_E2E references
		expect(result).toContain("SENT_EMAIL");
		// Related section should show the RelatesToNode_ edge
		expect(result).toContain("TestInvoice_E2E");
	});

	it("KGContextProvider formats context block from real KG data", async () => {
		if (!neo4jAvailable) {
			console.warn("Skipping: Neo4j unavailable");
			return;
		}

		const provider = new KGContextProvider(kgClient);
		const context = await provider.getContext({ kg_domains: ["TestPerson_E2E"], kg_days_back: 1 }, "test");

		expect(context).toContain("[Cross-domain context]");
		expect(context).toContain("TestPerson_E2E");
		// Context block must end with a newline so it separates cleanly from the task prompt
		expect(context.endsWith("\n")).toBe(true);
	});

	it("scheduler injects real KG context into dispatched prompt", async () => {
		if (!neo4jAvailable) {
			console.warn("Skipping: Neo4j unavailable");
			return;
		}

		// Write a minimal heartbeat YAML with a task that references the seeded entity
		const tmpDir = mkdtempSync(join(tmpdir(), "kg-e2e-"));
		const yamlPath = join(tmpDir, "heartbeat.yaml");
		const yamlContent = [
			"tasks:",
			"  kg_e2e_task:",
			'    schedule: "0 9 * * *"',
			"    model: sonnet",
			"    max_turns: 5",
			"    timeout_ms: 60000",
			"    kg_domains:",
			"      - TestPerson_E2E",
			"    kg_days_back: 1",
			'    prompt: "E2E task prompt"',
		].join("\n") + "\n";
		writeFileSync(yamlPath, yamlContent);

		// Capture the exact prompt that lands in dispatcher.dispatch
		let capturedPrompt: string | undefined;
		const mockResult: ClaudeResult = {
			type: "result",
			subtype: "success",
			result: "Done",
			session_id: "sess-e2e",
			total_cost_usd: 0.001,
			duration_ms: 1000,
			usage: { input_tokens: 50, output_tokens: 20, cache_read_input_tokens: 0 },
		};
		const mockDispatcher: Dispatcher = {
			dispatch: vi.fn(async (prompt: string) => {
				capturedPrompt = prompt;
				return mockResult;
			}),
		} as unknown as Dispatcher;

		const ledger = new TaskLedger(":memory:");
		const breakers = new BreakerManager();
		const scheduler = new Scheduler({
			yamlPath,
			dispatcher: mockDispatcher,
			ledger,
			breakers,
			contextProviders: [new KGContextProvider(kgClient)],
		});

		try {
			scheduler.start();
			await scheduler.fireTask("kg_e2e_task");
		} finally {
			scheduler.stop();
			ledger.close();
			rmSync(tmpDir, { recursive: true, force: true });
		}

		// The captured prompt must include the KG context block before the task prompt
		expect(capturedPrompt).toBeDefined();
		expect(capturedPrompt).toContain("[Cross-domain context]");
		expect(capturedPrompt).toContain("TestPerson_E2E");
		expect(capturedPrompt).toContain("E2E task prompt");

		// KG context block must be prepended — appears before the task prompt
		const contextIdx = capturedPrompt!.indexOf("[Cross-domain context]");
		const promptIdx = capturedPrompt!.indexOf("E2E task prompt");
		expect(contextIdx).toBeLessThan(promptIdx);
	}, 30_000);
});
