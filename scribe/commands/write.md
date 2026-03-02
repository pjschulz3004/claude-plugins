---
name: "scribe:write"
description: "Draft prose from beat files. Dispatches scene-drafter sub-agents for scene-level processing."
argument-hint: "[chapter-number] or [battle chapter-number]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /scribe:write

You are running the Scribe drafting pipeline. Your job is to orchestrate scene-by-scene drafting via sub-agents.

## Step 1: Read Project State

Read the project's `scribe.local.md`. Extract current state and paths.

If `pipeline_stage` is not `plan-beats` or later, warn that beats should be completed first.

## Step 2: Identify Target and Type

If user provided a chapter number argument, use that. Otherwise use `current_chapter`.

If user specified `battle` (e.g., `/scribe:write battle 3.12`), route to `scribe:write-battle` instead.

## Step 3: Find Beat Files

Check for new format first, then old:
- New: `{paths.arcs}/arc-N-name/X.X/beats/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X * (beats).md`

If new format found, ensure draft directory exists:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/draft"
```

If no beats found, tell user to run `/scribe:plan beats [chapter]` first.

## Step 4: Route to Skill

Route to `scribe:write-draft` skill, which handles:
- Loading shared context (character files, voice guides, prose rules)
- Preparing voice summary for sub-agents
- Dispatching scene-drafter sub-agents per scene
- Collecting outputs to `X.X/draft/scene-N.md`
- Post-draft summary and author review
- State update to `pipeline_stage: edit-1`

## Step 5: Post-Draft

Suggest: "Draft complete. Run `/scribe:edit plot [X.X]` to begin editing."
