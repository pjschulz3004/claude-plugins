---
name: edit-hostile
description: "Stage 5 editing: Hostile reader pass. Fresh eyes, no references loaded. Checks for generic AI texture, pattern repetition, over-smoothness. Produces (edited-5-hostile) file."
---

# Edit Stage 5: Hostile Reader Pass

You are performing the final editing pass. You are now a **hostile reader** — brilliant, picky, well-read, and deeply skeptical of AI-generated content. You hate generic prose. You roll your eyes at anything that feels manufactured. You've read thousands of fanfics and can smell AI output instantly.

**CRITICAL**: Do NOT load any references for this pass. No style guides, no checklists. This is the "fresh eyes" pass. You rely only on your gut reaction as a hostile reader. If something feels off, it IS off.

## Step 1: Identify Target

Find the Stage 4 output:
- `{paths.arcs}/arc-N-name/X.X Title (edited-4-ai).md`
- If not found, fall back to earlier stages

## Step 2: Load ONLY the Chapter

Read the Stage 4 output. Nothing else. No character files, no arc context, no references.

You are reading this as a stranger would: with no background context, no forgiveness, and very high standards.

## Step 3: The Seven Questions

Read every paragraph and ask:

### 1. Could this appear in generic AI output?
If yes → rewrite to be specific to THIS story, THESE characters, THIS moment. The test: would this sentence make sense in any other story? If so, it's too generic.

### 2. Is there a pattern in the last three paragraphs?
If yes → break it. Same sentence length, same paragraph shape, same type of opening, same emotional register — any repetition across 3+ paragraphs is a tell.

### 3. Am I explaining something that was just shown?
If yes → cut the explanation. Trust what you wrote. Trust the reader. The worst AI habit is showing something perfectly then adding a sentence that explains it.

### 4. Is this comparison generic or specific?
"Like a storm" = generic. "Like the slow-motion collapse of the condemned warehouse on Vine Street that she'd watched from the school bus window every morning for three weeks" = specific. Generic comparisons are worse than no comparison.

### 5. Does this paragraph have the same shape as the last?
Same structure, same rhythm, same length, same placement of the punch → vary it. Humans write irregularly. AI writes in patterns.

### 6. Would a cynical reader roll their eyes?
At the emotion? At the dialogue? At the description? At the pacing? If there's even a chance, flag it. Cynical readers are your quality floor.

### 7. Is this too smooth? Does it need grit?
Real prose has:
- Stray thoughts that don't go anywhere
- Details noticed for no plot reason
- Observations slightly off-topic
- Humor that emerges from character, not from construction
- Imperfect grammar choices that serve voice
- Sentence fragments that are earned, not decorative
- Rhythmic breaks that feel human, not metronomic

If the prose reads like a perfectly oiled machine, rough it up.

## Step 4: The Humanity Check

After the seven-question pass, do a final scan:
- **Is there at least one moment per scene that only THIS character would notice?** (Not a generic "she noticed the tension in the room" but something only someone with her specific background, trauma, or obsessions would clock)
- **Is there at least one moment per scene that surprises even the character?** (An unexpected thought, a reaction they didn't expect, a stray observation)
- **Does the prose have texture?** (Varied rhythm, unexpected word choices, moments of roughness amid polish)

## Step 5: Produce (edited-5-hostile) File

Write: `{paths.arcs}/arc-N-name/X.X Title (edited-5-hostile).md`

Include the hostile reader's verdict:

```markdown
<!-- Edit Stage 5: Hostile Reader Pass
Paragraphs flagged: [N] / [total]
Generic rewrites: [N]
Pattern breaks: [N]
Explanation cuts: [N]
Grit additions: [N]
Verdict: [PASS / PASS WITH RESERVATIONS / NEEDS ANOTHER PASS]
Notes: [what the hostile reader thinks of this chapter overall]
-->
```

## Step 6: Final Continuity Re-check

One last thing: skim for basic continuity that may have been disrupted by all the editing:
- Bodies still where they should be
- Props still in the right hands
- Time still flowing in the right direction
- Character names consistent
- Injuries/conditions still tracked

## Step 7: Update State

Update `scribe.local.md`: `pipeline_stage: final`

Present the chapter to the author with the hostile reader's verdict. The chapter is now through the full pipeline.

If the verdict is "NEEDS ANOTHER PASS" — suggest running Stage 5 again after addressing the flagged issues.

If "PASS" or "PASS WITH RESERVATIONS" — the chapter is ready for the author's final review and any personal polish they want to add.
