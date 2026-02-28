---
name: "scribe:write"
description: "Draft prose from a beats file. Loads the appropriate voice guide and prose style rules."
argument-hint: "[chapter-number]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /scribe:write

You are running the Scribe drafting pipeline. Your job is to produce a first prose draft from a beats file.

## Step 1: Read Project State

Read the project's `scribe.local.md`. Extract current state and paths.

If `pipeline_stage` is not `plan-beats` or later, warn the user that beats should be completed before drafting. Ask if they want to continue anyway.

## Step 2: Identify the Target Chapter and Type

If the user provided a chapter number argument, use that.
Otherwise, use `current_chapter` from `scribe.local.md`.

If the user specified `battle` as a subcommand (e.g., `/scribe:write battle 3.12`), route to `scribe:write-battle` instead of the standard drafting workflow. Battle chapters need specialized voice compression, time dilation, and spatial anchoring craft.

## Step 3: Find the Beats File

Search for the `(beats)` file for the target chapter using the project's naming convention.
Common patterns:
- `{paths.arcs}/*/X.X * (beats).md`
- `{paths.manuscript}/X.X * (beats).md`

Use Glob to find it. If multiple matches, ask the user which one.
If no beats file exists, tell the user to run `/scribe:plan beats [chapter]` first.

## Step 4: Load Context

Read these files:
1. **The beats file** (required)
2. **Previous chapter's final/latest version** (for continuity and voice momentum)
3. **Character files** for characters appearing in this chapter (check the beats file for who's present)
4. **Voice guide** for the POV character:
   - Check `{paths.style_guides}` for character-specific editing prompts
   - For first-person POV: look for the protagonist's voice guide
   - For interludes (third-person): look for the interlude editing guide
5. **Prose rules reference**: `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md`

Also check the project's CLAUDE.md for any non-negotiable house style rules (e.g., punctuation, forbidden patterns).

## Step 5: Draft the Prose

Write the first draft following these principles:

### Structure
- Follow the beat structure from the `(beats)` file exactly
- Hit ALL planned beats
- Include scene breaks where indicated in the beats
- Produce one continuous chapter file

### Voice
- Match the POV character's established voice (vocabulary, rhythm, verbal tics)
- Calibrate confidence level to the `voice_confidence` setting in `scribe.local.md`
- Maintain consistent tone throughout

### Prose Quality (First Draft Level)
- Apply the spiral+jab rhythm pattern
- Vary sentence types (job-mix heuristic)
- Use concrete details over abstractions
- Keep figurative language to turning points
- Follow house style rules (punctuation, etc.)

### What NOT to Do
- Don't over-polish. This is a draft. Editing comes later.
- Don't add beats that aren't in the beats file without asking
- Don't break voice for the sake of "good writing"
- Don't front-load description. Open with friction.

### Output Format
Write the draft to: `{paths.arcs}/[arc-dir]/X.X ArcName (draft).md`
(Match the naming convention used by existing files in the project.)

At the end of the draft, add:

```markdown
---

## Author Notes for Editing Phase
[Summarize any concerns: weak spots, beats that felt forced, voice wobbles,
continuity questions, sections that need expansion or compression]
```

## Step 6: Post-Draft

1. Ask the user for their notes and concerns about the draft
2. Incorporate any immediate feedback
3. Update `scribe.local.md`:
   - Set `pipeline_stage` to `edit-1`
4. Suggest: "Draft complete. Run `/scribe:edit plot` to begin the editing pipeline, or `/scribe:edit` to start from the current stage."
