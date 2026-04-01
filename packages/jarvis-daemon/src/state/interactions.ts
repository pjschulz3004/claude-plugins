/**
 * Deep interaction logging and analysis.
 *
 * Every user interaction is logged with rich metadata:
 * - What was asked (intent, topic, entities)
 * - What Jarvis did (tools used, actions taken)
 * - How the user responded (follow-up = unsatisfied, new topic = satisfied, correction = wrong)
 * - Time patterns (when does Paul ask what)
 * - Mood signals (message length, response time, corrections)
 *
 * The growth engine reads this to:
 * - Identify recurring questions (proactive automation candidates)
 * - Detect dissatisfaction patterns (quality improvements)
 * - Learn topic preferences (briefing personalisation)
 * - Track capability gaps (new tool/skill creation)
 */

import type Database from "better-sqlite3";
import { createLogger } from "../logger.js";

const log = createLogger("interactions");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Interaction {
	id?: number;
	timestamp: string;
	channel: "telegram" | "heartbeat" | "growth";

	// What was asked
	user_message: string;
	intent: string;
	topic: string;
	entities: string;

	// What Jarvis did
	assistant_response: string;
	tools_used: string;
	actions_taken: string;
	response_time_ms: number;
	model_used: string;
	tokens_used: number;

	// User satisfaction signals
	follow_up: boolean;
	correction: boolean;
	explicit_feedback: string | null;

	// Context
	time_of_day: string;
	day_of_week: string;
	mood_signal: string;
}

export interface InteractionPattern {
	topic: string;
	intent: string;
	count: number;
	avg_satisfaction: number;
	peak_hour: number;
	peak_day: string;
	last_seen: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class InteractionStore {
	private readonly db: Database.Database;

	constructor(db: Database.Database) {
		this.db = db;
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS interactions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				timestamp TEXT NOT NULL DEFAULT (datetime('now')),
				channel TEXT NOT NULL DEFAULT 'telegram',

				user_message TEXT NOT NULL,
				intent TEXT NOT NULL DEFAULT 'unknown',
				topic TEXT NOT NULL DEFAULT 'other',
				entities TEXT NOT NULL DEFAULT '[]',

				assistant_response TEXT NOT NULL DEFAULT '',
				tools_used TEXT NOT NULL DEFAULT '[]',
				actions_taken TEXT NOT NULL DEFAULT '[]',
				response_time_ms INTEGER NOT NULL DEFAULT 0,
				model_used TEXT NOT NULL DEFAULT '',
				tokens_used INTEGER NOT NULL DEFAULT 0,

				follow_up INTEGER NOT NULL DEFAULT 0,
				correction INTEGER NOT NULL DEFAULT 0,
				explicit_feedback TEXT,

				time_of_day TEXT NOT NULL DEFAULT 'unknown',
				day_of_week TEXT NOT NULL DEFAULT 'unknown',
				mood_signal TEXT NOT NULL DEFAULT 'unknown'
			)
		`);
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_interactions_timestamp
				ON interactions(timestamp DESC)
		`);
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_interactions_topic
				ON interactions(topic, timestamp DESC)
		`);
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_interactions_intent
				ON interactions(intent, timestamp DESC)
		`);
	}

	record(interaction: Omit<Interaction, "id">): number {
		const stmt = this.db.prepare(`
			INSERT INTO interactions (
				timestamp, channel, user_message, intent, topic, entities,
				assistant_response, tools_used, actions_taken, response_time_ms, model_used, tokens_used,
				follow_up, correction, explicit_feedback,
				time_of_day, day_of_week, mood_signal
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		const result = stmt.run(
			interaction.timestamp,
			interaction.channel,
			interaction.user_message,
			interaction.intent,
			interaction.topic,
			interaction.entities,
			interaction.assistant_response,
			interaction.tools_used,
			interaction.actions_taken,
			interaction.response_time_ms,
			interaction.model_used,
			interaction.tokens_used,
			interaction.follow_up ? 1 : 0,
			interaction.correction ? 1 : 0,
			interaction.explicit_feedback,
			interaction.time_of_day,
			interaction.day_of_week,
			interaction.mood_signal,
		);

		log.info("interaction_recorded", {
			intent: interaction.intent,
			topic: interaction.topic,
			mood: interaction.mood_signal,
			response_time_ms: interaction.response_time_ms,
			tools: interaction.tools_used,
			message_preview: interaction.user_message.slice(0, 80),
		});

		return Number(result.lastInsertRowid);
	}

	markFollowUp(interactionId: number): void {
		this.db.prepare("UPDATE interactions SET follow_up = 1 WHERE id = ?").run(interactionId);
		log.debug("interaction_follow_up", { id: interactionId });
	}

	markCorrection(interactionId: number, feedback: string): void {
		this.db.prepare(
			"UPDATE interactions SET correction = 1, explicit_feedback = ? WHERE id = ?",
		).run(feedback, interactionId);
		log.info("interaction_correction", { id: interactionId, feedback });
	}

	getRecent(days = 7, limit = 200): Interaction[] {
		return this.db.prepare(`
			SELECT * FROM interactions
			WHERE timestamp > datetime('now', '-' || ? || ' days')
			ORDER BY timestamp DESC
			LIMIT ?
		`).all(days, limit) as Interaction[];
	}

	getLastInteractionId(): number | null {
		const row = this.db.prepare(
			"SELECT id FROM interactions ORDER BY id DESC LIMIT 1",
		).get() as { id: number } | undefined;
		return row?.id ?? null;
	}

	analysePatterns(days = 30): InteractionPattern[] {
		const rows = this.db.prepare(`
			SELECT
				topic,
				intent,
				COUNT(*) as count,
				1.0 - (CAST(SUM(follow_up) AS REAL) + CAST(SUM(correction) AS REAL)) / NULLIF(COUNT(*) * 2.0, 0) as avg_satisfaction,
				CAST(strftime('%H', timestamp) AS INTEGER) as hour,
				CASE CAST(strftime('%w', timestamp) AS INTEGER)
					WHEN 0 THEN 'sunday' WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday'
					WHEN 3 THEN 'wednesday' WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday'
					WHEN 6 THEN 'saturday' END as dow,
				MAX(timestamp) as last_seen
			FROM interactions
			WHERE timestamp > datetime('now', '-' || ? || ' days')
			GROUP BY topic, intent
			HAVING COUNT(*) >= 2
			ORDER BY count DESC
		`).all(days) as Array<{
			topic: string;
			intent: string;
			count: number;
			avg_satisfaction: number;
			hour: number;
			dow: string;
			last_seen: string;
		}>;

		return rows.map((r) => ({
			topic: r.topic,
			intent: r.intent,
			count: r.count,
			avg_satisfaction: Math.max(0, Math.min(1, r.avg_satisfaction ?? 1.0)),
			peak_hour: r.hour,
			peak_day: r.dow,
			last_seen: r.last_seen,
		}));
	}

	getRecurringQuestions(minOccurrences = 3, days = 30): Array<{ question_pattern: string; count: number; topic: string }> {
		return this.db.prepare(`
			SELECT
				LOWER(SUBSTR(user_message, 1, 80)) as question_pattern,
				topic,
				COUNT(*) as count
			FROM interactions
			WHERE intent = 'question'
				AND timestamp > datetime('now', '-' || ? || ' days')
			GROUP BY LOWER(SUBSTR(user_message, 1, 80)), topic
			HAVING COUNT(*) >= ?
			ORDER BY count DESC
			LIMIT 20
		`).all(days, minOccurrences) as Array<{ question_pattern: string; count: number; topic: string }>;
	}

	getSatisfactionTrend(windowDays = 7, periods = 4): Array<{ period: string; satisfaction: number; count: number }> {
		const results: Array<{ period: string; satisfaction: number; count: number }> = [];

		for (let i = 0; i < periods; i++) {
			const startDay = (i + 1) * windowDays;
			const endDay = i * windowDays;

			const row = this.db.prepare(`
				SELECT
					COUNT(*) as count,
					1.0 - (CAST(SUM(follow_up) AS REAL) + CAST(SUM(correction) AS REAL)) / NULLIF(COUNT(*) * 2.0, 0) as satisfaction
				FROM interactions
				WHERE timestamp > datetime('now', '-' || ? || ' days')
					AND timestamp <= datetime('now', '-' || ? || ' days')
			`).get(startDay, endDay) as { count: number; satisfaction: number } | undefined;

			results.push({
				period: `${startDay}d-${endDay}d ago`,
				satisfaction: row?.satisfaction ?? 1.0,
				count: row?.count ?? 0,
			});
		}

		return results.reverse();
	}

	formatForGrowth(days = 7): string {
		const patterns = this.analysePatterns(days);
		const recurring = this.getRecurringQuestions(2, days);
		const trend = this.getSatisfactionTrend(7, 4);
		const recent = this.getRecent(1, 20);

		const sections: string[] = [];

		if (trend.some((t) => t.count > 0)) {
			sections.push("Satisfaction trend (higher is better):");
			for (const t of trend) {
				const pct = (t.satisfaction * 100).toFixed(0);
				sections.push(`  ${t.period}: ${pct}% (n=${t.count})`);
			}
		}

		if (patterns.length > 0) {
			sections.push("\nInteraction patterns:");
			for (const p of patterns.slice(0, 10)) {
				sections.push(`  ${p.topic}/${p.intent}: ${p.count}x, satisfaction ${(p.avg_satisfaction * 100).toFixed(0)}%, peak ${p.peak_day} ${p.peak_hour}:00`);
			}
		}

		if (recurring.length > 0) {
			sections.push("\nRecurring questions (automation candidates):");
			for (const q of recurring.slice(0, 5)) {
				sections.push(`  "${q.question_pattern}" (${q.count}x, topic: ${q.topic})`);
			}
		}

		const corrections = recent.filter((i) => i.correction);
		if (corrections.length > 0) {
			sections.push("\nRecent corrections (learn from these):");
			for (const c of corrections) {
				sections.push(`  User: "${c.user_message.slice(0, 60)}" -> Feedback: "${c.explicit_feedback}"`);
			}
		}

		const moods: Record<string, number> = {};
		for (const i of recent) {
			moods[i.mood_signal] = (moods[i.mood_signal] || 0) + 1;
		}
		if (Object.keys(moods).length > 0) {
			sections.push(`\nMood signals (last 24h): ${Object.entries(moods).map(([m, c]) => `${m}=${c}`).join(", ")}`);
		}

		return sections.length > 0 ? sections.join("\n") : "No interaction data available yet.";
	}
}

// ---------------------------------------------------------------------------
// Classifiers (lightweight, no LLM needed)
// ---------------------------------------------------------------------------

const TOPIC_KEYWORDS: Record<string, string[]> = {
	email: ["email", "inbox", "mail", "message", "sender", "triage", "unread"],
	calendar: ["calendar", "event", "meeting", "appointment", "schedule", "today", "tomorrow"],
	budget: ["budget", "spent", "spending", "money", "ynab", "category", "transaction", "euro", "eur"],
	contacts: ["contact", "person", "phone", "address"],
	files: ["file", "document", "invoice", "receipt", "pdf"],
	system: ["status", "health", "breaker", "daemon", "task", "log"],
};

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string }> = [
	{ pattern: /^\//, intent: "command" },
	{ pattern: /\?$|\bwhat\b|\bhow\b|\bwhen\b|\bwhere\b|\bwhy\b|\bwho\b|\bcan you\b|\bcould you\b/i, intent: "question" },
	{ pattern: /\bwrong\b|\bno\b.*\bnot\b|\bincorrect\b|\bfix\b|\bactually\b/i, intent: "correction" },
	{ pattern: /\bthanks\b|\bthank you\b|\bperfect\b|\bgreat\b|\bgood\b|\bnice\b/i, intent: "feedback" },
	{ pattern: /.*/, intent: "statement" },
];

const MOOD_SIGNALS: Array<{ check: (msg: string) => boolean; mood: string }> = [
	{ check: (m) => m.length < 15, mood: "concise" },
	{ check: (m) => m.length > 200, mood: "detailed" },
	{ check: (m) => m === m.toUpperCase() && m.length > 3, mood: "frustrated" },
	{ check: (m) => /[!]{2,}/.test(m), mood: "urgent" },
	{ check: () => true, mood: "neutral" },
];

export function classifyIntent(message: string): string {
	for (const { pattern, intent } of INTENT_PATTERNS) {
		if (pattern.test(message)) return intent;
	}
	return "unknown";
}

export function classifyTopic(message: string): string {
	const lower = message.toLowerCase();
	let bestTopic = "other";
	let bestScore = 0;
	for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
		const score = keywords.filter((kw) => lower.includes(kw)).length;
		if (score > bestScore) {
			bestScore = score;
			bestTopic = topic;
		}
	}
	return bestTopic;
}

export function classifyMood(message: string): string {
	for (const { check, mood } of MOOD_SIGNALS) {
		if (check(message)) return mood;
	}
	return "neutral";
}

export function getTimeOfDay(): string {
	const hour = new Date().getHours();
	if (hour < 6) return "night";
	if (hour < 12) return "morning";
	if (hour < 18) return "afternoon";
	return "evening";
}

export function getDayOfWeek(): string {
	return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
}
