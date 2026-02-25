---
name: continuity
description: "Check story or chapter-level continuity. Uses SQLite database and context files to find contradictions, timeline issues, and unresolved threads."
argument-hint: "[story|chapter] [target]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "AskUserQuestion", "Task", "mcp__kg__kg_search", "mcp__kg__kg_add_episode"]
---

# /scribe:continuity

Run a continuity check at the story or chapter level.

## Step 1: Read Project State

Read `scribe.local.md` for paths and current position.

## Step 2: Determine Scope

| Argument | Scope |
|----------|-------|
| `story` | Cross-arc continuity check |
| `chapter X.X` | Single chapter continuity |
| (none) | Current chapter |

## Step 3: Load Context

### Story-level:
- Story overview, all arc outlines
- Character files (status fields)
- If database exists: query all unresolved continuity_log entries, character states across arcs
- **KG lookup**: `kg_search(query="major character states and relationships", scope="au", limit=15)` for current AU state, then `kg_search(query="[same]", scope="canon")` for canon reference

### Chapter-level:
- Target chapter (latest version)
- Previous chapter
- Arc context
- Character files for characters present
- If database exists: query character states as of previous chapter, relevant knowledge facts
- **KG lookup**: For each character in the chapter, run `kg_search(query="[character name] current state powers relationships", scope="au")` to verify states match

## Step 4: Check Continuity

Create a continuity scratchpad and verify:
- **Timeline**: Dates, time of day, elapsed time between events
- **Character states**: Injuries, emotional state, knowledge, location
- **Props/objects**: Items mentioned exist, are used correctly, aren't forgotten
- **Relationships**: Current status matches last established state
- **Knowledge states**: Characters only act on information they actually have
- **Foreshadowing/payoff**: Setup from earlier chapters tracked, payoffs noted
- **Canon compliance**: Query `kg_search(query="[entity or event in question]", scope="canon")` to verify against Worm canon. Flag any AU deviations that aren't already recorded in the AU scope
- **AU consistency**: For any flagged issue, check if it's an intentional AU divergence via `kg_search(query="[issue]", scope="au")`. If the user confirms a new AU fact, record it: `kg_add_episode(content="[fact]", group="union-au", source="user-input")`

## Step 5: Report

Present findings as:
```
### [SEVERITY] Issue Description
**Location**: [chapter/scene reference]
**Problem**: [what's inconsistent]
**Evidence**: [the contradicting facts]
**Suggested resolution**: [how to fix it]
```

Severity: `CRITICAL` (breaks story logic), `WARNING` (noticeable), `NOTE` (minor).

If database exists, offer to log findings to the `continuity_log` table.

## Step 6: Optionally launch continuity-checker agent

For thorough checks, use the Task tool to launch the `scribe:continuity-checker` agent with the loaded context. The agent can do deeper cross-referencing.
