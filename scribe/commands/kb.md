---
name: "scribe:kb"
description: "Query the knowledge base. Searches knowledge graph, SQLite, and markdown files for characters, facts, relationships, concepts, and continuity issues."
argument-hint: "<query> | characters | facts | concepts | issues"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /scribe:kb

Query the project's knowledge base (knowledge graph + SQLite + markdown files).

## Step 1: Read Project State

Read `scribe.local.md` for paths.

## Step 2: Parse Query

| Argument | Action |
|----------|--------|
| `characters` | List all characters from database |
| `facts` | List knowledge facts (optionally filter by category) |
| `concepts [domain]` | List concepts, optionally filtered by domain |
| `issues [arc]` | List unresolved continuity issues |
| `<character-name>` | Look up character state, relationships, facts |
| `<free text>` | Search all knowledge stores |

## Step 3: Search

Run searches against all three stores. For free-text queries and character lookups, search all three in parallel.

### Knowledge Graph (always search this first for free-text and character queries)

Use the `kg_search` MCP tool:
- **query**: The user's search query
- **scope**: Use `"all"` for general queries. Use `"canon"` or `"au"` if the user specifies
- **limit**: 10 (default)

The graph returns facts with entity relationships and temporal validity. This is the richest source for "how does X relate to Y" questions.

### SQLite (if database exists)

Use `${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh` with the appropriate command:
- `character-state "<name>"` — latest character state
- `relationships "<name>"` — character relationships
- `who-knows "<fact>"` — who knows a specific fact
- `concepts "<domain>"` — concepts by domain
- `continuity-issues [arc]` — unresolved issues
- `query "<SQL>"` — custom query for advanced users

### Markdown files (always search)

Search `{paths.knowledge_base}/` with Grep for the query terms.
Search `{paths.characters}/` if the query looks like a character name.

## Step 4: Present Results

Combine results from all stores into a unified view. When the same entity appears in multiple stores, merge the information rather than repeating it. Note the source only when it matters (e.g., a fact from the graph that isn't in SQLite yet).

For character lookups: lead with graph relationships (richer), supplement with SQLite state data, include relevant markdown notes.

If no results found, suggest using `/scribe:research <topic>` to add information.
