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

### Sentence Architecture Audit
- [ ] **Spiral+jab verified**: Long recursive sentences are followed by short punches? No more than 2 same-type sentences in a row?
- [ ] **Paragraph shape variety**: Are shapes mixed (front-loaded, back-loaded, sandwiched, scattered)? Three front-loaded paragraphs in a row reads like a report.
- [ ] **Cumulative vs. periodic**: Are both present? Cumulative sentences (main clause first, modifiers trailing) and periodic sentences (subordinate material first, main clause withheld) should alternate.
- [ ] **Sentence type rotation**: Cross-check job-mix at paragraph level. If a paragraph has Observation, Observation, Observation, rewrite the middle one as Action or Sensory.

### Psychic Distance Audit
Map Gardner's 5 levels through the chapter:
1. Distant/authorial ("It was winter in Brockton Bay")
2. Closer ("Taylor walked through the Docks district")
3. Close third ("The warehouse smelled like rust and salt")
4. Deep interiority ("God, the smell. Rust and salt and something underneath it")
5. Stream of consciousness ("Rust salt underneath and she was back in the locker")

- [ ] **No flatline**: Flag any section stuck at a single distance for more than 300 words.
- [ ] **Crisis moments go deep**: Emotional peaks reach Level 4 or 5.
- [ ] **Transitions pull back**: Scene transitions and establishing beats use Level 1 or 2.
- [ ] **No jarring jumps**: Distance shifts by more than 2 levels in a single sentence should be intentional (shock, dissociation), not accidental.

### Dialogue Line Edit
For every dialogue line in the chapter:
- [ ] **Advances conflict**: Does this line change the power dynamic, reveal new information, or escalate/de-escalate tension? If it does none of these, cut or rewrite.
- [ ] **Oblique delivery**: Is the character saying what they mean indirectly? Direct statements are for ultimatums and confessions, not regular conversation.
- [ ] **Tag audit**: Does each dialogue tag serve a purpose? "Said" is invisible (good). Action beats are better than adverb tags ("she said angrily" → she slammed her palm on the table). Cut tags entirely when speaker is clear from context.
- [ ] **Speech vs. speechifying**: Read dialogue aloud. If it sounds like an essay paragraph with quotation marks around it, break it up with interruptions, false starts, or action beats.

### Subtext Pass
- [ ] **Show OR tell audit**: Find every paragraph where the narrator explains what the reader should feel after the scene already showed it. Cut the explanation. If a character slams a door and the narrator says "She was angry," delete "She was angry."
- [ ] **Redundant interiority**: After each emotional action beat, check: is there an explanatory sentence that restates what the action already communicated? Delete it.
- [ ] **Trust the scene work**: If the dialogue and action are doing their job, the narrator's commentary is dead weight. Remove it.

### Verb Audit
- [ ] **Adverb crutches**: Hunt weak verb + adverb combos ("walked quickly" → "strode", "said quietly" → "murmured", "looked carefully" → "studied"). Replace with a single strong verb.
- [ ] **Filtering verbs**: Scan for: could see, could feel, could hear, noticed that, realized that, found myself, seemed to, appeared to. These put a pane of glass between reader and experience. Cut them and render the experience directly ("I could hear the rain" → "Rain hammered the windows").
- [ ] **Was/were + -ing**: Flag passive progressive constructions ("was walking", "were talking"). Replace with active verbs unless the ongoing nature is the point.

### Sensory Balance
- [ ] **Visual-only passages**: Flag any stretch of 200+ words using only sight. Add at least one non-visual sense.
- [ ] **Smell discipline**: Used max 1x per scene. Never paired with metaphor in the same sentence. Smell is powerful precisely because it's rare.
- [ ] **Touch/texture present**: At least once per scene, a character physically interacts with their environment (texture of a surface, temperature, weight of an object).
- [ ] **Sound grounding**: Ambient sound grounds the reader in place. Sudden sound creates alertness. Check that sound details serve one of these two functions.

### Deep Dive Resources
For persistent line-level issues that resist the standard pass, load from `knowledge-base/research/`:
- Sentence monotony or rhythm problems: `prose-style-sentence-craft.md`
- Subtext missing or narrator over-explaining: `subtext-and-implication.md`
- Voice drift or wrong psychic distance: `first-person-pov-mastery.md`
- Tension flagging between action beats: `tension-mechanics-in-action.md`

**References loaded for this stage**: `prose-rules.md` (updated), `dialogue-reference.md`

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
