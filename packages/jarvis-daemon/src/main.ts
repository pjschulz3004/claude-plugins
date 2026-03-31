import { TaskLedger } from "./state/ledger.js";
import { BreakerManager } from "./state/breakers.js";
import { Dispatcher } from "./dispatcher.js";
import { Scheduler } from "./scheduler.js";
import { HealthServer } from "./health.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ledger = new TaskLedger(join(__dirname, "..", "jarvis.db"));
const breakers = new BreakerManager();
const dispatcher = new Dispatcher();
const scheduler = new Scheduler({
	yamlPath: join(__dirname, "..", "heartbeat.yaml"),
	dispatcher,
	ledger,
	breakers,
});
const health = new HealthServer({
	breakers,
	ledger,
	taskNames: () => scheduler.getTaskNames(),
});

async function start() {
	console.log("[jarvis] Starting daemon...");
	await health.start();
	scheduler.start();
	console.log(
		`[jarvis] Daemon running. Health at :${process.env.JARVIS_HEALTH_PORT || "3333"}/health`,
	);
}

async function shutdown(signal: string) {
	console.log(`[jarvis] Received ${signal}, shutting down...`);
	scheduler.stop();
	await health.stop();
	ledger.close();
	console.log("[jarvis] Shutdown complete.");
	process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
	console.error("[jarvis] Fatal:", err);
	process.exit(1);
});
