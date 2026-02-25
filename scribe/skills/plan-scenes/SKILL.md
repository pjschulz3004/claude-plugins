---
name: plan-scenes
description: "Break a chapter into scenes with purpose, characters, location, and hinges. Produces the (scenes) file. Use after chapter planning."
---

# Plan Scenes

You are helping the author break a chapter into individual scenes. Each scene is a continuous unit of action in one location/timeframe with a clear dramatic purpose.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter to plan scenes for. Format: `[arc].[chapter]` (e.g., `3.5`).

## Step 2: Load Context

Read these files:
1. **Arc outline**: For the chapter's purpose and required beats
2. **Arc context**: `{paths.context}/arc-N-name-context.md`
3. **Chapter planning doc** (if exists): Any existing chapter description
4. **Previous chapter ending**: Read the end of the previous chapter (last 1-2 scenes) to know the entering state
5. **Character files**: For characters appearing in this chapter

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` — for scene structure rules

If database exists, query character states:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[character]"
```

### Knowledge Graph Lookup

Query the KG for characters, locations, and events relevant to this chapter:

1. For each character appearing: `kg_search(query="[character name] powers abilities relationships current state", scope="canon", limit=5)` and `kg_search(query="[same]", scope="au", limit=5)`
2. For each location: `kg_search(query="[location name] description layout", scope="canon", limit=5)`
3. If AU results contradict canon, note the divergence briefly (e.g., "Canon: X is alive; AU: X is dead — using AU"). If the user identifies a missing AU fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

Use KG results to ground scene design in established facts (character capabilities, location details, relationship dynamics).

## Step 3: Design Scenes

For each scene, define:

### Required Elements
1. **Scene number and title**: e.g., "Scene 1: The Holding Cell"
2. **POV**: Whose perspective
3. **Location**: Where it takes place
4. **Characters present**: Who is in the scene
5. **Time**: When (relative to previous scene)
6. **Opening friction**: The tension in the first 2-3 lines
7. **Dramatic question**: The ONE question this scene poses
8. **Goal → Conflict → Disaster**: The scene's action structure
9. **Closing hinge**: Decision, reversal, or striking image
10. **What changes**: Status, knowledge, or plan shift by scene end

### Scene Guidelines (from reference)
- Open with friction, close on hinge — always
- One dramatic question per scene
- At least one turn per ~300 words
- Scene-Sequel pattern: Action scenes followed by reaction sequences
- Vary scene types (action, dialogue, reflection, transition)
- Vary scene lengths within the chapter

## Step 4: Check Scene Sequence

Verify the scene sequence works:
- **Causality**: Each scene's outcome causes the next scene's situation (therefore/but)
- **Escalation**: Tension generally rises across the chapter
- **Pacing**: Mix of scene types and lengths (not all the same)
- **Character arc**: POV character's state progresses across scenes
- **Breathing room**: At least one quieter moment if the chapter is intense

## Step 5: Produce the (scenes) File

Write the file following the project's naming convention:
`{paths.arcs}/arc-N-name/X.X Title (scenes).md`

Use this format for each scene:

```markdown
## Scene N: [Title]

**POV**: [character]
**Location**: [place]
**Characters**: [who's present]
**Time**: [when]

**Opening friction**: [what tension opens the scene]
**Dramatic question**: [the one question]

**Structure**:
- Goal: [what POV character wants]
- Conflict: [what opposes them]
- Disaster/Complication: [how it ends badly or with complication]

**Rough content**: [2-4 sentences describing what happens]

**Closing hinge**: [decision / reversal / image]

**What changes**: [status/knowledge/plan shift]

**Estimated length**: [word count range]
```

After all scenes, add:

```markdown
## Chapter Notes
- **Total estimated length**: [sum]
- **Scene count**: [N]
- **Tension arc**: [brief description of the chapter's emotional shape]
- **Continuity flags**: [anything to watch for]
```

## Step 6: Author Review

Present the scene breakdown to the author. Common adjustments:
- Merging or splitting scenes
- Reordering for better flow
- Adding/removing characters from scenes
- Adjusting the tension curve
- Changing the closing hinge

## Step 7: Suggest Next Step

- To expand into beats → `/scribe:plan beats [X.X]`
- To revise the chapter plan → `/scribe:plan chapter [X.X]`
- If the author wants to draft from scenes directly → `/scribe:write [X.X]`

Update `scribe.local.md` with `pipeline_stage: plan-beats`.
