---
name: plan-beats
description: "Expand scenes into specific beats with turns, causality, and word estimates. Produces the (beats) file. Use after scene planning."
---

# Plan Beats

You are helping the author expand a scene breakdown into specific, actionable beats. Beats are the smallest unit of story change — each one shifts status, knowledge, or plan.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter. Format: `[arc].[chapter]` (e.g., `3.5`).

## Step 2: Load Context

Read these files:
1. **The (scenes) file**: `{paths.arcs}/arc-N-name/X.X Title (scenes).md` — this is your primary input
2. **Previous chapter ending**: The last scene/beats of the prior chapter (for continuity)
3. **Character files**: For characters in these scenes (voice, personality, current state)

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` — especially the Beat Structure and MRU sections

If database exists, query for character states and relevant knowledge facts:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[character]"
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" who-knows "[relevant fact]"
```

## Step 3: Expand Each Scene into Beats

For each scene from the `(scenes)` file, create 4-8 beats:

### Beat Format
```markdown
### Beat N: [Short description]
**Type**: [Action / Decision / Revelation / Reversal / Emotional]
**What happens**: [1-2 sentences — concrete event, dialogue, or internal shift]
**What turns**: [What changes: status, knowledge, or plan]
**Approximate words**: [word estimate for this beat]
```

### Beat Rules (from reference)
- Every beat MUST turn something — if nothing changes, it's filler, cut it
- **Causality**: Connect beats with "therefore" or "but", never "and then"
- **Try-Fail Cycles**: Attempt 1 fails → Attempt 2 partial → Attempt 3 decisive
- **MRU Order**: Motivation (external) always precedes Reaction (internal)
- **Reaction sequence**: Feeling → Action → Speech (when showing multiple)
- **Pacing**: At least one turn per ~300 words
- **Beat variety**: Mix types within a scene (don't run 3 Action beats in a row)

### The "Yes, But / No, And" Engine
For each beat, tag the outcome:
- **Yes, But...**: Goal achieved, new complication
- **No, And...**: Goal failed, things get worse
- **Yes!**: Clean victory (rare — save for arc climaxes)
- **No.**: Flat failure (always add "And..." to make it productive)

## Step 4: Verify Beat Sequence

For each scene's beats, check:
- [ ] Every beat turns something (status/knowledge/plan)
- [ ] Beats connect via therefore/but, not and-then
- [ ] Beat types are mixed (not all the same)
- [ ] MRU order respected (motivation before reaction)
- [ ] Pacing: ~1 turn per 300 words
- [ ] Scene's dramatic question gets answered by the final beat
- [ ] Scene opens on friction (first beat establishes tension)
- [ ] Scene closes on hinge (last beat is decision/reversal/image)

For the full chapter:
- [ ] Total word estimate is reasonable for the chapter
- [ ] Tension escalates across scenes
- [ ] Character state changes are trackable beat-to-beat

## Step 5: Produce the (beats) File

Write the file following the naming convention:
`{paths.arcs}/arc-N-name/X.X Title (beats).md`

Structure:

```markdown
# X.X [Title] — Beats

**POV**: [character]
**Entering state**: [physical, emotional, what they know]
**Chapter goal**: [what the POV character wants across the chapter]

---

## Scene 1: [Title]

**Opening friction**: [what tension starts the scene]
**Dramatic question**: [the one question]

### Beat 1: [description]
**Type**: [type]
**What happens**: [concrete event]
**What turns**: [change]
**~words**: [estimate]

### Beat 2: [description]
...

**Scene outcome**: [Yes, But / No, And / etc.]
**Closing hinge**: [decision / reversal / image]

---

## Scene 2: [Title]
...

---

## Chapter Summary
- **Total estimated words**: [sum]
- **Beat count**: [N]
- **Exiting state**: [how the POV character has changed]
- **Threads advanced**: [which plot threads moved]
- **Setups planted**: [new foreshadowing]
- **Continuity notes**: [anything the draft writer needs to track]
```

## Step 6: Author Review

Present beats to the author. Common adjustments:
- Cutting beats that don't turn anything
- Adding beats where the gap between changes is too large
- Reordering beats for better causality
- Adjusting word estimates to hit target chapter length
- Adding specific dialogue or action ideas

## Step 7: Suggest Next Step

- To draft prose from these beats → `/scribe:write [X.X]`
- To revise scenes → `/scribe:plan scenes [X.X]`
- To check continuity before drafting → `/scribe:continuity [X.X]`

Update `scribe.local.md` with `pipeline_stage: write-draft`.
