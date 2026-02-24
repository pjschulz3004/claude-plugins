---
name: research
description: "Research a topic for your story. Searches existing knowledge base first, then web. Saves findings to knowledge base and optionally to SQLite."
argument-hint: "<topic>"
allowed-tools: ["Read", "Write", "Glob", "Grep", "Bash", "WebFetch", "WebSearch", "AskUserQuestion"]
---

# /scribe:research

Research a topic and save it to the project's knowledge base.

## Step 1: Read Project State

Read `scribe.local.md` for paths (especially `knowledge_base` and `database`).

## Step 2: Check Existing Knowledge

Search `{paths.knowledge_base}/` for existing files on this topic using Grep.
If database exists, query the `concepts` and `knowledge_facts` tables.

If good information already exists, present it and ask if the user wants more.

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

## Step 5: Update Database (if exists)

Ask the user if findings should be added to the database:
- Character information → `characters` table
- World facts → `knowledge_facts` table
- Philosophical/political concepts → `concepts` table

Use `db-helper.sh query` to insert records.

## Step 6: Report

Summarize what was found and where it was saved.
