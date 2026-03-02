---
name: "scribe:edit"
description: "Run the editing pipeline. Routes to current stage or specific one: plot, scene, line, ai, hostile, dialogue, tension, combine."
argument-hint: "[plot|scene|line|ai|hostile|dialogue|tension|combine] [chapter-number]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /scribe:edit

You are running the Scribe editing pipeline. Route to the correct stage and load ONLY what that stage needs.

## Step 1: Read Project State

Read `scribe.local.md`. Extract current state and paths.

## Step 2: Determine Stage and Target

Parse argument as: `[stage] [chapter-number]`

| Argument | Stage | Skill |
|----------|-------|-------|
| `plot` | Stage 1: Plot & Continuity | `scribe:edit-plot` |
| `scene` | Stage 2: Scene & Beat | `scribe:edit-scene` |
| `line` | Stage 3: Line Edit | `scribe:edit-line` |
| `ai` | Stage 4: AI-Pattern (3-agent) | `scribe:edit-ai-patterns` |
| `hostile` | Stage 5: Hostile Reader (3-persona) | `scribe:edit-hostile` |
| `dialogue` | Optional: Dialogue Pass | `scribe:edit-dialogue` |
| `tension` | Optional: Tension Audit | `scribe:edit-tension` |
| `combine` | Combine scenes to final | (run combine script) |
| (none) | Resume from `pipeline_stage` | (current) |

If no stage argument, read `pipeline_stage` and route accordingly.
If no chapter argument, use `current_chapter`.

## Step 3: Find Input Files

Each stage reads from the previous stage's output directory:

| Stage | Input Directory / Suffix |
|-------|-------------------------|
| edit-1 (plot) | `X.X/draft/` or `(draft)` |
| edit-2 (scene) | `X.X/edit-1-plot/` or `(edited-1-plot)` |
| edit-3 (line) | `X.X/edit-2-scene/` or `(edited-2-scene)` |
| edit-4 (ai) | `X.X/edit-3-line/` or `(edited-3-line)` |
| edit-5 (hostile) | `X.X/edit-4-ai/` or `(edited-4-ai)` |
| combine | `X.X/edit-5-hostile/` or `(edited-5-hostile)` |

Check new format (subdirectory) first, then old format (flat file).

## Step 4: Route to Skill

Route to the appropriate skill. Each skill handles its own context loading.

### Stages 4 and 5: Sub-Agent Dispatch
These stages dispatch sub-agents WITHOUT conversation context:
- Stage 4: 3 detection agents (language, structure, voice) per scene in parallel
- Stage 5: 3 hostile readers (ai-hater, lit-snob, worm-fan) per scene in parallel

Both produce reports, synthesis, and edited scene files.

## Step 5: Combine (special command)

When argument is `combine`:
1. Find scene files in `X.X/edit-5-hostile/` (or latest stage with scene files)
2. Run the combine script:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/combine-scenes.sh" "{paths.arcs}/arc-N-name/X.X" "edit-5-hostile"
```
3. Output: `X.X/final/chapter.md`
4. Present combined chapter to author for final review

## Step 6: Update State

After each stage completes, advance `pipeline_stage`:
- edit-1 → edit-2 → edit-3 → edit-4 → edit-5 → final

Suggest the next step:
- After edit-1: `/scribe:edit scene`
- After edit-2: `/scribe:edit line`
- After edit-3: `/scribe:edit ai`
- After edit-4: `/scribe:edit hostile`
- After edit-5: `/scribe:edit combine` to produce final chapter
