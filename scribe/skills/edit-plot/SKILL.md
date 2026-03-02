---
name: edit-plot
description: "Stage 1 editing: Plot & Continuity. Reads all scene files for continuity, outputs per-scene edited files plus continuity notes."
---

# Edit Stage 1: Plot & Continuity

You are performing the first editing pass. This stage focuses ONLY on whether the chapter serves the story correctly at a structural and continuity level. Do NOT fix prose, voice, or style.

## Step 1: Identify Target

Find the draft. Check new format first:
- New: `{paths.arcs}/arc-N-name/X.X/draft/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (draft).md`

If new format, create output directory:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/edit-1-plot"
```

## Step 2: Load Context

Read:
1. **All draft scene files** (read ALL for continuity analysis)
2. **Story overview**: `{paths.context}/story-overview.md`
3. **Arc context**: `{paths.context}/arc-N-name-context.md`
4. **Arc outline**
5. **Previous chapter** (ending especially)
6. **Character files** for all characters in this chapter

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 1 section)

### Knowledge Graph Verification
1. For each character: `kg_search(query="[character] current state injuries location", scope="au", limit=5)`
2. For referenced events: `kg_search(query="[event]", scope="canon", limit=5)`
3. Flag discrepancies.

## Step 3: Build Continuity Scratchpad

- Prior state: where previous chapter left things
- Already used: analogies, images, citations from recent chapters
- Active threads: ongoing plot elements
- This chapter must: required beats, foreshadowing, callbacks

## Step 4: Run Checks

### Continuity
- [ ] Timeline logical from previous chapter
- [ ] Character states consistent (injuries, emotions, locations, possessions)
- [ ] Props/objects tracked correctly
- [ ] Knowledge states: characters only know what they've witnessed or been told
- [ ] Canon compliance
- [ ] Location consistency

### Plot Function
- [ ] Chapter purpose statable in one sentence
- [ ] All planned beats present
- [ ] Causality chain (therefore/but, not coincidence)
- [ ] Stakes escalation
- [ ] No orphan scenes

### Character Arc
- [ ] Protagonist changes by chapter end
- [ ] Supporting characters functional (not furniture)
- [ ] Lie/Truth journey advanced or complicated
- [ ] Ghost/Wound traceable in decisions
- [ ] State change: compare entry vs exit for each character

### Foreshadowing Audit
- [ ] Echoes due from earlier chapters checked
- [ ] New plants have planned payoff chapters
- [ ] No deus ex machina

### Thematic Integrity
- [ ] Themes present, explored through conflict not lecture
- [ ] Le Guin Test: could intelligent character argue the opposite?
- [ ] Ideology through character goals, not monologue

### First-Person Information Audit
- [ ] Every fact traceable to source (witnessed, told, deduced)
- [ ] No omniscient slips
- [ ] Emotional reads proportionate to character's perceptiveness

### Structural Position
- [ ] Chapter fulfills its arc-position obligation (setup/escalation/climax)

## Step 5: Produce Output

### New Format
Write per-scene edited files to `X.X/edit-1-plot/scene-N.md` with structural fixes applied.
Write `X.X/edit-1-plot/continuity-notes.md` with cross-scene continuity observations.

### Old Format
Write `{paths.arcs}/arc-N-name/X.X Title (edited-1-plot).md`

Include summary comment at top of each file:
```markdown
<!-- Edit Stage 1: Plot & Continuity
Issues found: [N critical, N warning, N note]
Key changes: [bullet list]
Continuity flags for next stages: [list]
-->
```

## Step 6: Update State

Present issue summary. Update `scribe.local.md`: `pipeline_stage: edit-2`
Suggest: `/scribe:edit scene [X.X]`
