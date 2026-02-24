-- Scribe Knowledge Graph Schema
-- Run: sqlite3 <db-path> < init-db.sql

CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    aliases TEXT,           -- comma-separated
    faction TEXT,
    status TEXT DEFAULT 'alive',  -- alive, dead, unknown, injured
    first_appearance TEXT,  -- e.g. "1.1"
    cape_name TEXT,
    power_classification TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_a_id INTEGER NOT NULL REFERENCES characters(id),
    char_b_id INTEGER NOT NULL REFERENCES characters(id),
    type TEXT NOT NULL,     -- ally, enemy, romantic, family, mentor, subordinate
    description TEXT,
    as_of_arc INTEGER,
    as_of_chapter TEXT,     -- e.g. "3.5"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS character_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters(id),
    arc INTEGER NOT NULL,
    chapter TEXT NOT NULL,
    physical_state TEXT,
    emotional_state TEXT,
    voice_confidence INTEGER,  -- 1-5 for POV characters
    location TEXT,
    injuries TEXT,
    possessions TEXT,
    knows_facts TEXT,          -- comma-separated fact IDs
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT NOT NULL,
    category TEXT,             -- secret, public, canon, au-specific
    established_in_arc INTEGER,
    established_in_chapter TEXT,
    known_by TEXT,             -- comma-separated character names
    still_valid INTEGER DEFAULT 1,
    contradicted_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,      -- philosophy, politics, canon-lore, worldbuilding
    thinker TEXT,              -- e.g. "Gramsci", "Luxemburg"
    summary TEXT,
    used_in_arcs TEXT,         -- comma-separated arc numbers
    story_purpose TEXT,        -- how this concept serves the narrative
    source TEXT,               -- where the information came from
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS continuity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arc INTEGER,
    chapter TEXT,
    issue_type TEXT,           -- contradiction, unresolved, missing_payoff, timeline
    description TEXT,
    severity TEXT,             -- critical, warning, note
    resolved INTEGER DEFAULT 0,
    resolved_in TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraints for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_unique ON relationships(char_a_id, char_b_id, type);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_states_char_arc ON character_states(character_id, arc, chapter);
CREATE INDEX IF NOT EXISTS idx_relationships_chars ON relationships(char_a_id, char_b_id);
CREATE INDEX IF NOT EXISTS idx_facts_category ON knowledge_facts(category);
CREATE INDEX IF NOT EXISTS idx_concepts_domain ON concepts(domain);
CREATE INDEX IF NOT EXISTS idx_continuity_arc ON continuity_log(arc, chapter);
