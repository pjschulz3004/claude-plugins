# AI-ism Detection & Avoidance

Systematic checklist for eliminating patterns that make prose feel AI-generated.

## The 8-Category Checklist

### 1. Vagueness Crutches
Target: near zero instances of "something [adj]", "a sense of", "a feeling of", "things", "stuff".
Fix: Name the specific thing. Humans reach for analogies or physical descriptions, not vague abstractions.

### 2. Triple Cascades
Target: max 2-3 earned triples per chapter.
AI loves threes: three adjectives, three nouns, three parallel phrases, three fragments.
Fix: Cut to two. Two items create tension; three feel manufactured.
Keep triples only at emotional climax with genuine escalation.

### 3. Simile Density
Target: max 1 simile per 600-800 words. Place on turning points only.
Every simile must pass the 3-Question Test:
- **Fit**: Does it match the POV character's knowledge/experience?
- **Map**: Does the comparison illuminate something non-obvious?
- **Use**: Is it placed on a turning point, not filler?
Fix: Cut half your similes. Reserve comparisons for moments that need illumination.

### 4. Parallel Construction Sameness
Human prose has "burstiness" (irregular rhythm). AI prose has uniform structures.
Fix: Vary every 2-3 instances. Change participial to past tense. Break one item into its own sentence. Add a fragment. Combine two items.

### 5. Fragment Sentence Overuse
Target: max 5-6 fragments per 1000 words.
Earned: scene openers, genuine impact, turning points.
Padding: three fragments in a row, fragments that restate, modifier fragments.
Fix: Merge padding fragments into full sentences.

### 6. Filtering Verbs
Cut: "I could feel/see/hear", "I found myself", "I noticed that", "I realized that".
In tight POV, we ARE the character. State the experience directly.
Keep only when distance is intentional (dissociation, delayed realization).

### 7. Verbal Tics & Repetition
Target: no phrase >3x per 1000 words unless deliberate motif.
Watch: "just", "still", "really", "actually", "basically", "the kind of [noun] that".
Fix: Search for tic words. Vary or cut most instances.

### 8. Over-explaining
Patterns: parenthetical explanations, sentences restating previous sentence, showing AND telling.
Fix: If you showed it clearly, don't tell it. Trust the reader.

## AI Vocabulary

### Tier 1: Immediate Red Flags
Verbs: delve, navigate, underscore, leverage, foster, showcase, spearhead, bolster
Adjectives: meticulous, pivotal, robust, vibrant, bustling, multifaceted, seamless
Nouns: tapestry, landscape (metaphorical), realm, paradigm, synergy, beacon, journey (metaphorical)
Phrases: "In today's X", "It's worth noting", "At its core", "A testament to"

### Tier 2: Overused but Contextual
crucial, essential, comprehensive, innovative, dynamic, compelling, nuanced, intricate,
resonate, embark, embrace, craft/crafted, tailor/tailored, optimize, streamline

### Tier 3: Structural Tells
Sentence starters: "Additionally", "Furthermore", "Moreover", "Interestingly", "Ultimately"
Transitions: "That being said", "With that in mind", "On the other hand"

## Structural AI Tells

### Uniform Sentence Length
Test: Read a paragraph aloud. If every sentence takes the same breath, it's too uniform.
Fix: Deliberately vary. Long sentence, then short. Three medium, then a fragment.

### Paragraph Shape Repetition
AI pattern: medium establishing → medium developing → short punch (every paragraph).
Fix: Some paragraphs end on long sentences. Some are mostly short. Punches in the middle.

### The SVO Prison
AI defaults to Subject-Verb-Object monotony.
Fix: Inverted constructions, subordinate clauses first, participial phrases, appositives.

## Forbidden Patterns

### Contrastive Frames (max 1 per 500-700 words)
"Not X, not Y, but Z" / "Not just X, but Y" / "It wasn't X, it was Y"
Fix: Show the reality directly.

### Forbidden Openings
"The air was thick with..." / "There was a certain quality to..." / "Time seemed to..."
"Something about the way..." / "It was the kind of [noun] that..." / "A sense of [abstract] hung..."

### Forbidden Emotional Tells
"A mix of [emotion] and [emotion]" / "Equal parts X and Y" / "[Emotion] warred with [emotion]"
"Felt a surge/wave/flood of [emotion]" / "[Emotion] bubbled/welled up"
Fix: Show physical manifestation or the thought it produces.

### Forbidden Micro-Transitions
"For a moment..." / "In that instant..." / "Suddenly..." / "All at once..."
Fix: Trust sequential action. The door opened. (Not: Suddenly the door opened.)

### Forbidden Abstractions as Subjects
"The realization dawned/hit/struck" / "The silence stretched/filled" / "Tension crackled/built"
Fix: Concrete subjects performing concrete actions.

## The Hostile Reader Pass

After all editing, ask of every paragraph:
1. Could this sentence appear in any AI-generated story? → Rewrite to be specific to THIS story.
2. Is there a pattern I've seen in the last three paragraphs? → Break it.
3. Am I explaining something I just showed? → Cut the explanation.
4. Is this comparison generic or specific? → "Like a storm" = rewrite.
5. Does this paragraph have the same shape as the last? → Vary it.
6. Would a cynical reader roll their eyes? → Cut or rewrite.
7. Is this too smooth? Does it need grit? → Add human imperfection.

## Signs of Humanity to Preserve/Add
- Thoughts that don't go anywhere
- Details noticed for no plot reason
- Observations slightly off-topic
- Humor that emerges from character, not setup
- Imperfect grammar choices that serve voice

## Density Audit Protocol

The most insidious AI tell is cumulative density: every paragraph containing a tricolon AND a contrastive frame AND a participial clause AND a stock metaphor reads as AI even when each instance seems defensible.

### Density-First Principle
Count globally before fixing locally. Run the density audit BEFORE dispatching line-level editing.

### Density Targets (per 1000 words)
| Pattern | AI Density | Human Target |
|---------|-----------|--------------|
| Contrastive frames ("not X, but Y") | 3-5+ | Max 1-2 |
| Tricolons (lists of 3) | 5-8+ | Max 2-3 |
| Present participial clauses | 8-15+ | Max 3-5 |
| Metaphors/similes | 8-12+ | 3-5 |
| Fragments | 0-2 | 5-6 (earned) |
| Em dashes | 5-10+ | Max 2-3 (0 for Union) |
| AI vocabulary hits | 5-15+ | 0 |
| Emotional labels (telling) | 3-8+ | 0-1 |
| Sentences within 5w of avg length | 80%+ | Under 50% |

### Counting Methodology
1. Concatenate all scenes into a single text
2. Count word total
3. For each pattern type: count instances, divide by (word total / 1000)
4. Compare against human target column
5. Flag any category exceeding target

### Burstiness Check
Measure sentence length variance: compute std dev of sentence word counts.
Target: std dev > 8 words. AI std dev is typically 3-5.
If burstiness is low: deliberately vary sentence lengths before line-editing.

### Additional Patterns (from research)
- **Participial clause density**: count -ing constructions used as modifiers. 2+ per sentence is a strong tell.
- **Nominalization density**: noun forms of verbs ("implementation" vs "implement"). 3+ per sentence flags.
- **Pronoun frequency**: first-person pronouns per 1000 words. Low count = narrator feels like camera, not consciousness.
- **Present participle openings**: sentences starting with -ing clause. Max 1 per 500 words.

### Audit Workflow
1. Run density counts across full chapter
2. Flag categories over target
3. Thin densest categories first (global reduction)
4. Then dispatch line-level agents for quality assessment of remaining instances
