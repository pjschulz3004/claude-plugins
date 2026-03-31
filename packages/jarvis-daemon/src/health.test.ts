import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HealthServer } from "./health.js";
import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";

// Use a random high port to avoid conflicts
function randomPort(): number {
	return 30000 + Math.floor(Math.random() * 30000);
}

describe("HealthServer", () => {
	let ledger: TaskLedger;
	let breakers: BreakerManager;
	let health: HealthServer;
	let port: number;

	beforeEach(async () => {
		port = randomPort();
		ledger = new TaskLedger(":memory:");
		breakers = new BreakerManager();
		health = new HealthServer({ breakers, ledger, port });
		await health.start();
	});

	afterEach(async () => {
		await health.stop();
		ledger.close();
	});

	it("GET /health returns 200 with JSON containing status, uptime_seconds, breakers", async () => {
		// Create a breaker so it shows up in states
		breakers.getOrCreate("imap");

		const res = await fetch(`http://localhost:${port}/health`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/json");

		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(typeof body.uptime_seconds).toBe("number");
		expect(body.breakers).toEqual({ imap: "closed" });
	});

	it("GET /health includes last_runs from ledger", async () => {
		breakers.getOrCreate("imap");
		ledger.record({
			task_name: "email_triage",
			status: "success",
			started_at: "2026-03-31T10:07:00Z",
			duration_ms: 4500,
		});

		const healthWithTasks = new HealthServer({
			breakers,
			ledger,
			port: port + 1,
			taskNames: () => ["email_triage"],
		});
		await healthWithTasks.start();

		try {
			const res = await fetch(`http://localhost:${port + 1}/health`);
			const body = await res.json();
			expect(body.last_runs.email_triage).toEqual({
				status: "success",
				started_at: "2026-03-31T10:07:00Z",
				duration_ms: 4500,
			});
		} finally {
			await healthWithTasks.stop();
		}
	});

	it("GET /other returns 404", async () => {
		const res = await fetch(`http://localhost:${port}/other`);
		expect(res.status).toBe(404);

		const body = await res.json();
		expect(body.error).toBe("not found");
	});

	it("server can be started and stopped cleanly", async () => {
		// Already started in beforeEach
		const res = await fetch(`http://localhost:${port}/health`);
		expect(res.status).toBe(200);

		await health.stop();

		// After stop, fetch should fail
		await expect(fetch(`http://localhost:${port}/health`)).rejects.toThrow();

		// Re-create for afterEach cleanup
		health = new HealthServer({ breakers, ledger, port: port + 2 });
		await health.start();
		// afterEach will stop this one
	});
});
