---
name: edit-line
description: "Stage 3 editing: Line-level prose. Checks rhythm, figurative language, sensory details, voice calibration, house style. Produces (edited-3-line) file."
---

# Edit Stage 3: Line Edit

You are performing the third editing pass. This is the prose polish — rhythm, imagery, sensory detail, voice calibration, and house style. Structure was fixed in Stages 1-2. Now make it sing.

## Step 1: Identify Target

Find the Stage 2 output:
- `{paths.arcs}/arc-N-name/X.X Title (edited-2-scene).md`
- If not found, fall back to Stage 1 output or draft

## Step 2: Load Context

Read:
1. **The Stage 2 output**: Your primary input
2. **Character files**: For voice calibration (POV character especially)

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md` — all line-level craft rules

Do NOT load the full scene-structure or editing-pipeline references — keep context focused on prose.

## Step 3: Line-Level Pass

Work through the chapter paragraph by paragraph. Check:

### Rhythm & Variance
- [ ] **Spiral+jab present**: Long recursive sentences followed by short punches?
- [ ] **Job-mix heuristic**: No >2 sentences of same type in a row? (Sensory, Observation, Action, Thought, Analogy, Fact, Dialogue, Orientation, Micro-tension)
- [ ] **Sentence length variance**: Mix of long, medium, short? Read aloud test: every sentence takes different breath?
- [ ] **Paragraph shape variety**: Not every paragraph has the same structure?
- [ ] **Rhythm checkpoints**: Action/micro-tension every 120-180 words? Grounding detail every 300-500 words?

### Figurative Language
- [ ] **Density**: Max 1 simile/metaphor per paragraph, placed on turning points?
- [ ] **3-Question Test**: Each comparison passes Fit (matches character), Map (coherent), Use (on a turn)?
- [ ] **Image field**: 2-3 motifs max per scene, no exact recycling between scenes?
- [ ] **No mixed metaphors**: Each comparison stays in one domain?

### Sensory Details
- [ ] **Rotation**: Not defaulting to visual? Rotating sight/sound/touch/smell/taste?
- [ ] **Smell limit**: Max 1 per scene (never paired with metaphor in same sentence)?
- [ ] **Specificity**: Sensory details are locale-specific, not generic?
- [ ] **Grounded**: Sensory details come from the story's world, not generic description?

### Voice Calibration
- [ ] **POV character's voice**: Narration sounds like this specific person thinking?
- [ ] **Knowledge base**: Observations and metaphors come from the character's world?
- [ ] **Humor appropriate**: Matches the character's humor style?
- [ ] **Psychic distance**: Varies appropriately (close for emotional moments, pulled back for establishing)?
- [ ] **Filter words cut**: "saw", "felt", "noticed", "realized" — cut unless distance is intentional?
- [ ] **Thought tags cut**: "She thought" removed in deep POV?

### House Style
- [ ] **Concrete:abstract ratio**: 2+ concrete nouns per abstract term per page?
- [ ] **Lexical repetition**: No descriptive word >3x per 1000 words (unless deliberate motif)?
- [ ] **Interior/exterior balance**: Neither dominates for more than a page?
- [ ] **Infused subjectivity**: "Objective" descriptions carry POV character's perspective?

## Step 4: Produce Feedback

For line-level issues, use a tighter feedback format:

```markdown
### [RHYTHM/IMAGERY/SENSORY/VOICE/STYLE] Para [N] / Line [N]
**Current**: > [quoted text]
**Fix**: > [revised text]
**Why**: [brief rationale]
```

Group by section (scene) and severity:
- **Fix**: Must change — breaks voice, ruins rhythm, generic imagery
- **Polish**: Should change — could be stronger, sharper, more specific
- **Consider**: Optional — alternative that might work better

## Step 5: Produce (edited-3-line) File

Write: `{paths.arcs}/arc-N-name/X.X Title (edited-3-line).md`

This file contains the polished prose. Include summary:

```markdown
<!-- Edit Stage 3: Line Edit
Changes: [N fixes, N polishes, N considers]
Key improvements: [what categories needed the most work]
Voice confidence: [1-5, how well does the voice land now?]
-->
```

## Step 6: Update State

Update `scribe.local.md`: `pipeline_stage: edit-4`

Suggest next step: `/scribe:edit ai [X.X]`
