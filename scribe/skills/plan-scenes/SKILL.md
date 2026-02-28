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

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` — for scene structure rules
- `${CLAUDE_PLUGIN_ROOT}/references/dialogue-reference.md` — if chapter is dialogue-heavy (per chapter type classification)

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

## Step 3b: Craft Integration

### Scene Function Audit

Every scene must advance at least **2 of 3**: plot, character, theme. Before finalizing each scene, run the checklist:

| Scene | Plot? | Character? | Theme? | Pass? |
|-------|-------|------------|--------|-------|
| 1     | Y/N   | Y/N        | Y/N    | 2+?   |
| 2     | Y/N   | Y/N        | Y/N    | 2+?   |
| ...   | ...   | ...        | ...    | ...   |

If a scene only does one thing, find ways to layer in a second function. A pure exposition scene can also develop the character delivering it. A pure action scene can also advance theme through what the POV character notices or chooses.

### Opening Gambit Selection

Select one opening technique per scene. Do not repeat the same type in consecutive scenes:

1. **In medias res**: Start mid-action, orient the reader after the hook lands
2. **Sensory grounding**: Place the reader physically (body, space, weather) before anything else
3. **Embedded question**: Raise curiosity in the first line (something odd, unexplained, or wrong)
4. **Friction first**: Open on conflict, disagreement, or discomfort between characters
5. **Desire statement**: Character wants something immediately (reaching for it, asking for it, planning it)

Match technique to scene purpose. Action scenes work best with #1 or #4. Quiet scenes with #2 or #5. Mystery/discovery scenes with #3.

### Scene Exit Design

Tag each scene's outcome type. Vary across the chapter:

| Outcome | Meaning | Frequency |
|---------|---------|-----------|
| Yes | Goal achieved cleanly | Rare (major turning points only) |
| Yes, but | Goal achieved, new complication | **Primary driver** |
| No, but | Goal failed, silver lining or new option | Moderate |
| No | Goal failed flat | Always add "and..." to make it productive |
| No, and | Goal failed, things get worse | **Primary driver** |

Never use the same outcome type twice in a row. Distribution target: mostly "Yes, but" and "No, and" (these create the strongest forward momentum). Save clean "Yes" for the chapter's climactic scene or arc milestones.

### Dialogue Scene Design

For every conversation-driven scene, plan these four elements before writing:

1. **Power dynamics entering**: Who holds status? Who controls the conversation? (Dominant/submissive/shifting)
2. **Status flip**: Plan at least one moment where control of the conversation changes hands
3. **The unsaid**: What is NOT spoken aloud? (The unsaid drives subtext. If everything important is spoken, the scene is flat)
4. **Stakes map**: Who wants what, who knows what, what happens if they fail to get it

### Psychic Distance Planning

Place each scene on Gardner's spectrum and plan at least one distance shift within the scene:

| Level | Example | Use For |
|-------|---------|---------|
| 1 | "It was winter in Brockton Bay." | Transitions, time jumps, establishing |
| 2 | "Taylor walked to the warehouse." | Setup, routine action |
| 3 | "The warehouse smelled like rust and old rain." | Scene grounding, description |
| 4 | "She could feel the alignment shifting, the insects responding to something she hadn't asked for." | Character interiority, building tension |
| 5 | "No. Not this. Not again." | Crisis moments, peak emotion, turning points |

Crisis moments need Level 4-5. Transitions can use Level 1-2. Identify the "zoom moment" in each scene (the beat where you push closest to Level 5).

### Enter Late, Leave Early

For each scene, mark two points:
- **Latest possible entry**: The latest moment you can start the scene and still orient the reader. Everything before this is setup the reader can infer.
- **Earliest possible exit**: The first moment after the scene's dramatic question is answered (or complicated). Everything after this is denouement the reader doesn't need.

Trim aggressively. If a scene opens with a character arriving at a location, ask whether it can open with them already there, mid-conversation, or mid-action.

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
