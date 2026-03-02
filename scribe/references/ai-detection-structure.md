# AI Detection: Structure & Rhetoric

Reference for the Structure Detector agent. Focus: contrastive frames, rhetorical devices, narrative structure, cumulative density.

## Contrastive Frame Patterns

The single most recognizable AI tell. LLMs compulsively reframe through negation.

### Six Variant Forms
1. **Basic**: "It's not X, it's Y"
2. **Extended**: "It's not *just* X, it's Y"
3. **Em dash**: "X isn't just Y; it's Z"
4. **Semicolon**: "X doesn't do Y; it does Z"
5. **Double negative**: "Not only X but also Y"
6. **Implicit**: "We're not just building a product, we're creating an experience"

Target: max 1 per 500-700 words. Most chapters should have 3-5 total, not 15-20.

### Adversarial Pedagogy
Pattern: "You might think X. But actually, Y." Positions reader as naive, narrator as revealer.
Fix: remove the assumed-wrong-belief. Start with the insight. Let characters discover, not correct.

## Rhetorical Device Overuse

### Tricolon (Rule of Three)
AI defaults to three items in every list, description, emphasis moment.
Two items create tension. Three feels manufactured when overused. Four feels like a real list.
Target: max 2-3 earned triples per chapter (at genuine emotional climax with escalation).
Fix: vary list length. Use two for tension, four or five for catalogues, one for emphasis.

### Compulsive Parallelism
AI repeats grammatical structures across consecutive clauses and sentences.
Human writers deploy parallelism at key rhetorical moments. AI applies it to mundane info.
Fix: break parallel constructions every 2-3 instances. Interrupt with a different sentence type.

### Crude Antithesis
AI: "Forgiveness isn't human; it's divine." (Explicit negation.)
Human (Pope): "To err is human; to forgive, divine." (Implicit contrast.)
Fix: remove explicit negation. Let contrast be implicit. Ground in concrete detail.

## Structural Patterns

### Rosy Glow Endings
AI ends every scene/chapter with emotional resolution, forward-looking statement, or upbeat beat.
Characters reconcile, lessons learned, hope affirmed.
Fix: end on unresolved conflict, unanswered questions, disturbing images. Let discomfort linger.

### Plot Convergence (85% Same Story)
PNAS 2025: LLM stories converge to "return and reconcile" in 85% of cases.
Fix: plot against the obvious. If expected beat is reconciliation, write estrangement.

### Symmetric Load-Balancing
AI distributes weight evenly across sections. Every scene roughly same length and rhythm.
Humans emphasize what matters and rush through what doesn't.
Fix: vary section length dramatically. 3,000 words on a key scene, 200 on a transition.

### Blocky Text Division
Clearly segmented blocks of dialogue, exposition, narration without organic flow.
Fix: interweave modes within paragraphs. Speech flows into action into reflection.

## Paragraph and Section Patterns

### Paragraph Shape Repetition
AI pattern: medium establishing, medium developing, short punch (every paragraph).
Fix: some paragraphs end long. Some are mostly short. Punches in the middle.
Flag: 3+ paragraphs following the same internal structure.

### SVO Prison
AI defaults to Subject-Verb-Object monotony.
Fix: inverted constructions, subordinate clauses first, participial phrases, appositives.
Flag: 5+ consecutive SVO sentences.

### Uniform Section Weight
AI makes every scene ~500-800 words. Humans write 200-word transitions and 3,000-word climaxes.
Flag: all scenes within 20% of average length.

## Cumulative Density Problem

The most insidious tell: not any single pattern but their aggregate density.
Individual instances are all legitimate human tools. The macro-pattern (every paragraph contains a tricolon AND a contrastive frame AND a participial clause AND a stock metaphor) reads as AI.

### Density Audit Targets (per 1000 words)
| Pattern | AI Density | Human Target |
|---------|-----------|--------------|
| Contrastive frames | 3-5+ | Max 1-2 |
| Tricolons | 5-8+ | Max 2-3 |
| Present participial clauses | 8-15+ | Max 3-5 |
| Fragments | 0-2 | 5-6 (earned) |
| Sentences within 5w of avg | 80%+ | Under 50% |

### The Pipeline Fix
1. Count each pattern type per 1000 words across full chapter
2. Flag any category over human target
3. Thin the densest categories FIRST (global reduction)
4. Then line-edit remaining instances for quality

## Scoring Template

Count per chapter:
| Pattern | Count | Per 1000w | Target | Status |
|---------|-------|-----------|--------|--------|
| Contrastive frames | __ | __ | 1-2/1000w | __ |
| Tricolons | __ | __ | 2-3/1000w | __ |
| Parallel runs (3+ same) | __ | __ | vary 2-3 | __ |
| Same paragraph shape (3+) | __ | __ | 0 runs | __ |
| SVO chains (5+) | __ | __ | 0 runs | __ |
| Rosy glow endings | __ | n/a | 0 | __ |

## Also Watch For (overlap with other agents)
- Vocabulary Tier 1/2/3 words: see Language agent
- Metaphor pile-ups, cliche clusters: see Voice agent
- Emotional labeling (telling): see Voice agent
