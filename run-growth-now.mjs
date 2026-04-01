import { runGrowthLoop } from "./packages/jarvis-daemon/dist/growth.js";
import { TaskLedger } from "./packages/jarvis-daemon/dist/state/ledger.js";
import { Dispatcher } from "./packages/jarvis-daemon/dist/dispatcher.js";
import { CorrectionStore } from "./packages/jarvis-daemon/dist/state/telemetry.js";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { join } from "path";

const repoRoot = process.cwd();
const ledger = new TaskLedger(join(repoRoot, "packages/jarvis-daemon/jarvis.db"));
const dispatcher = new Dispatcher();
const corrections = new CorrectionStore(ledger.database);

const hb = parse(readFileSync(join(repoRoot, "packages/jarvis-daemon/heartbeat.yaml"), "utf-8"));
const taskNames = Object.keys(hb.tasks);

const now = new Date();
const startHour = now.getHours();
const endHour = Math.min(startHour + 2, 23);

console.log(`[growth-test] Starting 2-hour growth session at ${now.toISOString()}`);
console.log(`[growth-test] Window: ${startHour}:00 - ${endHour}:00`);
console.log(`[growth-test] Tasks: ${taskNames.join(", ")}`);
console.log(`[growth-test] MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? "set" : "MISSING"}`);
console.log(`[growth-test] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "set" : "MISSING"}`);

runGrowthLoop({
  dispatcher,
  ledger,
  corrections,
  taskNames,
  repoRoot,
  startHour,
  endHour,
  pauseBetweenRoundsMs: 60000,
  maxTurnsPerRound: 30,
  timeoutPerRoundMs: 900000,
  notifyChannels: [],
}).then(() => {
  console.log("[growth-test] Session complete at", new Date().toISOString());
  process.exit(0);
}).catch((err) => {
  console.error("[growth-test] Fatal:", err);
  process.exit(1);
});
