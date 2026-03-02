---
name: edit-scene
description: "Stage 2 editing: Scene & Beat structure. Processes each scene independently. Checks scene structure, beats, pacing, voice, dialogue."
---

# Edit Stage 2: Scene & Beat Structure

You are performing the second editing pass. This stage focuses on whether every scene functions dramatically. You're NOT polishing prose yet.

## Step 1: Identify Target

Find Stage 1 output. New format first:
- New: `{paths.arcs}/arc-N-name/X.X/edit-1-plot/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (edited-1-plot).md`

If new format, create output:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/edit-2-scene"
```

## Step 2: Load Context

Read:
1. **All scene files** from `X.X/edit-1-plot/` (read all for cross-scene patterns, edit individually)
2. **The beats files** from `X.X/beats/` (compare planned vs actual)
3. **Character files** for voice verification

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md`
- `${CLAUDE_PLUGIN_ROOT}/references/editing-pipeline.md` (Stage 2)

### Knowledge Graph Lookup
1. POV character voice: `kg_search(query="[character] speech patterns voice", scope="au", limit=5)`
2. Relationships in dialogue scenes: `kg_search(query="[character A] relationship [character B]", scope="au", limit=5)`

## Step 3: Analyze Each Scene

Process each scene independently. For each:

### Scene Value Change Audit
- [ ] Value at entry named with charge
- [ ] Value at exit has different charge
- [ ] The change IS the scene's reason for existing

### Scene Structure
- [ ] Opens with friction (tension in first 2-3 lines)
- [ ] Single goal statable in one sentence
- [ ] Obstacle present
- [ ] Closes on hinge (decision, reversal, image)
- [ ] Dramatic question posed and answered

### Scene-Sequel Pattern (cross-scene)
- [ ] Action scenes: Goal/Conflict/Disaster
- [ ] Sequel scenes: Reaction/Dilemma/Decision
- [ ] Missing sequels flagged

### Beat Analysis
- [ ] Every beat turns something
- [ ] ~1 turn per 300 words
- [ ] Causality (therefore/but)
- [ ] Beat variety
- [ ] MRU order respected

### Pacing, Voice, Dialogue
- [ ] Scenes escalate across chapter
- [ ] POV consistent, no impossible knowledge
- [ ] Every dialogue line works (reveals character, advances plot, creates tension)
- [ ] Distinctive voices (Radio Test)
- [ ] Subtext present

### Emotional Beat Audit
- [ ] 60%+ earned beats, 25% max triggered, 15% max ambient
- [ ] Quietest prose at most emotional moment

### Ensemble Check (3+ characters)
- [ ] Each character has scene-specific purpose
- [ ] Competing wants create tension

### Chapter Type Variants
- Battle: spatial logic, power accuracy, pacing oscillation, aftermath weight
- Dialogue-heavy: subtext >60%, power dynamic shifts, voice differentiation

## Step 4: Produce Output

### New Format
Write per-scene files to `X.X/edit-2-scene/scene-N.md`

### Old Format
Write `{paths.arcs}/arc-N-name/X.X Title (edited-2-scene).md`

Include summary:
```markdown
<!-- Edit Stage 2: Scene & Beat Structure
Issues found: [N critical, N warning, N note]
Key changes: [list]
Scenes restructured: [which]
-->
```

## Step 5: Update State

Present scene-by-scene analysis. Update `scribe.local.md`: `pipeline_stage: edit-3`
Suggest: `/scribe:edit line [X.X]`
