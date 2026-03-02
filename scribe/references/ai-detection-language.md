# AI Detection: Language & Vocabulary

Reference for the Language Detector agent. Focus: word choice, sentence patterns, punctuation, linearity.

## Vocabulary Tells

### Tier 1: Immediate Red Flags (replace ALL)
Verbs: delve, navigate (metaphorical), underscore, leverage, foster, showcase, spearhead, bolster
Adjectives: meticulous, pivotal, robust, vibrant, bustling, multifaceted, seamless
Nouns: tapestry (metaphorical), landscape (metaphorical), realm, paradigm, synergy, beacon, journey (metaphorical)
Phrases: "In today's X", "It's worth noting", "At its core", "A testament to"

### Tier 2: Replace Unless Contextually Perfect
crucial, essential, comprehensive, innovative, dynamic, compelling, nuanced, intricate, resonate, embark, embrace, craft/crafted, tailor/tailored, optimize, streamline, illuminate, transcend, unravel

### Tier 3: Structural Tells
Starters: "Additionally", "Furthermore", "Moreover", "Interestingly", "Ultimately"
Transitions: "That being said", "With that in mind", "On the other hand"

### Quantified Overuse Rates (PNAS 2025)
- "camaraderie" 162x human rate, "tapestry" 155x (23% of outputs), "intricate" 119x
- "amidst" 100x (27% of outputs), "palpable" 95x, "unease" 63-101x
- "delves" 572x in scientific writing, "underscores" 904% increase 2020-2024

### Emotional Description Vocabulary (Tell Not Show)
Flag: "a surge/wave/flood of [emotion]", "a mix of X and Y", "[emotion] warred with [emotion]", "felt a sense of [abstract noun]", "something about the way...", "a feeling of [noun] settled over", "couldn't help but [verb]", "found myself [verb]-ing"

## Sentence-Level Patterns

### Burstiness (Sentence Length Variance)
AI sentences cluster around 15-25 words. Human writing ranges 3-40+.
Measure: standard deviation of sentence word counts. Target: std dev > 8 words.
Flag: paragraphs where all sentences are within 5 words of average length.
Flag: 80%+ of sentences within 5 words of average (AI signature).

### Present Participial Clause Overuse
AI uses -ing clauses at 2-5x human rate. Two per sentence is a strong tell.
Target: max 1 participial clause per paragraph.
Fix: convert to main clauses or subordinate differently.

### Nominalization Density
AI uses noun forms of verbs at 1.5-2x human rate ("implementation" instead of "implement").
Flag: 3+ nominalizations per sentence. Obscures agency, creates corporate-speak.
Fix: unpack back to verbs. Find the agent and action hidden in the noun.

### Perfect Grammar as Tell
Zero typos, fragments, comma splices, sentences starting "And" or "But".
Always Oxford commas, always American spelling, rarely contractions.
Fix: leave voice-serving imperfections. Use contractions in first-person.

## Punctuation Tells

### Em Dash Overuse
GPT models were tuned to include more em dashes. Target: max 2-3 per 1000 words.
(Note: Union project uses ZERO dashes. Flag any occurrence.)

### Missing Semicolons and Parentheses
AI rarely uses semicolons or parentheses. Their absence flattens prose rhythm.
Semicolons link related independent clauses. Parentheses create asides and digressions.

## Linearity Patterns

### Perfect Sequential Escalation
AI orders events least to most dramatic. No returns, no tangents, no "oh, and another thing."
Human narration is associative: circles back, jumps ahead, corrects itself.
Fix: let narrators double back, insert illuminating digressions, allow structural imperfections.

### Tense Uniformity
Past tense dominates 82-99% in AI output. Humans use more temporal variety.
Fix: vary temporal structure. Present tense for immediacy, habitual past for texture, flashbacks for revelation.

## Scoring Template

Count per 1000 words:
| Pattern | AI Density | Human Target | Found |
|---------|-----------|--------------|-------|
| Tier 1 vocabulary | 5-15+ | 0 | __ |
| Tier 2 vocabulary | 3-8+ | 0-2 | __ |
| Tier 3 structural | 3-5+ | 0-1 | __ |
| Emotional labels | 3-8+ | 0-1 | __ |
| Participial clauses | 8-15+ | 3-5 | __ |
| Nominalizations | 5-10+ | 2-4 | __ |
| Sentences within 5w of avg | 80%+ | Under 50% | __% |

## Also Watch For (overlap with other agents)
- Contrastive frames ("not X, but Y"): see Structure agent
- Metaphor cliches (water/fire/weight): see Voice agent
- Rosy glow endings, symmetric load-balancing: see Structure agent
