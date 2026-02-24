---
name: ingest
description: "Scan project files and populate the SQLite knowledge base. Reads character profiles, arc contexts, chapters, and optionally consults the Worm wiki for missing info."
argument-hint: "[all|characters|relationships|states|concepts|wiki <name>]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "WebFetch", "WebSearch", "Task"]
---

# /scribe:ingest

Scan the project and populate the SQLite knowledge base. Re-runnable: uses upsert logic so running twice won't duplicate data.

## Step 1: Read Project State

Read `scribe.local.md` for paths and database location.

## Step 2: Parse Argument

| Argument | What It Does |
|----------|-------------|
| `all` | Full scan: characters, relationships, states, concepts |
| `characters` | Scan character files only |
| `relationships` | Extract relationships from character files and arc contexts |
| `states` | Parse chapters for character states at each chapter boundary |
| `concepts` | Extract political/philosophical concepts from context files |
| `wiki <name>` | Fetch a character/concept from worm.fandom.com and merge into DB |
| (none) | Same as `all` |

## Step 3: Route to Ingest Skill

Invoke the `scribe:ingest` skill with the parsed scope. The skill handles all the heavy lifting.

## Step 4: Report

After ingestion, run stats:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" stats
```

Show before/after counts so the user can see what was added.
