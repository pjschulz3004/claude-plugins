---
name: edit-scene
description: "Stage 2 editing: Scene & Beat structure. Checks scene structure, beat analysis, pacing, character voice, dialogue. Produces (edited-2-scene) file."
---

# Edit Stage 2: Scene & Beat Structure

You are performing the second editing pass. This stage focuses on whether every scene functions dramatically — structure, pacing, beat analysis, and dialogue mechanics. You're NOT polishing prose yet — that's Stage 3.

## Step 1: Identify Target

Find the Stage 1 output:
- `{paths.arcs}/arc-N-name/X.X Title (edited-1-plot).md`
- If not found, fall back to the draft

## Step 2: Load Context

Read:
1. **The Stage 1 output**: Your primary input
2. **The (beats) file**: To compare planned vs. actual beats
3. **Character files**: For voice verification

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` — scene structure, beats, dialogue, MRUs
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` — Stage 2 checklist

### Knowledge Graph Lookup

Query the KG for voice and relationship verification:

1. For POV character: `kg_search(query="[character] speech patterns voice personality", scope="au", limit=5)` — use to verify voice markers in Step 3
2. For dialogue scenes: `kg_search(query="[character] relationship with [other character]", scope="au", limit=5)` — verify dialogue reflects established relationship dynamics
3. For character-specific powers/abilities mentioned: `kg_search(query="[character] powers", scope="canon", limit=3)` — verify accuracy of any power usage described

## Step 3: Analyze Scene by Scene

For each scene in the chapter:

### Scene Value Change Audit
Before checking structure, identify the core value being turned in each scene:
- [ ] **Value at entry**: Name the value and its charge (e.g., trust: positive, safety: negative).
- [ ] **Value at exit**: The charge must be different from entry. If the value hasn't changed, the scene may not earn its place.
- [ ] **The value change IS the scene's reason for existing.** If you can't name it, the scene lacks dramatic function.

### Scene Structure
- [ ] **Opens with friction**: Tension established in first 2-3 lines?
- [ ] **Single goal**: Can state what the POV character wants in one sentence?
- [ ] **Obstacle present**: Something opposes the goal?
- [ ] **Disaster/complication**: Scene ends worse or more complicated than it started?
- [ ] **Closes on hinge**: Ends on decision, reversal, or striking image?
- [ ] **Dramatic question**: One clear question posed and answered (usually "No" or "Yes, but...")?

### Scene-Sequel Pattern Check
- [ ] **Action scenes**: Verify Goal/Conflict/Disaster structure. The Disaster propels forward.
- [ ] **Sequel scenes**: Verify Reaction/Dilemma/Decision structure. The Decision becomes the next scene's Goal.
- [ ] **Pacing ratio**: 2:1 scene:sequel for high-energy chapters, 1:1 for character-driven chapters. Adjust per chapter type.
- [ ] **Missing sequels**: If an action scene is followed immediately by another action scene, flag the missing emotional processing.

### Beat Analysis
- [ ] **Every beat turns something**: Status, knowledge, or plan changes?
- [ ] **Pacing**: At least one turn per ~300 words? If 500+ words pass without change, flag it
- [ ] **Causality**: Beats connect via therefore/but, not and-then?
- [ ] **Beat variety**: Types mixed (not all action or all dialogue)?
- [ ] **Try-fail cycles**: Attempts are meaningfully different?
- [ ] **MRU order**: Motivations (external events) precede reactions (internal response)?

### Pacing
- [ ] **Scenes escalate**: Later scenes have higher tension than earlier ones?
- [ ] **Tangents proportionate**: Digressions earn their space?
- [ ] **Dialogue intercutting**: Action beats break up long dialogue runs?
- [ ] **Scene lengths varied**: Not every scene the same length?

### Character Voice
- [ ] **POV consistent**: Narration sounds like ONE specific person throughout?
- [ ] **No impossible knowledge**: POV character doesn't know things they shouldn't?
- [ ] **Emotional truth**: Reactions feel proportionate and authentic to the character?
- [ ] **Voice markers present**: Character's verbal tics, vocabulary, thought patterns identifiable?

### Dialogue
- [ ] **Every line works**: Reveals character, advances plot, creates tension, provides info, or establishes relationship?
- [ ] **Distinctive voices**: Characters sound different from each other (Radio Test)?
- [ ] **Subtext present**: Characters don't always say exactly what they mean?
- [ ] **Power dynamics**: Who controls the conversation? Does it shift?
- [ ] **Tags minimal**: "said"/"asked" for 90%, action beats over adverbs?

### Emotional Beat Audit
Map the emotional trajectory through the chapter:
- [ ] **Earned beats** (60%+): Emotion that the prior scene work justifies. The reader feels it because the groundwork was laid.
- [ ] **Triggered beats** (25% max): Emotion from sudden events (reveals, violence, loss). Effective but must not dominate.
- [ ] **Ambient beats** (15% max): Mood, atmosphere, background emotion. Seasoning, not the meal.
- [ ] **Sentimentality check**: Flag any emotional moment that hasn't been earned through prior scene work.
- [ ] **Quietest prose rule**: The most emotional moment in the chapter should use the simplest, most restrained language.

### Ensemble Check
For scenes with 3+ characters:
- [ ] **Scene-specific purpose**: Does each character present have a dramatic function in THIS scene (not just "they'd be there")?
- [ ] **No furniture**: If a character is present but does nothing, either give them a conflicting want or remove them.
- [ ] **Competing wants**: Every character present should want something that conflicts with what someone else wants. If everyone agrees, the scene lacks tension.
- [ ] **Distinct reactions**: In group moments, do at least 2-3 characters react differently to the same stimulus?

### Chapter Type Variants

**Battle chapters** (additional checks):
- [ ] Spatial logic consistency (can characters physically get from A to B as described?)
- [ ] Power interaction accuracy (does usage match established rules?)
- [ ] Pacing oscillation (never >500 words at a single register)
- [ ] Aftermath weight (equal to or greater than action weight)
- Consider launching `battle-reviewer` agent if available.

**Dialogue-heavy chapters** (additional checks):
- [ ] Subtext density (>60% of dialogue should be oblique, not on-the-nose)
- [ ] Power dynamic shifts (who controls conversation changes at least once per scene)
- [ ] Voice differentiation (Radio Test: cover the tags, can you still identify each speaker?)
- Consider launching `dialogue-auditor` agent if available.

## Step 4: Produce Feedback

Use the feedback format for each issue:

```markdown
### [SCENE/BEAT/PACING/VOICE/DIALOGUE] Scene N, [Location]
**Current text**: > [quoted text]
**Problem**: [structural issue and why it matters]
**Suggested fix**: > [revised approach]
**Rationale**: [why this improves the scene dramatically]
```

Severity:
- **Critical**: Scene doesn't function (no goal, no hinge, beats don't turn)
- **Warning**: Scene works but has structural weakness (pacing drag, voice slip)
- **Note**: Opportunity to strengthen (better hinge, sharper dialogue)

## Step 5: Produce (edited-2-scene) File

Write: `{paths.arcs}/arc-N-name/X.X Title (edited-2-scene).md`

Include edit summary at top:

```markdown
<!-- Edit Stage 2: Scene & Beat Structure
Issues found: [N critical, N warning, N note]
Key changes: [bullet list of structural scene edits]
Scenes restructured: [which scenes were significantly changed]
-->
```

## Step 6: Update State

Present the scene-by-scene analysis to the author. Update `scribe.local.md`: `pipeline_stage: edit-3`

**Note:** This skill loads `scene-structure.md` from the references directory (updated with craft integration). For battle chapters, conditionally load `battle-craft-reference.md`. For dialogue-heavy chapters, conditionally load `dialogue-reference.md`.

Suggest next step: `/scribe:edit line [X.X]`
