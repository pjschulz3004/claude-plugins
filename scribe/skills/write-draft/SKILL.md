---
name: write-draft
description: "Orchestrate scene-by-scene drafting from beat files. Dispatches scene-drafter sub-agents for each scene independently. Produces per-scene draft files."
---

# Write Draft (Orchestrator)

You are the drafting orchestrator. You do NOT write prose yourself. You prepare context and dispatch scene-drafter sub-agents for each scene, keeping each generation within the ~2,600 word quality ceiling.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter to draft. Format: `[arc].[chapter]` (e.g., `3.7`).

## Step 2: Set Up Chapter Directory

Check if the chapter subdirectory exists: `{paths.arcs}/arc-N-name/X.X/`

If it exists, verify `beats/` directory has scene files.
If not, check for old-format `(beats)` file and inform user to run scene planning first.

Create the `draft/` subdirectory if it doesn't exist:
```bash
mkdir -p "{paths.arcs}/arc-N-name/X.X/draft"
```

## Step 3: Load Shared Context

Read these files (you'll pass relevant portions to each sub-agent):
1. **Character files**: For the POV character and major characters in the chapter
2. **Voice guide** (if exists): `{paths.style_guides}/` for character-specific voice guides

Load references (to extract voice summary, NOT to pass whole files):
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md`
- `${CLAUDE_PLUGIN_ROOT}/references/character-voices.md`

DO NOT load:
- ai-ism-checklist.md
- Any AI detection references
- editing-pipeline.md

### Knowledge Graph Lookup

Query the KG for grounding details:
1. POV character: `kg_search(query="[POV character] voice personality speech patterns", scope="au", limit=5)`
2. POV character powers: `kg_search(query="[POV character] powers abilities", scope="canon", limit=5)`
3. Key locations: `kg_search(query="[location] physical description", scope="canon", limit=5)`
4. Key relationships: `kg_search(query="[character A] relationship [character B]", scope="au", limit=5)`

## Step 3b: Chapter Type Routing

Classify the chapter's dominant mode:
- **Battle chapter**: Suggest `/scribe:write battle` instead.
- **Dialogue-heavy**: Note for voice summary (emphasize subtext, power dynamics).
- **Exposition**: Note for voice summary (emphasize incluing, concrete grounding).

## Step 4: Prepare Voice Summary

Create a concise voice summary for the sub-agents (~200 words):
- Vocabulary level and register
- Sentence patterns (long recursive? short punchy? hedged?)
- What they notice (exits? power dynamics? machinery?)
- Humor style
- Emotional processing style
- Verbal tics
- Confidence level for current arc position

Present this to the author for confirmation before dispatching.

## Step 5: Discover Scene Files

Read all beat files from `X.X/beats/`:
```
X.X/beats/scene-1.md
X.X/beats/scene-2.md
...
```

Count total scenes. Estimate total word count from beat files.

## Step 6: Draft Each Scene

For each scene, dispatch a `scene-drafter` sub-agent with:

1. **Scene beats**: the full content of `X.X/beats/scene-N.md`
2. **Character voice summary**: the prepared summary from Step 4
3. **Prose rules**: content of `prose-rules.md` (the reference, not the checklist)
4. **Previous scene ending**: last ~500 words from the previous scene's draft (for Scene 2+), or previous chapter ending (for Scene 1)

The sub-agent prompt should include:
- The scene beats (full content)
- The voice summary
- Key prose rules (rhythm, job-mix, concrete:abstract, spiral+jab)
- Previous scene ending for continuity
- Project-specific rules: ZERO dashes, Taylor thinks "Mom" and "Dad" not Annette/Danny
- Instruction: NO AI-ism checking. Focus on voice, beats, rhythm, humanity.

Save each sub-agent's output to: `X.X/draft/scene-N.md`

**Dispatch scenes sequentially** (each needs the previous scene's ending for continuity).

## Step 7: Post-Draft Summary

After all scenes are drafted, present to the author:
- Total word count
- Per-scene word counts
- Voice confidence ratings from each sub-agent
- Any beats that were modified (from drafter notes)
- Any weak spots flagged by drafters
- Continuity flags

## Step 8: Author Review

Ask the author:
- Does the voice feel right for this character?
- Any scenes that need more or less space?
- Any beats that landed wrong?
- Ready to move to editing, or revise specific scenes?

## Step 9: Update State

Update `scribe.local.md`:
- `pipeline_stage: edit-1`
- `voice_confidence: [author's rating]`

Suggest next step: `/scribe:edit plot [X.X]`

## Deep Dive Resources

When specific drafting problems arise, suggest loading from `knowledge-base/research/`:
- Flat dialogue: `dialogue-craft.md`
- Voice drift: `first-person-pov-mastery.md`
- Pacing drag: `tension-mechanics-in-action.md`
- Battle scenes: `epic-battle-scene-craft.md`
- Exposition dumps: `worldbuilding-exposition-craft.md`

**Remember:** The draft does NOT need to be polished. It needs to hit the beats, maintain voice, and be structurally sound. Polish comes in editing.
