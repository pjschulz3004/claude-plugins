/**
 * Structured logger for the Jarvis daemon.
 *
 * Outputs JSON lines to stdout for systemd journal capture.
 * Each line: {"ts":"ISO","level":"info","mod":"scheduler","msg":"...","data":{...}}
 *
 * Levels: debug, info, warn, error
 * LOG_LEVEL env var controls minimum level (default: info)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

function getMinLevel(): number {
	const env = process.env.LOG_LEVEL?.toLowerCase() ?? "info";
	return LEVELS[env as LogLevel] ?? LEVELS.info;
}

let minLevel = getMinLevel();

export function setLogLevel(level: LogLevel): void {
	minLevel = LEVELS[level];
}

function emit(
	level: LogLevel,
	mod: string,
	msg: string,
	data?: Record<string, unknown>,
): void {
	if (LEVELS[level] < minLevel) return;

	const entry: Record<string, unknown> = {
		ts: new Date().toISOString(),
		level,
		mod,
		msg,
	};
	if (data && Object.keys(data).length > 0) {
		entry.data = data;
	}

	const line = JSON.stringify(entry);

	if (level === "error") {
		process.stderr.write(line + "\n");
	} else {
		process.stdout.write(line + "\n");
	}
}

export interface Logger {
	debug(msg: string, data?: Record<string, unknown>): void;
	info(msg: string, data?: Record<string, unknown>): void;
	warn(msg: string, data?: Record<string, unknown>): void;
	error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Create a logger scoped to a module name.
 *
 * Usage:
 *   const log = createLogger("scheduler");
 *   log.info("task fired", { task: "email_triage", model: "sonnet" });
 */
export function createLogger(mod: string): Logger {
	return {
		debug: (msg, data) => emit("debug", mod, msg, data),
		info: (msg, data) => emit("info", mod, msg, data),
		warn: (msg, data) => emit("warn", mod, msg, data),
		error: (msg, data) => emit("error", mod, msg, data),
	};
}
