---
name: edit-line
description: "Stage 3 editing: Line-level prose. Processes each scene independently. Checks rhythm, figurative language, sensory details, voice, house style."
---

# Edit Stage 3: Line Edit

You are performing the third editing pass. This is the prose polish. Structure was fixed in Stages 1-2. Now make it sing. Process each scene independently.

## Step 1: Identify Target

Find Stage 2 output. New format first:
- New: `{paths.arcs}/arc-N-name/X.X/edit-2-scene/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (edited-2-scene).md`

If new format, create output:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/edit-3-line"
```

## Step 2: Load Context

Read:
1. **Scene files** from `X.X/edit-2-scene/` (process each independently)
2. **Character files** for voice calibration

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md`

Do NOT load scene-structure or editing-pipeline. Keep context focused on prose.

## Step 3: Line-Level Pass (Per Scene)

Work through each scene paragraph by paragraph:

### Rhythm & Variance
- [ ] Spiral+jab present
- [ ] Job-mix: no >2 same type in a row
- [ ] Sentence length variance (read aloud test)
- [ ] Paragraph shape variety
- [ ] Rhythm checkpoints: action/micro-tension every 120-180w, grounding every 300-500w

### Sentence Architecture
- [ ] Cumulative and periodic sentences both present
- [ ] Paragraph shapes mixed (front/back/sandwiched/scattered)
- [ ] Sentence type rotation at paragraph level

### Figurative Language
- [ ] Max 1 per paragraph, on turning points
- [ ] 3-Question Test: Fit/Map/Use
- [ ] 2-3 motifs max per scene, no recycling
- [ ] No mixed metaphors

### Sensory Details
- [ ] Rotation (not defaulting to visual)
- [ ] Smell: max 1 per scene, never with metaphor
- [ ] Touch/texture at least once per scene
- [ ] Sound grounding present

### Voice Calibration
- [ ] Narration sounds like this specific person
- [ ] Observations from character's knowledge base
- [ ] Humor matches character
- [ ] Psychic distance varies appropriately
- [ ] Filter words cut ("saw", "felt", "noticed", "realized")
- [ ] Thought tags cut in deep POV

### Psychic Distance Audit
- [ ] No flatline (stuck at one level >300 words)
- [ ] Crisis moments reach Level 4-5
- [ ] Transitions use Level 1-2
- [ ] No unintentional jarring jumps

### Dialogue Line Edit
- [ ] Each line advances conflict, reveals character, or escalates
- [ ] Oblique delivery (not on-the-nose)
- [ ] Tag audit (said/action beats, no adverb tags)
- [ ] No speechifying

### Subtext Pass
- [ ] Show OR tell, never both
- [ ] Redundant interiority deleted
- [ ] Scene work trusted

### Verb Audit
- [ ] Weak verb + adverb → single strong verb
- [ ] Filtering verbs cut
- [ ] Was/were + -ing flagged

### House Style
- [ ] Concrete:abstract ≥ 2:1
- [ ] Lexical repetition within limits (no word >3x per 1000w)
- [ ] Interior/exterior balanced (neither dominates >1 page)

## Step 4: Produce Output

### New Format
Write per-scene files to `X.X/edit-3-line/scene-N.md`

### Old Format
Write `{paths.arcs}/arc-N-name/X.X Title (edited-3-line).md`

Include summary:
```markdown
<!-- Edit Stage 3: Line Edit
Changes: [N fixes, N polishes, N considers]
Key improvements: [categories that needed most work]
Voice confidence: [1-5]
-->
```

## Step 5: Update State

Update `scribe.local.md`: `pipeline_stage: edit-4`
Suggest: `/scribe:edit ai [X.X]`

### Deep Dive Resources
- Sentence monotony: `prose-style-sentence-craft.md`
- Subtext missing: `subtext-and-implication.md`
- Voice drift: `first-person-pov-mastery.md`
- Tension flagging: `tension-mechanics-in-action.md`
