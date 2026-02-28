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

Load references (for Step 4b craft integration):
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md`

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

## Step 4b: Craft Integration

### Chapter Type Classification

Classify this chapter as one of: **dialogue-heavy**, **battle/action**, **reflection**, **transition**, **ensemble**, or **mixed**. The type determines pacing targets:

| Type | Scene Length | Key Checks |
|------|-------------|------------|
| Battle/Action | 800-1500 words | High compression, voice ladder levels 3-5 |
| Dialogue | 1000-2000 words | Subtext density, power dynamic mapping |
| Reflection | 500-1000 words | Psychic distance 4-5, interiority balance |
| Transition | 200-500 words | Efficient grounding, set up next chapter's friction |
| Ensemble | 800-1500 words | POV discipline, cast rotation, distinct voices |
| Mixed | Varies by scene | Match scene length to its dominant type |

Route battle chapters to `/scribe:plan battle` when available. For dialogue-heavy chapters, flag for `dialogue-reference.md` loading at scene/beat stages.

### Scene-Sequel Pacing

Map the chapter's scene-sequel rhythm before designing individual scenes:

- **Scene beats** (Goal > Conflict > Disaster): action, confrontation, events happening
- **Sequel beats** (Reaction > Dilemma > Decision): processing, choosing, regrouping

Chapters need both types. Pure action exhausts the reader. Pure reflection stalls momentum. Target ratios:
- High-energy chapters: **2:1 scene:sequel**
- Character development chapters: **1:1 scene:sequel**
- Climax chapters: **3:1 scene:sequel** (sequels compressed to single beats)

### Emotional Trajectory

Define three points:
1. **Entry state**: What emotional state does the reader arrive in (from previous chapter's hinge)?
2. **Exit state**: What state should the reader leave in?
3. **Value change**: What flips from positive to negative (or vice versa)?

The chapter must turn at least one value. Examples: safety to danger, ignorance to knowledge, trust to betrayal, isolation to solidarity. If no value changes, the chapter is filler.

### Tension Architecture

Design a nested question structure (3-5 questions that stack through the chapter):
1. **Chapter question**: The overarching "will they/won't they" for the whole chapter
2. **Scene questions**: Each scene's dramatic question (subordinate to the chapter question)
3. **Micro-tension**: For every quiet moment, identify the competing emotions. Calm description without internal conflict = dead space. A character waiting has no tension. A character waiting while doubting their plan has tension.

Every non-action beat needs at least one pair of conflicting feelings, desires, or loyalties.

### Chapter Hooks

**Opening hook** (select one):
- In medias res: begin mid-action, orient the reader after
- Sensory grounding: place the reader physically before anything else
- Embedded question: raise curiosity in the first line
- Friction first: open on conflict, discomfort, or disagreement
- Callback: connect to previous chapter's hinge with a new angle

**Closing hook** (select one of 7 cliffhanger types):
- **Threat**: danger approaches
- **Mystery**: new question raised
- **Decision**: character must choose, answer withheld
- **Reversal**: what they believed is wrong
- **Arrival**: someone/something new enters
- **Departure**: someone leaves or is taken
- **Revelation**: hidden truth exposed

### Deep Dive Routing

Based on chapter type classification:
- **Dialogue-heavy**: Load `dialogue-reference.md` at scene/beat planning stages
- **Battle/action**: Route to `/scribe:plan battle` (when available), load `tension-reference.md`
- **Exposition-heavy**: Reference worldbuilding-exposition techniques (incluing over infodump, 2:1 concrete:abstract ratio)
- **Ensemble**: Review cast management principles (cognitive limit of 4-5 active characters per scene)

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
