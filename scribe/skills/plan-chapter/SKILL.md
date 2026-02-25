---
name: plan-chapter
description: "Plan a specific chapter: purpose, key beats, characters, pacing within the arc. Use when designing a new chapter or revising an existing outline."
---

# Plan Chapter

You are helping the author plan or revise a specific chapter. A chapter is typically 3,000-8,000 words with 3-6 scenes, serving a specific function within its arc.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine the chapter. Format is `[arc].[chapter]` (e.g., `3.5`).

## Step 2: Load Context

Read these files:
1. **Arc outline**: The outline file for this arc (e.g., `{paths.arcs}/arc-N-name/Arc N – Name (Outline).md`)
2. **Arc context**: `{paths.context}/arc-N-name-context.md`
3. **Previous chapter** in this arc (if any): Read the most recent chapter file to understand where things left off
4. **Character files**: For characters appearing in this chapter (check arc outline for who appears)

For the previous chapter, prioritize reading the `(scenes)` or `(beats)` file if it exists, falling back to the full chapter text.

Do NOT load prose style guides — this is structural planning.

### Knowledge Graph Lookup

Query the KG for character trajectories and relevant events:

1. For each major character: `kg_search(query="[character] arc trajectory relationships", scope="au", limit=5)` for current AU state, and `kg_search(query="[character] powers abilities", scope="canon", limit=5)` for canon reference
2. For plot threads: `kg_search(query="[thread/event topic]", scope="au", limit=5)` to check what's been established
3. Flag any canon vs AU inconsistencies. If the user identifies a missing AU fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

Use KG results alongside file context to inform chapter planning.

## Step 3: Present Chapter Context

Summarize:
- **Arc position**: Where this chapter sits (early/mid/late in the arc, which act)
- **Previous chapter ending**: How the last chapter ended (the hinge)
- **This chapter's purpose**: What it must accomplish per the arc outline
- **Characters present**: Who appears and their current state
- **Active threads**: Ongoing plot elements that need attention
- **Required beats**: Anything the arc outline specifies for this chapter

## Step 4: Collaborative Planning

Work with the author on:

### Chapter Purpose
Every chapter must answer: "Why does this chapter exist?" Valid answers:
- Advances the central conflict
- Develops a character relationship
- Pays off a setup / plants a setup
- Escalates stakes
- Provides necessary worldbuilding through action (not exposition)

If the answer is only "connects chapter A to chapter C" — the chapter may not be needed.

### Key Beats
Plan 4-8 major beats for the chapter:
- What happens (concrete event or decision)
- What it changes (status, knowledge, or plan shift)
- Approximate placement (early, mid, late in chapter)

Use the "therefore/but" test: each beat should connect to the next via causation, not coincidence.

### Character Work
- **POV character**: Who, and what's their emotional/physical state entering?
- **Character want**: What does the POV character want in this chapter?
- **Character need**: What do they actually need (which may differ)?
- **State change**: How are they different by chapter's end?
- **Supporting characters**: What function does each serve?

### Pacing
- **Word estimate**: Approximate chapter length
- **Scene count**: How many scenes (typically 3-6)
- **Tension curve**: Where are the high and low points?
- **Ending hinge**: What decision, reversal, or image closes the chapter?

## Step 5: Arc-Level Pacing Check

Zoom out and verify:
- Does this chapter's pacing fit within the arc's rhythm?
- Are we spending the right amount of space on this part of the story?
- Does the tension level escalate from the previous chapter?
- Are subplots getting proportional attention?

## Step 6: Write Chapter Description

Produce a chapter planning document. This is NOT the `(scenes)` file — it's a higher-level description:
- Chapter title and number
- 1-paragraph summary
- POV character and entering state
- Beat list (numbered, 4-8 beats)
- Character notes (who appears, what function)
- Setup/payoff notes
- Estimated word count
- Ending hinge

Save in the arc directory if there isn't already a dedicated chapter planning format.

## Step 7: Suggest Next Step

- To break into scenes → `/scribe:plan scenes [X.X]`
- To plan the next chapter → `/scribe:plan chapter [X.next]`
- If beats are well-understood already → `/scribe:plan beats [X.X]`

Update `scribe.local.md` with `current_chapter` and `pipeline_stage: plan-scenes`.
