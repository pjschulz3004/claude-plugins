import type Database from "better-sqlite3";
import type { BudgetBackend } from "@jarvis/budget";
import type { NotifyChannel } from "./notify.js";
import { sendNotification } from "./notify.js";
import { createLogger } from "./logger.js";

const log = createLogger("spending-alert");

/** Monthly salary from genua GmbH */
const MONTHLY_SALARY = 3366.94;

/** Threshold percentages that trigger alerts (in order) */
const THRESHOLDS = [75, 85, 95] as const;
type Threshold = (typeof THRESHOLDS)[number];

/** Substring that identifies a salary deposit in the payee field */
const SALARY_PAYEE = "genua";

/** How far back to look for the most recent salary */
const LOOKBACK_DAYS = 60;

export function initSpendingAlertTable(db: Database.Database): void {
	db.exec(`CREATE TABLE IF NOT EXISTS spending_alert_state (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	)`);
}

function getKv(db: Database.Database, key: string): string | undefined {
	const row = db
		.prepare("SELECT value FROM spending_alert_state WHERE key = ?")
		.get(key) as { value: string } | undefined;
	return row?.value;
}

function setKv(db: Database.Database, key: string, value: string): void {
	db.prepare(
		"INSERT OR REPLACE INTO spending_alert_state (key, value) VALUES (?, ?)",
	).run(key, value);
}

/**
 * Check whether spending since the last salary deposit has crossed a new
 * threshold (75%, 85%, or 95% of MONTHLY_SALARY). Sends a Telegram notification
 * only when a higher threshold is crossed for the first time in the current
 * salary cycle. Resets automatically when a new salary is detected.
 */
export async function checkSpendingAlerts({
	budget,
	db,
	notifyChannels,
}: {
	budget: BudgetBackend;
	db: Database.Database;
	notifyChannels: NotifyChannel[];
}): Promise<void> {
	const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	let transactions: Awaited<ReturnType<BudgetBackend["getTransactions"]>>;
	try {
		transactions = await budget.getTransactions(lookbackDate);
	} catch (err) {
		log.warn("spending_alert_fetch_failed", { error: String(err) });
		return;
	}

	// Find the most recent salary deposit
	const salaryTxns = transactions
		.filter((t) => t.amount > 0 && t.payee.toLowerCase().includes(SALARY_PAYEE))
		.sort((a, b) => b.date.localeCompare(a.date));

	if (salaryTxns.length === 0) {
		log.warn("spending_alert_no_salary", { since: lookbackDate });
		return;
	}

	const salaryDate = salaryTxns[0].date;

	// Sum all outgoing spend since salary, excluding internal account transfers
	const spendTxns = transactions.filter(
		(t) =>
			t.date >= salaryDate &&
			t.amount < 0 &&
			!t.payee.startsWith("Transfer :"),
	);
	const totalSpent = spendTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
	const pct = (totalSpent / MONTHLY_SALARY) * 100;

	// Highest threshold that has been crossed
	const currentBracket = (THRESHOLDS as readonly number[]).reduce(
		(highest, t) => (pct >= t ? t : highest),
		0,
	) as Threshold | 0;

	// Load persisted state
	const lastSalaryDate = getKv(db, "last_salary_date");
	let lastBracket = Number(getKv(db, "last_notified_bracket") ?? "0");

	// New salary cycle: reset alert state
	if (salaryDate !== lastSalaryDate) {
		setKv(db, "last_salary_date", salaryDate);
		setKv(db, "last_notified_bracket", "0");
		lastBracket = 0;
		log.info("spending_alert_cycle_reset", { salaryDate });
	}

	// Nothing new to report
	if (currentBracket <= lastBracket) return;

	// Crossed a new threshold — persist and notify
	setKv(db, "last_notified_bracket", String(currentBracket));

	const remaining = MONTHLY_SALARY - totalSpent;
	const daysElapsed = Math.round(
		(Date.now() - new Date(salaryDate).getTime()) / (24 * 60 * 60 * 1000),
	);

	const prefix =
		currentBracket >= 95 ? "CRITICAL" : currentBracket >= 85 ? "WARNING" : "NOTE";

	const message = [
		`Spending ${prefix}: ${currentBracket}% of salary spent`,
		`${totalSpent.toFixed(2)} EUR of ${MONTHLY_SALARY.toFixed(2)} EUR (${pct.toFixed(1)}%)`,
		`${remaining.toFixed(2)} EUR remaining`,
		`${daysElapsed} days since salary (${salaryDate})`,
	].join("\n");

	await sendNotification(notifyChannels, message, { urgent: currentBracket >= 85 });
	log.info("spending_alert_sent", {
		bracket: currentBracket,
		pct: pct.toFixed(1),
		spent: totalSpent.toFixed(2),
		remaining: remaining.toFixed(2),
	});
}
