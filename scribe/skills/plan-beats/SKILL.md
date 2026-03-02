---
name: plan-beats
description: "Expand scenes into specific beats with turns, causality, and word estimates. Produces per-scene beat files. Use after scene planning."
---

# Plan Beats

You are helping the author expand a scene breakdown into specific, actionable beats. Beats are the smallest unit of story change.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter. Format: `[arc].[chapter]`.

## Step 2: Find Scene Files

Check for new format first, then old:
- New: `{paths.arcs}/arc-N-name/X.X/planning/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (scenes).md`

If new format, create beats directory:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/beats"
```

## Step 3: Load Context

Read:
1. **Scene files**: from `X.X/planning/` (or old format scenes file)
2. **Previous chapter ending**: last scene/beats of prior chapter
3. **Character files**: for characters in these scenes

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md`

### Knowledge Graph Lookup
1. For each character: `kg_search(query="[character] powers fighting style", scope="canon", limit=5)`
2. For knowledge states: `kg_search(query="[character] knows about [topic]", scope="au", limit=5)`

## Step 4: Expand Each Scene into Beats

For each scene, create 4-8 beats.

### Beat Rules
- Every beat MUST turn something (status, knowledge, or plan)
- Connect via "therefore" or "but", never "and then"
- MRU order: motivation (external) before reaction (internal)
- Reaction sequence: feeling → action → speech
- Pacing: at least one turn per ~300 words
- Mix beat types within a scene

### Craft Integration

**Micro-Tension**: For each beat, name two competing feelings. If you can't, the beat has no tension.

**Yes-But/No-And Engine**: Label each beat's outcome. Verify escalation:
- Early: establish goal, first complication
- Middle: complications stack
- Late: decisive turn

**Dialogue Beat Design**: For conversation beats, define surface (literal), subtext (actual meaning), power dynamic (who controls, does it shift?).

**Sensory Rotation**: Assign dominant sense per beat. Don't default to visual.

**Time Dilation**: Mark each beat as expanded (3-5x, crisis), normal (1x), or compressed (0.3x, routine).

## Step 5: Produce Output Files

### New Format (per-scene files)
For each scene, write `X.X/beats/scene-N.md`:

```markdown
# Scene N: [Title] — Beats
<!-- Chapter X.X | [Location] | [POV] -->

**Opening friction**: [tension]
**Dramatic question**: [the one question]

### Beat 1: [description]
**Type**: [Action / Decision / Revelation / Reversal / Emotional]
**What happens**: [1-2 sentences]
**What turns**: [change]
**Competing feelings**: [A] vs [B]
**Dominant sense**: [sight/sound/touch/etc.]
**Time dilation**: [expanded/normal/compressed]
**~words**: [estimate]

### Beat 2: [description]
...

**Scene outcome**: [Yes,but / No,and / etc.]
**Closing hinge**: [decision / reversal / image]
**Exiting state**: [how character has changed]
```

### Old Format (single file)
Write `{paths.arcs}/arc-N-name/X.X Title (beats).md` with all scenes combined.

## Step 6: Verify Beat Sequence

Per scene:
- [ ] Every beat turns something
- [ ] Causality (therefore/but)
- [ ] Beat types mixed
- [ ] MRU order respected
- [ ] ~1 turn per 300 words
- [ ] Opens friction, closes hinge

Per chapter:
- [ ] Total word estimate reasonable
- [ ] Tension escalates across scenes
- [ ] Character state changes trackable

## Step 7: Author Review

Present beats. Common adjustments: cutting filler beats, adding missing turns, reordering for causality, adjusting word estimates.

## Step 8: Suggest Next Step

- Draft prose → `/scribe:write [X.X]`
- Revise scenes → `/scribe:plan scenes [X.X]`

Update `scribe.local.md` with `pipeline_stage: write-draft`.
