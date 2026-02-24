---
name: edit-ai-patterns
description: "Stage 4 editing: AI-Pattern elimination. Runs the 8-category checklist, vocabulary scan, and structural tell detection. Produces (edited-4-ai) file."
---

# Edit Stage 4: AI-Pattern Elimination

You are performing the fourth editing pass. This stage exists because AI-written prose has distinctive patterns that careful readers detect. Your job is to systematically find and eliminate these patterns while preserving the author's voice.

**This is the most mechanical pass.** Work through the checklist category by category, counting violations and fixing them.

## Step 1: Identify Target

Find the Stage 3 output:
- `{paths.arcs}/arc-N-name/X.X Title (edited-3-line).md`
- If not found, fall back to earlier stages

## Step 2: Load Context

Read:
1. **The Stage 3 output**: Your primary input

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/ai-ism-checklist.md` — the complete detection checklist

Do NOT load other references. This stage needs clean focus on AI pattern detection.

## Step 3: Run the 8-Category Checklist

Work through the ENTIRE chapter for each category. Count violations. Fix them.

### Category 1: Vagueness Crutches
**Target**: Near zero
**Scan for**: "something [adj]", "a sense of", "a feeling of", "things", "stuff", "a kind of"
**Fix**: Name the specific thing. Reach for a concrete image or physical description.
**Count**: ___ found → ___ fixed

### Category 2: Triple Cascades
**Target**: Max 2-3 earned triples per chapter
**Scan for**: Three adjectives, three nouns, three parallel phrases, three fragments in a row
**Fix**: Cut to two. Keep triples only at genuine emotional climax with real escalation.
**Count**: ___ found → ___ kept (earned) / ___ cut

### Category 3: Simile Density
**Target**: Max 1 per 600-800 words, on turning points only
**Scan for**: "like", "as if", "as though", metaphorical "was/were"
**Fix**: Cut similes that don't land on turns or fail the 3-Question Test (Fit/Map/Use)
**Count**: ___ found → ___ kept / ___ cut or recast

### Category 4: Parallel Construction Sameness
**Target**: Vary every 2-3 instances
**Scan for**: Repeated syntactic patterns (participial openings, SVO chains, paired constructions)
**Fix**: Change one to a different construction. Break one into its own sentence. Add a fragment. Combine two.
**Count**: ___ runs found → ___ broken up

### Category 5: Fragment Sentence Overuse
**Target**: Max 5-6 per 1000 words
**Scan for**: Sentence fragments, especially 3+ in a row
**Fix**: Merge padding fragments into full sentences. Keep fragments at scene openers, impact moments, turning points.
**Count**: ___ fragments → ___ kept (earned) / ___ merged

### Category 6: Filtering Verbs
**Target**: Near zero (unless intentional distance)
**Scan for**: "could feel/see/hear", "found myself", "noticed that", "realized that", "seemed to", "appeared to"
**Fix**: State the experience directly. In deep POV, we ARE the character.
**Count**: ___ found → ___ cut / ___ kept (intentional)

### Category 7: Verbal Tics & Repetition
**Target**: No phrase >3x per 1000 words
**Scan for**: "just", "still", "really", "actually", "basically", "the kind of [noun] that", and any word/phrase appearing suspiciously often
**Fix**: Vary or cut most instances. Keep only where the repetition serves a deliberate rhythm.
**Count**: ___ tic words found → ___ cut

### Category 8: Over-explaining
**Target**: Zero instances of showing AND telling the same thing
**Scan for**: Parenthetical explanations of what was just shown, sentences restating previous sentence in different words, internal narration explaining obvious dialogue
**Fix**: If you showed it clearly, cut the explanation. Trust the reader.
**Count**: ___ found → ___ cut

## Step 4: AI Vocabulary Scan

Scan the full text for words from the vocabulary lists:

### Tier 1 (Immediate Red Flags — replace ALL)
Verbs: delve, navigate, underscore, leverage, foster, showcase, spearhead, bolster
Adjectives: meticulous, pivotal, robust, vibrant, bustling, multifaceted, seamless
Nouns: tapestry, landscape (metaphorical), realm, paradigm, synergy, beacon, journey (metaphorical)
Phrases: "In today's X", "It's worth noting", "At its core", "A testament to"

### Tier 2 (Replace unless contextually perfect)
crucial, essential, comprehensive, innovative, dynamic, compelling, nuanced, intricate, resonate, embark, embrace, craft/crafted, tailor/tailored, optimize, streamline

### Tier 3 (Structural tells — replace)
Starters: "Additionally", "Furthermore", "Moreover", "Interestingly", "Ultimately"
Transitions: "That being said", "With that in mind", "On the other hand"

**Count**: ___ Tier 1 / ___ Tier 2 / ___ Tier 3 found → all replaced

## Step 5: Structural Tell Detection

### Uniform Sentence Length
Read each paragraph aloud (mentally). Flag paragraphs where every sentence takes the same breath.

### Paragraph Shape Repetition
Flag sequences where 3+ paragraphs follow the same pattern (e.g., medium→medium→short punch, repeated).

### The SVO Prison
Flag passages where 5+ sentences in a row follow Subject-Verb-Object with no inversion, subordination, or variation.

### Forbidden Patterns
Scan for the forbidden patterns from the checklist:
- Contrastive frames ("Not X, but Y") — max 1 per 500-700 words
- Forbidden openings ("The air was thick with...", "Something about...")
- Forbidden emotional tells ("A mix of X and Y", "felt a surge of")
- Forbidden micro-transitions ("For a moment...", "Suddenly...")
- Forbidden abstractions as subjects ("The realization dawned", "Tension crackled")

## Step 6: Produce (edited-4-ai) File

Write: `{paths.arcs}/arc-N-name/X.X Title (edited-4-ai).md`

Include the scorecard:

```markdown
<!-- Edit Stage 4: AI-Pattern Elimination
Category Scores:
1. Vagueness: [N] found → [N] fixed
2. Triples: [N] found → [N] kept / [N] cut
3. Similes: [N] found → [N] kept / [N] cut
4. Parallel: [N] runs → [N] broken
5. Fragments: [N] found → [N] kept / [N] merged
6. Filtering: [N] found → [N] cut
7. Verbal tics: [N] found → [N] cut
8. Over-explaining: [N] found → [N] cut
Vocabulary: [N] T1 / [N] T2 / [N] T3 replaced
Structural tells: [N] fixed
-->
```

## Step 7: Update State

Update `scribe.local.md`: `pipeline_stage: edit-5`

Suggest next step: `/scribe:edit hostile [X.X]`
