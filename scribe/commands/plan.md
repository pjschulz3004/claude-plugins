---
name: "scribe:plan"
description: "Plan your story at any level: story, arc, chapter, scenes, or beats. Routes to the appropriate planning workflow."
argument-hint: "[story|arc|chapter|scenes|beats|battle|campaign|character-arc|operation] [target]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "Task", "WebFetch", "WebSearch", "mcp__kg__kg_search", "mcp__kg__kg_add_episode"]
---

# /scribe:plan

You are running the Scribe planning pipeline. Your job is to route to the correct planning level and load only the context needed for that level.

## Step 1: Read Project State

Read the project's `scribe.local.md` file (check the project root directory for this file, or `.claude/scribe.local.md`). Extract:
- `project`: project name
- `current_arc`: which arc we're working in
- `current_chapter`: current chapter number
- `pipeline_stage`: where we are in the pipeline
- `paths`: directory paths for all project files

If no `scribe.local.md` exists, tell the user to run `/scribe:setup` first (or create one from the template at `${CLAUDE_PLUGIN_ROOT}/references/scribe-local-template.md`).

## Step 2: Parse the Planning Level

The user's argument determines the planning level. Parse it as: `[level] [target]`

| Level | Target Example | What It Means |
|-------|---------------|---------------|
| `story` | (none) | Plan/review the overall story structure |
| `arc` | `3` or `Agitprop` | Plan a specific arc |
| `chapter` | `3.5` | Plan a specific chapter within current arc |
| `scenes` | `3.5` | Break a chapter into scenes |
| `beats` | `3.5` | Expand scenes into beats |
| `battle` | `3.12` | Plan a battle/action chapter |
| `campaign` | `Arc 5` or `Empire War` | Plan a multi-chapter conflict arc |
| `character-arc` | `Taylor` or `Anchor` | Deep character arc planning |
| `operation` | `3.7` | Plan a heist/raid/operation chapter |

If no argument given, suggest the next logical step based on `pipeline_stage`:
- `plan-story` → suggest `story`
- `plan-arc` → suggest `arc [current_arc]`
- `plan-chapter` → suggest `chapter [current_chapter]`
- `plan-scenes` → suggest `scenes [current_chapter]`
- `plan-beats` → suggest `beats [current_chapter]`

## Step 3: Load Context (ONLY What's Needed)

### For `story` level:
- Read: `{paths.context}/story-overview.md` (or equivalent)
- Read: Arc outline files (summaries only)
- Read: Any existing story-level planning docs

### For `arc` level:
- Read: Story overview
- Read: Target arc outline (e.g., `{paths.arcs}/arc-3/outline.md`)
- Read: Previous arc's summary/ending (for continuity)
- Read: Character files for major characters in this arc

### For `chapter` level:
- Read: Arc outline for the relevant arc
- Read: Previous chapters in this arc (summaries or full, based on count)
- Read: Character files for characters appearing

### For `scenes` level:
- Read: Chapter description/outline
- Read: Character files for characters in the chapter
- Read: Arc context for continuity
- Load reference: `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`

### For `beats` level:
- Read: The `(scenes)` file for target chapter
- Read: Previous chapter's ending (for continuity)
- Load reference: `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` (beat structure section)

### Knowledge Graph Lookup (all levels)

After loading file context, query the Knowledge Graph for relevant facts. Extract character names, locations, and events from the loaded context and run:

1. **Canon lookup**: `kg_search(query="[characters/locations/events from context]", scope="canon", limit=10)`
2. **AU lookup**: `kg_search(query="[same query]", scope="au", limit=10)`

If AU results contradict canon results, flag the inconsistency to the user before proceeding:
> "KG note: Canon says [X], but your AU has [Y]. Using AU version. Say 'update KG' if either needs correction."

If the user identifies a KG error or wants to record an AU-specific fact, use:
`kg_add_episode(content="[corrected fact]", group="union-au", source="user-input")`

Use KG results as grounding context alongside file-based context for the planning work.

## Step 4: Route to Planning Skill

Invoke the appropriate skill using the Skill tool:
- `story` → `scribe:plan-story`
- `arc` → `scribe:plan-arc`
- `chapter` → `scribe:plan-chapter`
- `scenes` → `scribe:plan-scenes`
- `beats` → `scribe:plan-beats`
- `battle` → `scribe:plan-battle`
- `campaign` → `scribe:plan-campaign`
- `character-arc` → `scribe:plan-character-arc`
- `operation` → `scribe:plan-operation`

If the skill doesn't exist yet, perform the planning directly using the loaded context and the scene-structure reference.

## Step 5: Continuity Check

After planning is complete, run a lightweight continuity check:
- For `story`/`arc`: Check timeline consistency across arcs
- For `chapter`/`scenes`/`beats`: Check character states match previous chapter
- If a database exists at the configured path, query it for relevant character states and knowledge facts

Report any continuity concerns to the user.

## Step 6: Update Project State

After the user approves the planning output:
- Update `scribe.local.md` with the new pipeline stage
- Update `current_chapter` if it changed
- Suggest the next step in the pipeline

## Pipeline Stage Progression
```
plan-story → plan-arc → plan-chapter → plan-scenes → plan-beats → write-draft
                                                                      ↓
                                                              edit-1 → edit-2 → edit-3 → edit-4 → edit-5 → final
```
