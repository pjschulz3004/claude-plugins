# Multi-Stage Editing Pipeline

Systematic workflow from scene breakdown through final polish.

## Pipeline Overview

### Pre-Draft Phase
| Stage | Suffix | Focus |
|-------|--------|-------|
| Scenes | `(scenes)` | Chapter broken into scenes with purpose |
| Beats | `(beats)` | Scenes expanded to specific beats |
| Draft | `(draft)` | First prose draft from beats |

### Editing Phase
| Stage | Suffix | Focus |
|-------|--------|-------|
| Edit 1 | `(edited-1-plot)` | Plot & Continuity |
| Edit 2 | `(edited-2-scene)` | Scene & Beat structure |
| Edit 3 | `(edited-3-line)` | Line-level prose |
| Edit 4 | `(edited-4-ai)` | AI-Pattern elimination |
| Edit 5 | `(edited-5-hostile)` | Hostile reader pass |

## Pre-Draft Phase

### Scenes Stage
Input: Arc outline, previous chapter, character files, context docs.
Output format: Scene title, purpose, POV, location, characters, rough content, ending hinge.
Checklist: Each scene has clear purpose, identified characters, ends on hinge, flows logically.

### Beats Stage
Input: (scenes) file with author notes.
Output format: Beat number, what happens, what turns, approximate words.
Checklist: Every beat turns something, therefore/but causality, ~1 turn per 300 words.

### Draft Stage
Input: (beats) file, voice/style guides.
Focus: Get the story down. Hit the beats. Maintain voice. End scenes on hinges.
The draft does NOT need to be polished. It's meant to be edited.

## Editing Phase

### Stage 1: Plot & Continuity
**Goal**: Chapter serves the story, maintains continuity, advances arcs.

Prerequisites: Story overview, arc context, previous chapter, character files.

Checks:
- **Continuity**: Timeline, character states, props/locations, canon compliance
- **Plot function**: Chapter purpose, planned beats present, causality chain, stakes escalation
- **Character arc**: Protagonist's state changes, supporting characters serve function
- **Thematic integrity**: Core themes present, ideology deployed correctly

Output: Issue list + structural recommendations + (edited-1-plot) file.

### Stage 2: Scene & Beat Edit
**Goal**: Every scene functions dramatically.

Checks:
- **Scene structure**: Opens friction, closes hinge, single goal, obstacle present
- **Beat analysis**: Each turns something, ~1 per 300 words, causality
- **Pacing**: Scenes escalate, tangents proportionate, dialogue intercutting
- **Character voice**: POV consistent, no impossible knowledge, emotional truth
- **Dialogue**: Every line turns something, distinctive voices, subtext present

Output: Scene-by-scene notes + (edited-2-scene) file.

### Stage 3: Line Edit
**Goal**: Professional prose quality.

Checks:
- **Rhythm**: Spiral+jab, sentence variety, job-mix heuristic, action/tension density
- **Figurative language**: Density ≤1/paragraph, 3-question test, no mixed vehicles
- **Sensory details**: Rotation, smell limited, locale-specific
- **Voice calibration**: Confidence level, humor style, knowledge base
- **House style**: Punctuation, lexical repetition, concrete:abstract ratio

Output: Polished prose + (edited-3-line) file.

### Stage 4: AI-Pattern Elimination
**Goal**: Eliminate AI-generated texture.

Run the 8-category checklist systematically:
1. Vagueness crutches → near zero
2. Triple cascades → max 2-3 earned
3. Simile density → 1 per 600-800 words
4. Parallel construction sameness → vary every 2-3
5. Fragment overuse → max 5-6 per 1000 words
6. Filtering verbs → cut unless intentional
7. Verbal tics → no phrase >3x per 1000 words
8. Over-explaining → show OR tell, not both

Also: AI vocabulary scan (Tier 1/2/3), structural tells (sentence length, paragraph shapes).

Output: Documented fixes per category + (edited-4-ai) file.

### Stage 5: Hostile Reader Pass
**Goal**: Final check through eyes of a brilliant, picky reader who hates AI content.

Questions for every paragraph:
1. Could this appear in generic AI output? → Rewrite for THIS story.
2. Pattern in last three paragraphs? → Break it.
3. Explaining something just shown? → Cut explanation.
4. Generic or specific comparison? → Make specific.
5. Same paragraph shape as last? → Vary.
6. Would a cynical reader roll their eyes? → Rewrite.
7. Too smooth? Needs grit? → Add human imperfection.

Preserve/add: stray thoughts, irrelevant details, off-topic observations,
character-driven humor, imperfect grammar serving voice.

Output: Final polish + (edited-5-hostile) file.

## Feedback Format

```
### [ISSUE TYPE] Line/Para Reference
**Current text**: > [quoted text]
**Problem**: [what's wrong and why]
**Suggested fix**: > [revised text]
**Rationale**: [why this fix works]
```

Author response options: Accept / Reject (with reason) / Modify / Discuss.

## Continuity Scratchpad Template

Track for every editing session:
- Prior state: last chapter summary, physical/emotional state, voice level
- Already used: analogies/images, ideology citations, sensory motifs
- Active threads: ongoing plot elements, relationships, props/objects
- This chapter must: required beats, foreshadowing, callbacks

## Full Editorial Pass Order (Quick Reference)
1. Continuity skim → create scratchpad
2. Structural pass → mark beats, check causality, add/trim hinges
3. Line polish → rhythm, sensory rotation, voice
4. AI-pattern elimination → 8-category checklist, vocabulary scan
5. Hostile reader pass → specificity test, humanity check
6. Continuity re-check → bodies, props, time, consequences
