---
name: edit-hostile
description: "Stage 5 editing: 3-persona hostile reader pass. Dispatches AI hater, lit snob, and Worm fan sub-agents per scene. No references loaded. Fresh eyes only."
---

# Edit Stage 5: Hostile Reader Pass (3-Persona Orchestrator)

You are the hostile reading orchestrator. You dispatch three distinct reader personas per scene, collect their reports, synthesize findings, and apply fixes with author approval. The personas have NO references, NO checklists, NO story context beyond the prose itself.

## Step 1: Identify Target Chapter

Find the Stage 4 output. Check for new format first:
- New: `{paths.arcs}/arc-N-name/X.X/edit-4-ai/scene-*.md`
- Old: `{paths.arcs}/arc-N-name/X.X Title (edited-4-ai).md`

## Step 2: Set Up Output Directory

```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/edit-5-hostile/reports"
```

## Step 3: Load Scene Files

Read all scene files from `X.X/edit-4-ai/`. Note word counts.

## Step 4: Prepare Minimal Context

For the Worm Fan reader only, prepare a brief character voice summary (~50 words):
- POV character name
- Key verbal tics
- Confidence level
- What they'd never say or think

The AI Hater and Lit Snob get NOTHING. Just the prose.

## Step 5: Dispatch 3 Readers Per Scene

For each scene, dispatch three agents **in parallel**:

### Reader 1: The AI Hater
- Sub-agent type: `scribe:hostile-reader-ai-hater`
- Input: scene file content ONLY
- No references, no context, no character info
- Output saved to: `X.X/edit-5-hostile/reports/scene-N-ai-hater.md`

### Reader 2: The Lit Snob
- Sub-agent type: `scribe:hostile-reader-lit-snob`
- Input: scene file content ONLY
- No references, no context, no character info
- Output saved to: `X.X/edit-5-hostile/reports/scene-N-lit-snob.md`

### Reader 3: The Worm Fan
- Sub-agent type: `scribe:hostile-reader-worm-fan`
- Input: scene file content + brief character voice summary
- No other references or context
- Output saved to: `X.X/edit-5-hostile/reports/scene-N-worm-reader.md`

**Critical**: Dispatch as sub-agents WITHOUT conversation context. Fresh eyes is the entire point of this stage.

## Step 6: Synthesis

After all reports are collected, read them and produce `X.X/edit-5-hostile/synthesis.md`:

### Consensus Flags (2+ readers agree)
High priority. When different readers with different perspectives flag the same moment, it's almost certainly a real problem.

For each:
- The specific text
- Which readers flagged it
- Their different reasons (valuable because they illuminate the problem from multiple angles)
- Recommended fix

### Persona-Specific Concerns
Flags raised by only one reader. Useful context but not necessarily action items:
- **AI Hater only**: might be pattern-detection false positives, or genuine tells the others missed
- **Lit Snob only**: craft issues that may not bother general readers but worth noting
- **Worm Fan only**: fandom-specific concerns, voice accuracy, canon issues

### Craft Integrity Checks
Across all reader reports, assess:
- **Violence/aftermath**: specific injuries, persistent consequences, character-revealing?
- **Subtext density**: is >60% of dialogue oblique?
- **Emotional honesty**: performed vs. felt? Body betrays brain?
- **Restraint at peak emotion**: simple prose at the biggest moments?
- **Re-reading reward**: foreshadowing echo, layered dialogue?

### Per-Scene Verdicts
| Scene | AI Hater | Lit Snob | Worm Fan | Overall |
|-------|----------|----------|----------|---------|
| 1 | [verdict] | [grade] | [verdict] | [pass/fail] |
| 2 | [verdict] | [grade] | [verdict] | [pass/fail] |

### Chapter Verdict
[PASS / PASS WITH RESERVATIONS / NEEDS ANOTHER PASS]
[Notes: what the hostile readers collectively think of this chapter]

## Step 7: Author Review

Present synthesis. Let the author:
- Review consensus flags (strongly recommend fixing these)
- Consider persona-specific concerns
- Make craft integrity decisions
- Request re-reads of specific scenes if needed

## Step 8: Apply Fixes

After approval, apply accepted changes.
Save to: `X.X/edit-5-hostile/scene-N.md`

Include verdict:
```markdown
<!-- Edit Stage 5: Hostile Reader Pass
Readers: AI Hater, Lit Snob, Worm Fan
Consensus flags: [N]
Persona-specific flags: [N]
Fixes applied: [N]
Verdict: [PASS / PASS WITH RESERVATIONS / NEEDS ANOTHER PASS]
-->
```

## Step 9: Final Continuity Re-check

Skim all edited scenes for continuity disrupted by editing:
- Bodies still where they should be
- Props in right hands
- Time flowing correctly
- Character names consistent
- Injuries/conditions tracked

## Step 10: Update State

Update `scribe.local.md`: `pipeline_stage: final`

If verdict is NEEDS ANOTHER PASS: suggest running Stage 5 again after fixes.
If PASS or PASS WITH RESERVATIONS: suggest `/scribe:edit combine [X.X]` to produce the final chapter file.
