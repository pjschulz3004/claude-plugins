---
name: edit-ai-patterns
description: "Stage 4 editing: 3-agent AI detection with density audit. Dispatches language, structure, and voice detector sub-agents per scene. Produces synthesis and edited scene files."
---

# Edit Stage 4: AI-Pattern Elimination (3-Agent Orchestrator)

You are the AI detection orchestrator. You do NOT scan for patterns yourself. You run a density audit, dispatch three specialized detector agents per scene, synthesize their findings, and apply fixes with author approval.

## Step 1: Identify Target Chapter

Find the Stage 3 output. Check for new format first, then old format:
- New: `{paths.arcs}/arc-N-name/X.X/edit-3-line/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (edited-3-line).md`

## Step 2: Set Up Output Directory

```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/edit-4-ai/reports"
```

## Step 3: Load Scene Files

Read all scene files from `X.X/edit-3-line/`. Note total word count per scene and for the chapter.

If using old format (single file), split mentally into scenes at scene breaks for reporting purposes, but process as a whole.

## Step 4: Density Audit (Full Chapter)

Before dispatching agents, run a density audit across ALL scenes combined. Count:

### Pattern Counts (per 1000 words)
| Pattern | Count | Per 1000w | Target | Status |
|---------|-------|-----------|--------|--------|
| Contrastive frames ("not X, but Y" and variants) | | | Max 1-2 | |
| Tricolons (lists/sequences of exactly 3) | | | Max 2-3 | |
| Present participial clauses (-ing modifiers) | | | Max 3-5 | |
| Metaphors/similes | | | 3-5 | |
| Fragments | | | 5-6 | |
| Dashes (em/en) | | | 0 | |
| AI vocabulary hits (Tier 1/2/3) | | | 0 | |
| Emotional labels (telling) | | | 0-1 | |

### Burstiness Check
Compute sentence length std dev. Target: > 8 words.

### Per-Scene Breakdown
Note which scenes contribute disproportionately to any over-target category.

Write results to: `X.X/edit-4-ai/density-audit.md`

## Step 5: Prepare Character Voice Summary

Read the POV character's file. Create a brief voice summary (~100 words):
- Vocabulary, register, sentence patterns
- Verbal tics, what they notice, humor style
- Current confidence level

## Step 6: Dispatch 3 Agents Per Scene

For each scene, dispatch three agents **in parallel**:

### Agent 1: Language & Vocabulary Detector
- Sub-agent type: `scribe:ai-detector-language`
- Input: scene file content + density audit summary
- Reference: `${CLAUDE_PLUGIN_ROOT}/references/ai-detection-language.md`
- Output saved to: `X.X/edit-4-ai/reports/scene-N-language.md`

### Agent 2: Structure & Rhetoric Detector
- Sub-agent type: `scribe:ai-detector-structure`
- Input: scene file content + density audit summary
- Reference: `${CLAUDE_PLUGIN_ROOT}/references/ai-detection-structure.md`
- Output saved to: `X.X/edit-4-ai/reports/scene-N-structure.md`

### Agent 3: Voice & Interiority Detector
- Sub-agent type: `scribe:ai-detector-voice`
- Input: scene file content + density audit summary + character voice summary
- Reference: `${CLAUDE_PLUGIN_ROOT}/references/ai-detection-voice.md`
- Output saved to: `X.X/edit-4-ai/reports/scene-N-voice.md`

**Critical**: Dispatch these as sub-agents WITHOUT passing conversation context. They must read the scene with fresh eyes, no goodwill bias from having participated in drafting.

## Step 7: Synthesis

After all agent reports are collected, read them all and produce `X.X/edit-4-ai/synthesis.md`:

### High-Confidence Issues (flagged by 2+ agents)
These are almost certainly real problems. List each with:
- The specific text
- Which agents flagged it and why
- Recommended fix

### Single-Agent Flags (flagged by 1 agent only)
Review individually. Some will be false positives, some will be real catches the other agents missed. Note your assessment for each.

### Disagreements
Where agents contradict each other. Note for author decision.

### Density Verdict
Based on the audit: which categories still exceed targets after proposed fixes?

### Per-Scene Verdicts
| Scene | Language | Structure | Voice | Overall |
|-------|----------|-----------|-------|---------|
| 1 | [grade] | [grade] | [grade] | [grade] |
| 2 | [grade] | [grade] | [grade] | [grade] |
| ... | | | | |

### Chapter Verdict
[CLEAN / MINOR ISSUES / NEEDS WORK / HEAVY AI TEXTURE]

## Step 8: Author Review

Present the synthesis to the author. Let them:
- Accept all high-confidence fixes
- Review single-agent flags individually
- Make decisions on disagreements
- Request additional scanning of specific passages

## Step 9: Apply Fixes

After author approval, apply accepted changes to scene files.
Save edited scenes to: `X.X/edit-4-ai/scene-N.md`

Include the density audit results as a comment at the top of each file:
```markdown
<!-- Edit Stage 4: AI-Pattern Elimination
Density audit: [summary of category counts]
Agents dispatched: language, structure, voice
High-confidence fixes: [N]
Single-agent fixes: [N]
Overall: [verdict]
-->
```

## Step 10: Update State

Update `scribe.local.md`: `pipeline_stage: edit-5`

Suggest next step: `/scribe:edit hostile [X.X]`

### Deep Dive Resource
For chapters with persistent AI texture that resists the 3-agent scan, load `revision-self-editing-craft.md` from `knowledge-base/research/`.
