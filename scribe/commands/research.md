---
name: "scribe:research"
description: "Research a topic for your story. Searches knowledge graph, SQLite, and markdown first, then web. Saves findings to all three stores."
argument-hint: "<topic>"
allowed-tools: ["Read", "Write", "Glob", "Grep", "Bash", "WebFetch", "WebSearch", "AskUserQuestion", "mcp__kg__kg_search", "mcp__kg__kg_add_episode"]
---

# /scribe:research

Research a topic and save it to the project's knowledge base.

## Step 1: Read Project State

Read `scribe.local.md` for paths (especially `knowledge_base` and `database`).

## Step 2: Check Existing Knowledge

Search all three knowledge stores in parallel:

1. **Knowledge Graph**: Use the `kg_search` MCP tool with the topic as query. Try both `scope: "canon"` and `scope: "au"` if the topic might span both. The graph returns entities, relationships, and facts with temporal tracking.

2. **SQLite**: If database exists, query `concepts`, `knowledge_facts`, and `characters` tables via `db-helper.sh`.

3. **Markdown files**: Search `{paths.knowledge_base}/` using Grep.

Present all results together, noting which store each result came from. If good information already exists, present it and ask if the user wants more.

## Step 3: Research

If more information is needed:
1. Use WebSearch to find relevant sources
2. Use WebFetch to read promising results
3. For fiction projects based on existing works: check wiki sources, fan resources
4. For real-world topics (philosophy, history, politics): find authoritative sources

## Step 4: Synthesize and Save

Create a markdown file in `{paths.knowledge_base}/`:
- Filename: topic as kebab-case (e.g., `gramscian-hegemony.md`, `canary-powers.md`)
- Content: summary, key facts, relevance to story, source URLs

Format:
```markdown
# [Topic]

## Summary
[2-3 paragraph overview]

## Key Facts
- [fact 1]
- [fact 2]

## Story Relevance
[How this connects to the narrative]

## Sources
- [URL 1]
- [URL 2]

---
*Researched: [date]*
```

## Step 5: Update Knowledge Stores

After saving the markdown file, ingest findings into both structured stores:

### Knowledge Graph (always do this)

Use the `kg_add_episode` MCP tool to feed the synthesized research into Graphiti. This automatically extracts entities and relationships.

- **content**: The full synthesized research text (summary + key facts + story relevance)
- **source**: `"research"`
- **group**: `"worm-canon"` for canon material, `"union-au"` for AU-specific findings
- **timestamp**: Use in-story date if the research relates to a specific timeline point, otherwise omit

If the research covers both canon and AU material, make two separate `kg_add_episode` calls with appropriate groups.

### SQLite (ask user first)

Ask the user if findings should also be added to the SQLite database:
- Character information → `characters` table via `db-helper.sh upsert-character`
- World facts → `knowledge_facts` table via `db-helper.sh add-fact`
- Philosophical/political concepts → `concepts` table via `db-helper.sh upsert-concept`

## Step 6: Report

Summarize what was found and where it was saved. Include counts from the KG ingestion (nodes and edges extracted).
