---
name: kb
description: "Query the knowledge base. Search markdown files and SQLite database for characters, facts, concepts, and continuity issues."
argument-hint: "<query> | characters | facts | concepts | issues"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "AskUserQuestion"]
---

# /scribe:kb

Query the project's knowledge base (markdown files + SQLite database).

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
| `<free text>` | Search knowledge-base files and database |

## Step 3: Search

### If database exists:
Use `${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh` with the appropriate command:
- `character-state "<name>"` — latest character state
- `relationships "<name>"` — character relationships
- `who-knows "<fact>"` — who knows a specific fact
- `concepts "<domain>"` — concepts by domain
- `continuity-issues [arc]` — unresolved issues
- `query "<SQL>"` — custom query for advanced users

### Always also search markdown files:
Search `{paths.knowledge_base}/` with Grep for the query terms.
Search `{paths.characters}/` if the query looks like a character name.

## Step 4: Present Results

Format results clearly. For character lookups, combine database records with markdown file content into a unified view.

If no results found, suggest using `/scribe:research <topic>` to add information.
