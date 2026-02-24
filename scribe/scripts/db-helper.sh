#!/usr/bin/env bash
# Scribe database helper — wraps sqlite3 for common operations
# Usage: db-helper.sh <db-path> <command> [args...]

set -euo pipefail

DB_PATH="${1:?Usage: db-helper.sh <db-path> <command> [args...]}"
CMD="${2:?Missing command}"
shift 2

case "$CMD" in
    init)
        SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
        sqlite3 "$DB_PATH" < "$SCRIPT_DIR/init-db.sql"
        echo "Database initialized at $DB_PATH"
        ;;
    query)
        sqlite3 -header -column "$DB_PATH" "$@"
        ;;
    character-state)
        # Get latest state for a character: db-helper.sh <db> character-state "Taylor"
        NAME="$1"
        sqlite3 -header -column "$DB_PATH" \
            "SELECT cs.*, c.name, c.cape_name FROM character_states cs
             JOIN characters c ON cs.character_id = c.id
             WHERE c.name LIKE '%${NAME}%' OR c.cape_name LIKE '%${NAME}%'
             ORDER BY cs.arc DESC, cs.chapter DESC LIMIT 1;"
        ;;
    who-knows)
        # Who knows a fact: db-helper.sh <db> who-knows "Taylor is Consensus"
        FACT="$1"
        sqlite3 -header -column "$DB_PATH" \
            "SELECT * FROM knowledge_facts WHERE fact LIKE '%${FACT}%' AND still_valid = 1;"
        ;;
    relationships)
        # Get relationships for a character: db-helper.sh <db> relationships "Taylor"
        NAME="$1"
        sqlite3 -header -column "$DB_PATH" \
            "SELECT c1.name as from_char, r.type, c2.name as to_char, r.description, r.as_of_chapter
             FROM relationships r
             JOIN characters c1 ON r.char_a_id = c1.id
             JOIN characters c2 ON r.char_b_id = c2.id
             WHERE c1.name LIKE '%${NAME}%' OR c2.name LIKE '%${NAME}%'
             ORDER BY r.as_of_arc DESC, r.as_of_chapter DESC;"
        ;;
    concepts)
        # Get concepts by domain: db-helper.sh <db> concepts "philosophy"
        DOMAIN="$1"
        sqlite3 -header -column "$DB_PATH" \
            "SELECT name, thinker, summary, used_in_arcs, story_purpose
             FROM concepts WHERE domain = '${DOMAIN}' ORDER BY name;"
        ;;
    continuity-issues)
        # Get unresolved continuity issues: db-helper.sh <db> continuity-issues [arc]
        if [ $# -ge 1 ]; then
            sqlite3 -header -column "$DB_PATH" \
                "SELECT * FROM continuity_log WHERE resolved = 0 AND arc = $1 ORDER BY severity, chapter;"
        else
            sqlite3 -header -column "$DB_PATH" \
                "SELECT * FROM continuity_log WHERE resolved = 0 ORDER BY severity, arc, chapter;"
        fi
        ;;
    upsert-character)
        # Upsert a character: db-helper.sh <db> upsert-character "name" "aliases" "faction" "status" "first_appearance" "cape_name" "power_classification" "notes"
        sqlite3 "$DB_PATH" "INSERT INTO characters (name, aliases, faction, status, first_appearance, cape_name, power_classification, notes, updated_at)
            VALUES ('$(echo "$1" | sed "s/'/''/g")', '$(echo "${2:-}" | sed "s/'/''/g")', '$(echo "${3:-}" | sed "s/'/''/g")', '${4:-alive}', '${5:-}', '$(echo "${6:-}" | sed "s/'/''/g")', '$(echo "${7:-}" | sed "s/'/''/g")', '$(echo "${8:-}" | sed "s/'/''/g")', CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                aliases=COALESCE(NULLIF(excluded.aliases,''), aliases),
                faction=COALESCE(NULLIF(excluded.faction,''), faction),
                status=COALESCE(NULLIF(excluded.status,''), status),
                first_appearance=COALESCE(NULLIF(excluded.first_appearance,''), first_appearance),
                cape_name=COALESCE(NULLIF(excluded.cape_name,''), cape_name),
                power_classification=COALESCE(NULLIF(excluded.power_classification,''), power_classification),
                notes=COALESCE(NULLIF(excluded.notes,''), notes),
                updated_at=CURRENT_TIMESTAMP;"
        echo "Upserted character: $1"
        ;;
    upsert-relationship)
        # Upsert a relationship: db-helper.sh <db> upsert-relationship "char_a_name" "char_b_name" "type" "description" "as_of_arc" "as_of_chapter"
        CHAR_A="$1"; CHAR_B="$2"; RTYPE="$3"; DESC="${4:-}"; ARC="${5:-}"; CHAP="${6:-}"
        sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO relationships (char_a_id, char_b_id, type, description, as_of_arc, as_of_chapter)
            SELECT a.id, b.id, '${RTYPE}', '$(echo "${DESC}" | sed "s/'/''/g")', NULLIF('${ARC}',''), NULLIF('${CHAP}','')
            FROM characters a, characters b
            WHERE a.name = '$(echo "${CHAR_A}" | sed "s/'/''/g")' AND b.name = '$(echo "${CHAR_B}" | sed "s/'/''/g")';"
        echo "Upserted relationship: $1 --[$3]--> $2"
        ;;
    add-state)
        # Add character state: db-helper.sh <db> add-state "name" "arc" "chapter" "physical" "emotional" "voice_conf" "location" "injuries" "notes"
        NAME="$1"; ARC="$2"; CHAP="$3"
        sqlite3 "$DB_PATH" "INSERT INTO character_states (character_id, arc, chapter, physical_state, emotional_state, voice_confidence, location, injuries, notes)
            SELECT id, ${ARC}, '${CHAP}', '$(echo "${4:-}" | sed "s/'/''/g")', '$(echo "${5:-}" | sed "s/'/''/g")', NULLIF('${6:-}',''), '$(echo "${7:-}" | sed "s/'/''/g")', '$(echo "${8:-}" | sed "s/'/''/g")', '$(echo "${9:-}" | sed "s/'/''/g")'
            FROM characters WHERE name = '$(echo "${NAME}" | sed "s/'/''/g")';"
        echo "Added state: $1 at $2/$3"
        ;;
    add-fact)
        # Add knowledge fact: db-helper.sh <db> add-fact "fact" "category" "arc" "chapter" "known_by" "notes"
        sqlite3 "$DB_PATH" "INSERT INTO knowledge_facts (fact, category, established_in_arc, established_in_chapter, known_by, notes)
            VALUES ('$(echo "$1" | sed "s/'/''/g")', '${2:-canon}', NULLIF('${3:-}',''), '${4:-}', '$(echo "${5:-}" | sed "s/'/''/g")', '$(echo "${6:-}" | sed "s/'/''/g")');"
        echo "Added fact: $1"
        ;;
    upsert-concept)
        # Upsert concept: db-helper.sh <db> upsert-concept "name" "domain" "thinker" "summary" "used_in_arcs" "story_purpose" "source"
        sqlite3 "$DB_PATH" "INSERT INTO concepts (name, domain, thinker, summary, used_in_arcs, story_purpose, source, updated_at)
            VALUES ('$(echo "$1" | sed "s/'/''/g")', '${2:-canon-lore}', '$(echo "${3:-}" | sed "s/'/''/g")', '$(echo "${4:-}" | sed "s/'/''/g")', '${5:-}', '$(echo "${6:-}" | sed "s/'/''/g")', '$(echo "${7:-}" | sed "s/'/''/g")', CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                domain=excluded.domain, thinker=COALESCE(NULLIF(excluded.thinker,''), thinker),
                summary=COALESCE(NULLIF(excluded.summary,''), summary),
                used_in_arcs=COALESCE(NULLIF(excluded.used_in_arcs,''), used_in_arcs),
                story_purpose=COALESCE(NULLIF(excluded.story_purpose,''), story_purpose),
                source=COALESCE(NULLIF(excluded.source,''), source),
                updated_at=CURRENT_TIMESTAMP;"
        echo "Upserted concept: $1"
        ;;
    stats)
        # Show database statistics
        echo "=== Scribe Database Stats ==="
        sqlite3 "$DB_PATH" "SELECT 'Characters: ' || COUNT(*) FROM characters;
            SELECT 'Relationships: ' || COUNT(*) FROM relationships;
            SELECT 'Character States: ' || COUNT(*) FROM character_states;
            SELECT 'Knowledge Facts: ' || COUNT(*) FROM knowledge_facts;
            SELECT 'Concepts: ' || COUNT(*) FROM concepts;
            SELECT 'Continuity Issues: ' || COUNT(*) || ' (' || COALESCE(SUM(CASE WHEN resolved=0 THEN 1 ELSE 0 END),0) || ' unresolved)' FROM continuity_log;"
        ;;
    *)
        echo "Unknown command: $CMD"
        echo "Commands: init, query, stats, character-state, who-knows, relationships, concepts, continuity-issues"
        echo "Upsert:  upsert-character, upsert-relationship, add-state, add-fact, upsert-concept"
        exit 1
        ;;
esac
