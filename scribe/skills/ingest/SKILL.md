---
name: ingest
description: "Scan project files and populate both the SQLite database and knowledge graph. Extracts characters, relationships, states, concepts, and feeds them into Graphiti for semantic search. Re-runnable."
---

# Ingest

You are scanning this project's files to populate two knowledge stores:

1. **SQLite** (structured data): Characters, relationships, states, concepts via `db-helper.sh` upsert commands
2. **Knowledge Graph** (semantic relationships): Entities and relationships via `kg_add_episode` MCP tool, which feeds Graphiti/Neo4j

Both stores are complementary. SQLite gives fast structured queries (who is alive, what arc did X appear in). The graph gives semantic search and relationship traversal (how does X connect to Y, what do we know about Z).

**Re-runnable**: SQLite uses upsert. The graph handles duplicate episodes gracefully (Graphiti deduplicates entities).

## Setup

Read `scribe.local.md` for paths. The database helper is at:
```
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh
```

Get current stats before starting:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" stats
```

## Scope

The user's argument determines what to ingest. For `all`, run every section below in order.

---

## 1. Characters

### Sources
- `{paths.characters}/original/*.md` — original characters with full profiles
- `{paths.characters}/canon/**/*.md` — canon characters (may be in subdirectories)
- `{paths.characters}/CHARACTER-INDEX.md` — quick reference with power/status info

### What to Extract
For each character file, extract:
- **name**: Full civilian name (e.g., "Taylor Hebert")
- **aliases**: Comma-separated other names (cape name, nicknames)
- **faction**: Primary faction (Union/Vanguard, PRT, Empire, Undersiders, etc.)
- **status**: alive, dead, unknown, injured
- **first_appearance**: Arc.Chapter format (e.g., "1.1")
- **cape_name**: Cape/hero/villain name
- **power_classification**: PRT classification if known
- **notes**: Brief summary of role in story

### How to Insert

**SQLite:**
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" upsert-character \
  "name" "aliases" "faction" "status" "first_appearance" "cape_name" "power_classification" "notes"
```

**Knowledge Graph:** After inserting a batch of characters (5-10 at a time), use `kg_add_episode` to feed a natural-language summary into the graph:
- **content**: A paragraph describing the characters, their powers, factions, and status. Example: "Taylor Hebert (cape name Consensus) is the leader of the Union, a parahuman labor organization. She is a Master with bug control powers. She first appeared in chapter 1.1."
- **source**: `"canon-chapter"` for canon characters, `"au-chapter"` for original characters
- **group**: `"worm-canon"` for canon characters, `"union-au"` for original characters

Batch characters by faction or role to create coherent episodes. Don't make one episode per character.

### Guidelines
- Read the CHARACTER-INDEX first for a quick overview, then read individual files for details
- For canon characters, include canon info relevant to the AU (status may differ from canon)
- If a character file is empty or minimal, use CHARACTER-INDEX data
- Don't ingest every minor canon character. Focus on: characters who appear in chapters, have profiles, or are referenced in arc outlines

---

## 2. Relationships

### Sources
- Character files (often have "Relationships" sections)
- `{paths.context}/arc-*-context.md` (describe relationships in arc context)
- Arc outlines in `{paths.arcs}/*/`

### What to Extract
For each relationship:
- **char_a_name**: First character (the perspective character)
- **char_b_name**: Second character
- **type**: ally, enemy, romantic, family, mentor, subordinate, rival, complicated
- **description**: Brief description of the relationship
- **as_of_arc**: Which arc this relationship status is current as of
- **as_of_chapter**: Specific chapter if known

### How to Insert

**SQLite:**
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" upsert-relationship \
  "char_a_name" "char_b_name" "type" "description" "as_of_arc" "as_of_chapter"
```

**Knowledge Graph:** After extracting relationships for a group of characters, use `kg_add_episode` with a natural-language description of those relationships:
- **content**: Describe the relationships as prose. Example: "Taylor Hebert and Jack Warren are close allies and co-founders of the Union. Their relationship is built on mutual trust forged during the Winslow organizing campaign. As of Arc 3, Jack serves as Taylor's anchor and emotional counterweight."
- **source**: `"research"`
- **group**: `"union-au"` (relationships are AU-specific even if characters are canon)
- **timestamp**: Use the in-story date for the `as_of_chapter` if known

### Guidelines
- Both characters must exist in the DB first (ingest characters before relationships)
- For bidirectional relationships (allies, romantic), pick one direction (A→B). The query command searches both directions.
- Focus on relationships that matter for the story: don't catalog every background connection
- If a relationship changes across arcs, insert the LATEST state with the current as_of_arc

---

## 3. Character States

### Sources
- Chapter files in `{paths.arcs}/arc-N-name/` (the actual prose or scene files)
- Arc context files

### What to Extract
For key chapters (not every chapter — focus on chapters where significant changes happen):
- **character name**: Who
- **arc**: Arc number
- **chapter**: Chapter number (e.g., "3.4")
- **physical_state**: Physical condition
- **emotional_state**: Emotional/mental state
- **voice_confidence**: 1-5 for POV characters (how confident/authoritative their voice is)
- **location**: Where they are
- **injuries**: Current injuries
- **notes**: Key events in this chapter affecting this character

### How to Insert

**SQLite:**
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" add-state \
  "name" "arc" "chapter" "physical" "emotional" "voice_conf" "location" "injuries" "notes"
```

**Knowledge Graph:** For significant state changes (injuries, location shifts, emotional turning points), use `kg_add_episode`:
- **content**: Describe the state change as prose. Example: "In chapter 2.8, Taylor was injured during the Empire raid on the Union safehouse. She suffered cracked ribs and minor concussion. Emotionally, this was a turning point: her voice confidence shifted from hedging to declarative as she rallied the team."
- **source**: `"au-chapter"`
- **group**: `"union-au"`
- **timestamp**: Use the in-story date for this chapter

Don't feed every minor state into the graph. Focus on changes that affect relationships or plot.

### Guidelines
- Focus on the POV character's state at major chapter boundaries
- Track states at arc boundaries (last chapter of each arc) for all major characters
- Don't try to extract states from every single chapter — focus on moments of significant change
- Read the arc context files for summaries rather than parsing every chapter

---

## 4. Concepts

### Sources
- `{paths.context}/arc-*-context.md` (mention political/philosophical concepts)
- `{paths.characters}/original/*.md` (may reference ideological frameworks)
- Knowledge base files in `{paths.knowledge_base}/`
- Worldbuilding files

### What to Extract
- **name**: Concept name (e.g., "War of Position", "Dual Power", "Organic Intellectual")
- **domain**: philosophy, politics, canon-lore, worldbuilding, organizing
- **thinker**: Who originated it (e.g., "Gramsci", "Luxemburg")
- **summary**: 1-2 sentence explanation
- **used_in_arcs**: Comma-separated arc numbers where it appears
- **story_purpose**: How this concept serves the narrative
- **source**: Where the info came from

### How to Insert

**SQLite:**
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" upsert-concept \
  "name" "domain" "thinker" "summary" "used_in_arcs" "story_purpose" "source"
```

**Knowledge Graph:** Batch related concepts together and use `kg_add_episode`:
- **content**: Describe concepts and their story role as prose. Example: "Gramsci's concept of the War of Position describes the slow cultural struggle for ideological hegemony, as opposed to the War of Maneuver (direct confrontation). In Union, Taylor uses this framework to justify the Union's strategy of building community power before directly challenging the Protectorate. This concept appears in Arcs 2 and 3."
- **source**: `"research"`
- **group**: `"worm-canon"` for canon-lore concepts, `"union-au"` for AU-specific applications

---

## 5. Wiki Lookup (wiki mode)

When the user specifies `wiki <name>`, or when you encounter a character/concept where information is unclear:

1. Fetch from `https://worm.fandom.com/wiki/<Name>` using WebFetch
2. Extract relevant information (power classification, relationships, status in canon)
3. Present to the user: "According to the Worm wiki, [info]. Should I add this to the DB?"
4. Only insert after user confirmation (canon info may differ from the AU)

If confirmed, insert into both SQLite (via db-helper.sh) and the Knowledge Graph (via `kg_add_episode` with `group: "worm-canon"` and `source: "canon-chapter"`).

### When to Auto-Consult Wiki
During character or relationship ingestion, if you find a canon character reference but:
- No character file exists for them
- Power classification is unknown
- Relationship details are vague

Then offer to look them up: "I found a reference to [character] but don't have detailed info. Check the Worm wiki?"

---

## 6. Report

After ingestion, show:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" stats
```

Compare with the before-stats and summarize what was added/updated.

Also report the total number of `kg_add_episode` calls made and the total nodes/edges extracted by Graphiti.

List any characters or relationships you couldn't resolve and suggest next steps.
