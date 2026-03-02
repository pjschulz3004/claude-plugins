# Multi-Stage Editing Pipeline

Systematic workflow from scene breakdown through final polish. Scene-level processing throughout.

## Directory Structure

Each chapter gets its own subdirectory with stage-specific folders:

```
arc-N-name/
  X.X/
    planning/
      chapter-plan.md
      scene-1.md, scene-2.md, ...
    beats/
      scene-1.md, scene-2.md, ...
    draft/
      scene-1.md, scene-2.md, ...
    edit-1-plot/
      scene-1.md, scene-2.md, ...
      continuity-notes.md
    edit-2-scene/
      scene-1.md, scene-2.md, ...
    edit-3-line/
      scene-1.md, scene-2.md, ...
    edit-4-ai/
      density-audit.md
      reports/
        scene-N-language.md, scene-N-structure.md, scene-N-voice.md
      synthesis.md
      scene-1.md, scene-2.md, ...
    edit-5-hostile/
      reports/
        scene-N-ai-hater.md, scene-N-lit-snob.md, scene-N-worm-reader.md
      synthesis.md
      scene-1.md, scene-2.md, ...
    final/
      chapter.md
```

### Scene File Format
```markdown
# Scene N: [Title]
<!-- Chapter X.X | [Location] | [POV] | ~[word estimate] words -->

[prose content]
```

### Backward Compatibility
Chapters 3.1-3.6 use the old flat file format (`X.X Title (stage).md`).
New chapters (3.7+) use per-scene subdirectories.
Skills detect format by checking whether `X.X/` directory exists.

## Pipeline Overview

### Stage-by-Stage Processing Model

| Stage | Input Dir | Output Dir | Processing | Model |
|-------|-----------|------------|------------|-------|
| Scenes | (arc context) | `X.X/planning/` | whole-chapter | main agent |
| Beats | `X.X/planning/` | `X.X/beats/` | per-scene | main agent |
| Draft | `X.X/beats/` | `X.X/draft/` | per-scene | sub-agent (opus) |
| Edit 1 (Plot) | `X.X/draft/` | `X.X/edit-1-plot/` | whole-chapter read, per-scene output | main agent |
| Edit 2 (Scene) | `X.X/edit-1-plot/` | `X.X/edit-2-scene/` | per-scene | main agent |
| Edit 3 (Line) | `X.X/edit-2-scene/` | `X.X/edit-3-line/` | per-scene | main agent |
| Edit 4 (AI) | `X.X/edit-3-line/` | `X.X/edit-4-ai/` | density audit then 3 sub-agents per scene | sub-agents (sonnet) |
| Edit 5 (Hostile) | `X.X/edit-4-ai/` | `X.X/edit-5-hostile/` | 3 sub-agents per scene | sub-agents (sonnet) |
| Combine | `X.X/edit-5-hostile/` | `X.X/final/` | script | combine-scenes.sh |

### Sub-Agent Isolation
Stages 4 and 5 dispatch sub-agents WITHOUT conversation context. This prevents:
- Goodwill bias (agent that wrote the prose going easy on detection)
- Context contamination (knowing the story makes you forgive AI patterns)
- Blind spots from familiarity

## Pre-Draft Phase

### Scenes Stage
Input: Arc outline, previous chapter, character files, context docs.
Output: `X.X/planning/chapter-plan.md` + `X.X/planning/scene-N.md` per scene.
Each scene file: title, purpose, POV, location, characters, structure, hinge.

### Beats Stage
Input: `X.X/planning/scene-N.md` files.
Output: `X.X/beats/scene-N.md` per scene.
Each file: beat-by-beat expansion with turns, causality, word estimates.

### Draft Stage
Input: `X.X/beats/scene-N.md` + voice/style context.
Output: `X.X/draft/scene-N.md` per scene.
Dispatched as sub-agents (scene-drafter, opus). Each scene drafted independently.
NO AI-ism checking at draft stage. Only voice + style + beats.

## Editing Phase

### Stage 1: Plot & Continuity
**Goal**: Chapter serves the story, maintains continuity, advances arcs.
**Processing**: Read ALL scene files for continuity analysis. Output per-scene files + `continuity-notes.md`.

Checks:
- Timeline, character states, props/locations, canon compliance
- Plot function, planned beats present, causality chain, stakes escalation
- Character arc progression, supporting character function
- Thematic integrity, ideology grounded in drama
- First-person information audit, omniscient slips

### Stage 2: Scene & Beat Edit
**Goal**: Every scene functions dramatically.
**Processing**: Read all scenes (for cross-scene patterns). Edit each individually.

Checks:
- Scene value change (entry vs exit charge must differ)
- Opens friction, closes hinge, single goal, obstacle present
- Beat analysis: each turns something, ~1 per 300 words, causality
- Scene-sequel pattern across scenes
- Pacing, character voice, dialogue subtext

### Stage 3: Line Edit
**Goal**: Professional prose quality.
**Processing**: Per-scene. Line editing is local work.

Checks:
- Rhythm: spiral+jab, sentence variety, job-mix, pacing checkpoints
- Figurative language: density, 3-question test, image field coherence
- Sensory details: rotation, smell discipline, specificity
- Voice calibration: confidence level, humor, knowledge base
- House style: punctuation, lexical repetition, concrete:abstract ratio

### Stage 4: AI-Pattern Elimination (3-Agent Detection)
**Goal**: Eliminate AI-generated texture through multi-agent consensus.
**Processing**: Density audit (full chapter), then 3 agents per scene in parallel.

Steps:
1. **Density audit**: Concatenate all scenes, count patterns globally, write `density-audit.md`
2. **Dispatch per scene** (3 agents in parallel):
   - Language agent: vocabulary, sentence patterns, punctuation, linearity
   - Structure agent: contrastive frames, rhetorical devices, narrative structure
   - Voice agent: metaphor quality, interiority, show-don't-tell, POV consistency
3. **Collect reports** to `reports/` directory
4. **Synthesize**: identify high-confidence issues (2+ agents agree), single-agent flags, disagreements
5. **Apply fixes** to scene files after author review

### Stage 5: Hostile Reader Pass (3-Persona Reading)
**Goal**: Final check through three distinct hostile perspectives.
**Processing**: 3 agents per scene in parallel, no references loaded.

Agents:
- **AI Hater**: smells AI slop from a paragraph away. Flags anything machine-generated.
- **Lit Snob**: MFA standards. Prose quality, craft, literary merit. High bar.
- **Worm Fan**: 500+ fics read. Knows every fanfic cliche. Checks voice accuracy, canon, originality.

Steps:
1. Dispatch 3 readers per scene (no references, fresh eyes)
2. Collect reports to `reports/` directory
3. Synthesize: consensus flags (2+ agree), persona-specific concerns
4. Apply fixes after author review

### Combination Step
After Stage 5, run `combine-scenes.sh` to concatenate scene files into `final/chapter.md`.

## Feedback Format

```
### [ISSUE TYPE] Line/Para Reference
**Current text**: > [quoted text]
**Problem**: [what's wrong and why]
**Suggested fix**: > [revised text]
**Rationale**: [why this fix works]
```

Author response options: Accept / Reject (with reason) / Modify / Discuss.

## Chapter Type Variants

### Battle Chapter Variant (Stages 1-2)
- Stage 1: verify spatial logic, power interaction accuracy, casualty tracking
- Stage 2: pacing oscillation (never >500w single register), voice compression ladder, aftermath weight
- Consider launching `battle-reviewer` agent
- Deep dive: `battle-craft-reference.md`

### Dialogue-Heavy Chapter Variant (Stages 2-3)
- Stage 2: subtext density, power dynamic shifts, voice differentiation
- Stage 3: Radio Test, tag craft, oblique responses (>60% indirect)
- Consider launching `dialogue-auditor` agent
- Deep dive: `dialogue-reference.md`

## Deep Dive Resources by Stage

| Stage | Issue | Deep Dive Resource |
|-------|-------|-------------------|
| 1 (Plot) | Character arc problems | `character-arc-design.md` |
| 1 (Plot) | Foreshadowing gaps | `foreshadowing-payoff-architecture.md` |
| 1 (Plot) | Theme preaching | `thematic-integration-craft.md` |
| 2 (Scene) | Flat scenes | `scene-construction-craft.md` |
| 2 (Scene) | Weak dialogue | `dialogue-craft.md`, `power-dynamics-dialogue.md` |
| 2 (Scene) | Pacing drag | `tension-mechanics-in-action.md` |
| 3 (Line) | Sentence monotony | `prose-style-sentence-craft.md` |
| 3 (Line) | Subtext missing | `subtext-and-implication.md` |
| 3 (Line) | Voice drift | `first-person-pov-mastery.md` |
| 4 (AI) | Persistent AI texture | `revision-self-editing-craft.md` |
| 5 (Hostile) | Emotional dishonesty | `emotional-impact-craft.md` |

## Specialized Skill Routing

| Skill | When to Use | Command |
|-------|------------|---------|
| `edit-dialogue` | Dialogue-heavy chapters | `/scribe:edit dialogue` |
| `edit-tension` | Pacing problems, flat sections | `/scribe:edit tension` |
| `battle-reviewer` agent | Combat chapters (from Stage 2) | Auto-suggested |
| `dialogue-auditor` agent | 40%+ dialogue chapters | Auto-suggested |

## Full Editorial Pass Order (Quick Reference)
1. Continuity skim (Stage 1): scratchpad, structural fixes
2. Scene structure (Stage 2): beats, causality, hinges
3. Line polish (Stage 3): rhythm, sensory, voice
4. AI detection (Stage 4): density audit, 3-agent scan, synthesis, fixes
5. Hostile reading (Stage 5): 3-persona fresh eyes, synthesis, fixes
6. Combine: `scripts/combine-scenes.sh` produces `final/chapter.md`
7. (Optional) Specialized pass: dialogue audit, tension audit, battle review
