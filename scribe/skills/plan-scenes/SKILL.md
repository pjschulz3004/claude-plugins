---
name: plan-scenes
description: "Break a chapter into scenes with purpose, characters, location, and hinges. Produces per-scene files in the chapter subdirectory. Use after chapter planning."
---

# Plan Scenes

You are helping the author break a chapter into individual scenes. Each scene is a continuous unit of action in one location/timeframe with a clear dramatic purpose.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter to plan scenes for. Format: `[arc].[chapter]` (e.g., `3.7`).

## Step 2: Create Chapter Directory

Create the chapter subdirectory structure:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/planning"
```

## Step 3: Load Context

Read these files:
1. **Arc outline**: For the chapter's purpose and required beats
2. **Arc context**: `{paths.context}/arc-N-name-context.md`
3. **Chapter planning doc** (if exists): Any existing chapter description
4. **Previous chapter ending**: Last 1-2 scenes of previous chapter
5. **Character files**: For characters appearing in this chapter

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`
- `${CLAUDE_PLUGIN_ROOT}/references/dialogue-reference.md` (if dialogue-heavy)

### Knowledge Graph Lookup

1. For each character: `kg_search(query="[character] powers relationships state", scope="au", limit=5)`
2. For locations: `kg_search(query="[location] description layout", scope="canon", limit=5)`
3. Flag AU vs canon discrepancies.

## Step 4: Design Scenes

For each scene, define:
1. **Scene number and title**
2. **POV, Location, Characters, Time**
3. **Opening friction**: tension in first 2-3 lines
4. **Dramatic question**: the ONE question
5. **Goal → Conflict → Disaster**: action structure
6. **Closing hinge**: decision, reversal, or image
7. **What changes**: status/knowledge/plan shift
8. **Estimated length**

### Scene Function Audit
Every scene must advance at least 2 of 3: plot, character, theme.

### Opening Gambit Selection
One technique per scene. Don't repeat in consecutive scenes:
1. In medias res  2. Sensory grounding  3. Embedded question  4. Friction first  5. Desire statement

### Scene Exit Design
Tag outcome type. Vary across chapter:
- Yes, but / No, and (primary drivers)
- No, but / Yes (rare, save for milestones)

### Enter Late, Leave Early
Mark latest possible entry and earliest possible exit for each scene.

## Step 5: Check Scene Sequence

- Causality (therefore/but between scenes)
- Escalation (tension rises)
- Pacing (mix of types and lengths)
- Character arc progresses
- Breathing room if chapter is intense

## Step 6: Produce Output Files

### Chapter Plan
Write `X.X/planning/chapter-plan.md`:
```markdown
# X.X [Title] — Scene Plan

**Chapter purpose**: [one sentence]
**POV**: [character]
**Scene count**: [N]
**Estimated total words**: [sum]
**Tension arc**: [description of emotional shape]
**Continuity flags**: [anything to watch]
```

### Per-Scene Files
For each scene, write `X.X/planning/scene-N.md`:
```markdown
# Scene N: [Title]
<!-- Chapter X.X | [Location] | [POV] | ~[word estimate] words -->

**Characters**: [who's present]
**Time**: [when]

**Opening friction**: [tension]
**Dramatic question**: [the one question]

**Structure**:
- Goal: [what POV character wants]
- Conflict: [what opposes]
- Disaster/Complication: [how it ends]

**Rough content**: [2-4 sentences]

**Closing hinge**: [decision / reversal / image]
**What changes**: [shift]
**Scene exit**: [Yes,but / No,and / etc.]
```

## Step 7: Author Review

Present the scene breakdown. Common adjustments: merging/splitting scenes, reordering, adding/removing characters, adjusting tension curve.

## Step 8: Suggest Next Step

- Expand into beats → `/scribe:plan beats [X.X]`
- Revise chapter plan → `/scribe:plan chapter [X.X]`

Update `scribe.local.md` with `pipeline_stage: plan-beats`.
