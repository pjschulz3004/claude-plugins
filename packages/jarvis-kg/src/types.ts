export interface Entity {
	name: string;
	type: string; // "person", "invoice", "event", "category", "service"
	properties?: Record<string, string | number | boolean>;
}

export interface Relation {
	type: string; // "SENT_BY", "CATEGORIZED_AS", "ATTENDED", "PAID_FOR", etc.
	properties?: Record<string, string | number | boolean>;
}

export interface Episode {
	subject: Entity;
	relation: Relation;
	object: Entity;
	timestamp?: string; // ISO 8601, defaults to now
	source?: string; // "email_triage", "budget_check", "briefing", etc.
}

export interface SearchResult {
	entity: Entity;
	relations: Array<{
		relation: Relation;
		target: Entity;
		timestamp: string;
	}>;
}

export interface KGStats {
	nodeCount: number;
	edgeCount: number;
	staleEdgeCount: number; // edges older than threshold
}

export interface KGClientConfig {
	uri: string; // bolt://localhost:7687
	user: string; // neo4j
	password: string;
	staleThresholdDays?: number; // default 30
}

export interface ContextSearchOptions {
	/** Keywords to search for (OR-joined). */
	keywords: string[];
	/** Only return relationships newer than this many days. Default: 7. */
	daysBack?: number;
	/** Max results to return. Default: 5. */
	limit?: number;
}
