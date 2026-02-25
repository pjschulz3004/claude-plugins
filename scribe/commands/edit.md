---
name: "scribe:edit"
description: "Run the editing pipeline. Routes to current editing stage or a specific one: plot, scene, line, ai, hostile."
argument-hint: "[plot|scene|line|ai|hostile] [chapter-number]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "Task", "mcp__kg__kg_search"]
---

# /scribe:edit

You are running the Scribe editing pipeline. Your job is to route to the correct editing stage and load ONLY the context that stage needs.

## Step 1: Read Project State

Read the project's `scribe.local.md`. Extract current state and paths.

## Step 2: Determine Stage and Target

Parse the user's argument as: `[stage] [chapter-number]`

| Argument | Stage | Pipeline Stage Name |
|----------|-------|-------------------|
| `plot` | Stage 1: Plot & Continuity | `edit-1` |
| `scene` | Stage 2: Scene & Beat | `edit-2` |
| `line` | Stage 3: Line Edit | `edit-3` |
| `ai` | Stage 4: AI-Pattern Elimination | `edit-4` |
| `hostile` | Stage 5: Hostile Reader Pass | `edit-5` |
| (none) | Resume from `pipeline_stage` | (current) |

If no stage argument, read `pipeline_stage` from `scribe.local.md` and route to that stage.
If no chapter argument, use `current_chapter`.

## Step 3: Find the Input File

Each stage reads from the previous stage's output:

| Stage | Input File Suffix |
|-------|------------------|
| edit-1 (plot) | `(draft)` |
| edit-2 (scene) | `(edited-1-plot)` |
| edit-3 (line) | `(edited-2-scene)` |
| edit-4 (ai) | `(edited-3-line)` |
| edit-5 (hostile) | `(edited-4-ai)` |

Search for the input file using Glob. If it doesn't exist, check if the previous stage's output exists and suggest running that stage first. If the user wants to skip stages, allow it but note the skip.

## Step 4: Load Stage-Specific Context

Each stage loads ONLY its required references. This is critical for token efficiency.

### Stage 1: Plot & Continuity
Load:
- The draft file
- `{paths.context}/story-overview.md`
- Arc context file for the relevant arc
- Previous chapter (latest version)
- Character files for characters in this chapter
- If database exists: query character states and knowledge facts
- **KG lookup**: For each character in the chapter, query `kg_search(query="[character] state powers relationships", scope="au")`. Also query `kg_search(query="[location/event]", scope="canon")` for canon verification of any referenced locations or events. Flag canon vs AU inconsistencies.

Reference: `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 1 section)

### Stage 2: Scene & Beat
Load:
- Stage 1 output file
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 2 section)

### Stage 3: Line Edit
Load:
- Stage 2 output file
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md`
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 3 section)
- Voice guide for POV character (from project's style guides)

### Stage 4: AI-Pattern Elimination
Load:
- Stage 3 output file
- `${CLAUDE_PLUGIN_ROOT}/references/ai-ism-checklist.md`
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 4 section)

Optionally launch the `scribe:ai-ism-detector` agent as a subprocess for thorough scanning.

### Stage 5: Hostile Reader Pass
Load:
- Stage 4 output file ONLY
- No additional references (this is the "fresh eyes" pass)
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 5 section)

Adopt the hostile reader persona. No safety net of style guides.

## Step 5: Perform the Edit

Route to the appropriate skill:
- `edit-1` → `scribe:edit-plot`
- `edit-2` → `scribe:edit-scene`
- `edit-3` → `scribe:edit-line`
- `edit-4` → `scribe:edit-ai-patterns`
- `edit-5` → `scribe:edit-hostile`

If the skill doesn't exist yet, perform the edit directly using the loaded context and the editing-pipeline reference.

### Feedback Format

For each issue found, use this format:

```markdown
### [ISSUE TYPE] Line/Para Reference

**Current text**:
> [quoted text]

**Problem**: [what's wrong and why]

**Suggested fix**:
> [revised text]

**Rationale**: [why this fix works]
```

Present findings to the user in batches. Let them accept/reject/modify each suggestion.

## Step 6: Produce Output File

After the user has reviewed all feedback and approved changes:
- Apply accepted changes to produce the stage output file
- Name it: `X.X ArcName (edited-N-type).md` matching existing naming conventions
- Write to the same directory as the input file

## Step 7: Update Project State

Update `scribe.local.md`:
- Advance `pipeline_stage` to the next stage
- If Stage 5 complete, set stage to `final`

Suggest the next step:
- After edit-1: "Run `/scribe:edit scene` for scene structure review."
- After edit-2: "Run `/scribe:edit line` for prose polish."
- After edit-3: "Run `/scribe:edit ai` for AI-pattern elimination."
- After edit-4: "Run `/scribe:edit hostile` for the hostile reader pass."
- After edit-5: "Editing complete. Create the `(final)` version when ready."
