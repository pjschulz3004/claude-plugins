import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import type { BreakerManager } from "./state/breakers.js";
import type { TaskLedger } from "./state/ledger.js";

export interface HealthServerConfig {
	breakers: BreakerManager;
	ledger: TaskLedger;
	port?: number;
	taskNames?: () => string[];
}

export class HealthServer {
	private server: Server | null = null;
	private readonly config: HealthServerConfig;
	private readonly startTime = Date.now();

	constructor(config: HealthServerConfig) {
		this.config = config;
	}

	async start(): Promise<void> {
		const port = this.config.port ?? (Number(process.env.JARVIS_HEALTH_PORT) || 3333);

		return new Promise((resolve, reject) => {
			this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
				this.handleRequest(req, res);
			});

			this.server.on("error", reject);
			this.server.listen(port, () => {
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.server) {
				resolve();
				return;
			}
			this.server.close(() => {
				this.server = null;
				resolve();
			});
		});
	}

	private handleRequest(req: IncomingMessage, res: ServerResponse): void {
		if (req.method === "GET" && req.url === "/health") {
			this.handleHealth(res);
		} else {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "not found" }));
		}
	}

	private handleHealth(res: ServerResponse): void {
		const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
		const breakerStates = this.config.breakers.getStates();

		// Build last_runs from known tasks
		const lastRuns: Record<string, unknown> = {};
		const taskNames = this.config.taskNames?.() ?? Object.keys(breakerStates);
		for (const taskName of taskNames) {
			const recent = this.config.ledger.getRecent(taskName, 1);
			if (recent.length > 0) {
				const entry = recent[0];
				lastRuns[taskName] = {
					status: entry.status,
					started_at: entry.started_at,
					duration_ms: entry.duration_ms,
				};
			}
		}

		const body = {
			status: "ok",
			uptime_seconds: uptimeSeconds,
			breakers: breakerStates,
			last_runs: lastRuns,
		};

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(body));
	}
}
