---
name: write-draft
description: "Draft prose from a beats file. Loads voice guide and prose style rules. Produces the (draft) file. Use after beat planning is complete."
---

# Write Draft

You are helping the author draft prose from a completed beats file. Your job is to produce a full prose draft that hits every planned beat while maintaining the POV character's voice.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter to draft. Format: `[arc].[chapter]` (e.g., `3.5`).

## Step 2: Load Context

Read these files:
1. **The (beats) file**: `{paths.arcs}/arc-N-name/X.X Title (beats).md` — your primary blueprint
2. **Previous chapter ending**: Last 500-1000 words of the prior chapter (for continuity of tone and situation)
3. **Character files**: For the POV character and major characters in the chapter
4. **Voice guide** (if exists in project): Check `{paths.style_guides}/` for character-specific voice guides

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md` — rhythm, imagery, voice, POV
- `${CLAUDE_PLUGIN_ROOT}/references/character-voices.md` — voice techniques

If database exists, query character states:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[POV character]"
```

### Knowledge Graph Lookup

Query the KG for grounding details needed during drafting:

1. For POV character: `kg_search(query="[POV character] voice personality speech patterns", scope="au", limit=5)` and `kg_search(query="[POV character] powers abilities", scope="canon", limit=5)`
2. For each location in the beats: `kg_search(query="[location] physical description layout", scope="canon", limit=5)`
3. For key interactions: `kg_search(query="[character A] relationship with [character B]", scope="au", limit=5)`
4. Flag any canon vs AU inconsistencies briefly. Use KG results to inform concrete sensory details and accurate character interactions.

## Step 3: Establish Voice

Before drafting, confirm the POV character's voice:
- **Vocabulary level**: What words would they use / avoid?
- **Sentence patterns**: Long and recursive? Short and punchy? Mixed?
- **What they notice**: A tactician sees exits. An organizer sees power dynamics.
- **Humor style**: Dry? Self-deprecating? Observational? Absent?
- **Emotional register**: How do they process feelings?

Present a brief voice summary to the author for confirmation.

## Step 4: Draft Prose

Work through the beats file scene by scene. For each scene:

### Opening
- Start with friction (tension in the first 2-3 lines)
- Establish POV, location, and situation quickly
- Ground with a sensory detail (rotate: sight, sound, touch, smell, taste)

### Beat-by-Beat Drafting
For each beat:
- Hit the planned event/change
- Maintain MRU order (motivation before reaction)
- Keep the job-mix heuristic going (vary sentence types)
- Aim for the target word count per beat
- Connect to next beat via therefore/but

### Closing
- End on the planned hinge (decision, reversal, or striking image)
- Do NOT resolve tension — leave it open

### Prose Quality Rules (from reference)
- Spiral+jab rhythm: long recursive sentence → short punch
- Max 1 figurative per paragraph, on turning points
- Concrete:abstract ratio 2:1+
- Cut filter words (saw, felt, noticed, realized)
- Deep POV: we ARE the character, no thought tags
- Paragraph shape variety (don't repeat the same shape)

## Step 5: Scene Breaks

Use `---` or `* * *` for scene breaks within the chapter. Each scene should:
- Be readable as its own unit
- Transition smoothly from the previous scene's hinge
- Open with fresh friction (not a recap)

## Step 6: Produce the (draft) File

Write the file following the naming convention:
`{paths.arcs}/arc-N-name/X.X Title (draft).md`

Structure:
```markdown
# X.X [Title]

[Full prose draft with scene breaks]

---

## Author Notes for Editing Phase
- **Voice confidence**: [1-5, how well did the voice land?]
- **Beats hit**: [list any beats that were modified or skipped, with reasons]
- **Known issues**: [anything the author should look at]
- **Continuity flags**: [things to verify in editing]
- **Word count**: [total]
```

## Step 7: Author Review

After producing the draft, ask the author:
- Does the voice feel right for this character?
- Any beats that landed wrong or need reworking?
- Any scenes that need more or less space?
- Ready to move to editing, or revise the draft first?

## Step 8: Update State

Update `scribe.local.md`:
- `pipeline_stage: edit-1`
- `voice_confidence: [author's rating]`

Suggest next step: `/scribe:edit plot [X.X]`

**Remember:** The draft does NOT need to be polished. It needs to hit the beats, maintain voice, and be structurally sound. Polish comes in editing.
