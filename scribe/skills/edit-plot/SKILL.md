---
name: edit-plot
description: "Stage 1 editing: Plot & Continuity. Checks timeline, character states, canon compliance, plot function, thematic integrity. Produces (edited-1-plot) file."
---

# Edit Stage 1: Plot & Continuity

You are performing the first editing pass on a chapter draft. This stage focuses ONLY on whether the chapter serves the story correctly at a structural and continuity level. Do NOT fix prose, voice, or style — those come later.

## Step 1: Identify Target

From the user's argument or `scribe.local.md`, determine the chapter and find the most recent version:
- Look for `(draft)` file first
- If a previous edit exists (e.g., from a re-run), use that instead

## Step 2: Load Context

Read these files:
1. **The draft/chapter**: The file to edit
2. **Story overview**: `{paths.context}/story-overview.md`
3. **Arc context**: `{paths.context}/arc-N-name-context.md`
4. **Arc outline**: The outline file for this arc
5. **Previous chapter**: The most recent version of the prior chapter (ending especially)
6. **Character files**: For all characters appearing in this chapter

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` — Stage 1 checklist

If database exists, build a continuity scratchpad:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[character]"
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" who-knows "[key fact]"
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" continuity-issues [arc]
```

### Knowledge Graph Verification

Query the KG for continuity verification:

1. For each character: `kg_search(query="[character] current state injuries location knowledge", scope="au", limit=5)` — verify character states in the draft match KG records
2. For referenced events: `kg_search(query="[event or fact referenced in draft]", scope="canon", limit=5)` — verify canon accuracy
3. For locations: `kg_search(query="[location] description", scope="canon", limit=3)` — verify physical descriptions match canon
4. Flag any discrepancies between draft content and KG facts as continuity issues in the scratchpad

## Step 3: Build Continuity Scratchpad

Before editing, create a mental scratchpad:
- **Prior state**: Where did the previous chapter leave things? Physical states, emotional states, locations, time of day
- **Already used**: Analogies, images, ideology citations from recent chapters (don't repeat)
- **Active threads**: Ongoing plot elements that need attention or advancement
- **This chapter must**: Required beats per arc outline, foreshadowing needed, callbacks due

## Step 4: Run Checks

### Continuity
- [ ] **Timeline**: Do events follow logically from the previous chapter? Time elapsed makes sense?
- [ ] **Character states**: Characters enter this chapter as the previous one left them (injuries, emotions, locations, possessions)
- [ ] **Props/objects**: Items mentioned are where they should be. Nothing appears from nowhere or vanishes
- [ ] **Knowledge states**: Characters only know what they've been told or witnessed. No impossible knowledge
- [ ] **Canon compliance**: Events don't contradict established facts (in-story or source material)
- [ ] **Location consistency**: Settings described consistently with earlier appearances

### Plot Function
- [ ] **Chapter purpose**: Can state what this chapter accomplishes in one sentence
- [ ] **Planned beats present**: All beats from the (beats) file are represented
- [ ] **Causality chain**: Events connect via therefore/but, not coincidence
- [ ] **Stakes escalation**: Stakes are higher or more personal than the previous chapter
- [ ] **No orphan scenes**: Every scene serves the chapter's purpose

### Character Arc
- [ ] **Protagonist changes**: POV character is different (even slightly) by chapter end
- [ ] **Supporting characters functional**: Each serves a purpose beyond furniture
- [ ] **Relationship progression**: Key relationships shift meaningfully

### Character Arc Verification (Deep)
For each character appearing in the chapter:
- [ ] **Lie/Truth journey**: Does this chapter advance or complicate their core misconception? If the character is static, justify why.
- [ ] **Ghost/Wound check**: Are their decisions traceable to their backstory wound? If not, either the decision or the wound needs work.
- [ ] **Earned regression**: If a character regresses, is the regression caused by specific pressure in this scene? Arbitrary regression is a plotting failure.
- [ ] **State change**: Compare each character's emotional/relational state at entry and exit. If identical, the character may be furniture.

### Foreshadowing Audit
- [ ] **Echoes due**: Check earlier chapters for unfulfilled plants that should resonate here. Cross-reference the arc outline's foreshadowing notes.
- [ ] **New plants logged**: Any new foreshadowing element must have a planned payoff chapter. Note it in the continuity scratchpad.
- [ ] **Retroactive meaning**: Can any existing detail (object, line, image) gain new significance given what happens in this chapter?
- [ ] **Deus ex machina check**: Does any resolution rely on an unestablished capability, ally, or knowledge? If so, the setup must be added earlier.

### Thematic Integrity
- [ ] **Core themes present**: The chapter's events connect to story themes
- [ ] **Ideology grounded**: Any political/philosophical content emerges from dramatic situation, not lecture
- [ ] **Show don't preach**: Theme expressed through action and choice, not narration

### Thematic Consistency (Deep)
- [ ] **Theme under test**: Does the chapter's plot test the central theme through dramatic conflict, or merely illustrate it?
- [ ] **Le Guin Test**: Could an intelligent character argue the opposite position convincingly within this chapter? If the theme has no credible opposition, it is being lectured, not explored.
- [ ] **Ideology through conflict**: Political/philosophical content must emerge from characters pursuing incompatible goals. If ideology appears in monologue, move it into dialogue or decision.

### First-Person Information Audit
- [ ] **Source tracing**: For each piece of information the narrator shares, identify the source (witnessed, told by whom, deduced from what evidence).
- [ ] **Omniscient slips**: Flag any moment the narrator knows what happens in a room they're not in, reads emotions they couldn't detect, or possesses knowledge without explanation.
- [ ] **Convenient eavesdropping**: If the narrator overhears critical information, verify the physical setup makes it plausible.
- [ ] **Emotional reads**: Does the narrator read other characters' internal states beyond what their interpersonal skill would allow? Taylor is perceptive but not a telepath.

### Structural Position Check
Identify where this chapter sits in the arc's structure:
- **Act 1 chapters** (first quarter): Must establish situation, complicate it, and raise specific questions. Should NOT resolve major tensions.
- **Act 2 chapters** (middle half): Must escalate stakes, test the protagonist, and deliver a midpoint shift. Pressure increases each chapter.
- **Act 3 chapters** (final quarter): Must deliver crisis, climax, and resolution or new question for the next arc.
- [ ] Verify the chapter fulfills its structural obligation. A climax chapter that reads like setup, or a setup chapter that resolves too much, needs restructuring.

## Step 5: Produce Feedback

Use the feedback format for each issue found:

```markdown
### [CONTINUITY/PLOT/CHARACTER/THEME] [Location in text]
**Current text**: > [quoted text]
**Problem**: [what's wrong and why it matters]
**Suggested fix**: > [revised approach or text]
**Rationale**: [why this fix works]
```

Categorize by severity:
- **Critical**: Breaks continuity or contradicts established facts
- **Warning**: Structural weakness that undermines the chapter's purpose
- **Note**: Minor inconsistency or missed opportunity

## Step 6: Produce (edited-1-plot) File

Write the edited file:
`{paths.arcs}/arc-N-name/X.X Title (edited-1-plot).md`

This file contains the draft with structural fixes applied. At the top, include a summary:

```markdown
<!-- Edit Stage 1: Plot & Continuity
Issues found: [N critical, N warning, N note]
Key changes: [bullet list of structural changes made]
Continuity flags for next stages: [anything to watch]
-->
```

## Step 7: Update State

Present the issue summary to the author. Ask if they want to:
- Review specific issues before proceeding
- Accept all fixes and move to Stage 2
- Revert specific changes

Update `scribe.local.md`: `pipeline_stage: edit-2`

**Note:** This skill loads `character-craft-reference.md` and `story-craft-reference.md` from the references directory for arc, foreshadowing, and thematic verification.

Suggest next step: `/scribe:edit scene [X.X]`
