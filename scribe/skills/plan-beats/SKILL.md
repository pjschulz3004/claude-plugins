---
name: plan-beats
description: "Expand scenes into specific beats with turns, causality, and word estimates. Produces the (beats) file. Use after scene planning."
---

# Plan Beats

You are helping the author expand a scene breakdown into specific, actionable beats. Beats are the smallest unit of story change — each one shifts status, knowledge, or plan.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine which chapter. Format: `[arc].[chapter]` (e.g., `3.5`).

## Step 2: Load Context

Read these files:
1. **The (scenes) file**: `{paths.arcs}/arc-N-name/X.X Title (scenes).md` — this is your primary input
2. **Previous chapter ending**: The last scene/beats of the prior chapter (for continuity)
3. **Character files**: For characters in these scenes (voice, personality, current state)

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/scene-structure.md` — especially the Beat Structure and MRU sections
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md` — for micro-tension and escalation patterns

If database exists, query for character states and relevant knowledge facts:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[character]"
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" who-knows "[relevant fact]"
```

### Knowledge Graph Lookup

Query the KG for detailed character and relationship info needed for beat-level planning:

1. For each character: `kg_search(query="[character] powers abilities fighting style", scope="canon", limit=5)` and `kg_search(query="[character] current state relationships", scope="au", limit=5)`
2. For knowledge states: `kg_search(query="[character] knows about [topic]", scope="au", limit=5)` — ensures beats don't have characters act on info they don't have
3. Flag any canon vs AU inconsistencies to the user. If the user identifies a missing AU fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

Use KG facts to ensure beats respect character capabilities and knowledge boundaries.

## Step 3: Expand Each Scene into Beats

For each scene from the `(scenes)` file, create 4-8 beats:

### Beat Format
```markdown
### Beat N: [Short description]
**Type**: [Action / Decision / Revelation / Reversal / Emotional]
**What happens**: [1-2 sentences — concrete event, dialogue, or internal shift]
**What turns**: [What changes: status, knowledge, or plan]
**Approximate words**: [word estimate for this beat]
```

### Beat Rules (from reference)
- Every beat MUST turn something — if nothing changes, it's filler, cut it
- **Causality**: Connect beats with "therefore" or "but", never "and then"
- **Try-Fail Cycles**: Attempt 1 fails → Attempt 2 partial → Attempt 3 decisive
- **MRU Order**: Motivation (external) always precedes Reaction (internal)
- **Reaction sequence**: Feeling → Action → Speech (when showing multiple)
- **Pacing**: At least one turn per ~300 words
- **Beat variety**: Mix types within a scene (don't run 3 Action beats in a row)

### The "Yes, But / No, And" Engine
For each beat, tag the outcome:
- **Yes, But...**: Goal achieved, new complication
- **No, And...**: Goal failed, things get worse
- **Yes!**: Clean victory (rare — save for arc climaxes)
- **No.**: Flat failure (always add "And..." to make it productive)

## Step 3b: Craft Integration

### MRU Sequencing

For each beat, verify the motivation-reaction chain follows the correct order:

1. **Motivation** (external stimulus): something happens in the world
2. **Feeling** (involuntary internal response): gut reaction, emotion, physical sensation
3. **Reflex** (involuntary external response): flinch, gasp, step back
4. **Rational action/speech** (voluntary response): deliberate choice, dialogue

Not every beat needs all four steps. Quick beats can skip to step 4. Emotional beats can linger on step 2. But never reorder them: a character cannot speak rationally before they have felt the impact. Feeling before action. Always.

### Micro-Tension Injection

For every beat (including quiet ones), identify the **competing emotions**. Maass's principle: tension comes from internal conflict, not external events.

For each beat, answer: **What two feelings compete here?**

| Beat | Feeling A | Feeling B | Source of Conflict |
|------|-----------|-----------|-------------------|
| 1    | relief    | suspicion | they're safe but something feels wrong |
| 2    | anger     | guilt     | she wants to lash out but knows she caused it |
| ...  | ...       | ...       | ... |

If you cannot name two competing feelings, the beat has no tension. Either add internal conflict or flag the beat as setup-only (and keep it short).

### Yes-But/No-And Engine

Label each beat's outcome explicitly and verify escalation across the scene:

- Early beats: establish the goal, first "No, but" or "Yes, but"
- Middle beats: complications stack ("No, and" raises the floor)
- Late beats: the decisive turn (clean "Yes" or devastating "No, and")

Map the beat chain as a sequence: `No,but > Yes,but > No,and > No,and > Yes!`
Check that the sequence escalates. If three beats in a row have the same outcome type, restructure.

### Dialogue Beat Design

For every beat that contains conversation, define three layers:

1. **Surface**: What they literally say (the text on the page)
2. **Subtext**: What they actually mean (the real communication happening underneath)
3. **Power dynamic**: Who controls the conversation at this beat, and does control shift?

Every dialogue beat should shift the power balance at least slightly. If character A is dominant for three consecutive dialogue beats, plan a moment where B pushes back, redirects, or goes silent (silence is a power move).

### Sensory Rotation

Assign a dominant sense to each beat. Track the pattern to avoid defaulting to visual:

| Beat | Dominant Sense | Detail |
|------|---------------|--------|
| 1    | Sound         | hum of fluorescent lights |
| 2    | Touch         | cold metal chair |
| 3    | Visual        | Lena's expression |
| 4    | Proprioception| weight of exhaustion in her legs |
| ...  | ...           | ... |

Rules: No smell paired with metaphor. If the last two beats were visual, force the next one to be touch, sound, or proprioception. Taste is rare (save for visceral moments: blood, bile, adrenaline copper).

### Time Dilation Planning

Mark each beat's temporal treatment:

- **Expanded** (3-5x word budget): Crisis moments, emotional turning points, first contact with something new, moments of decision
- **Normal** (1x): Standard scene beats, dialogue exchanges, action sequences
- **Compressed** (0.3-0.5x): Routine setup, transitions, familiar actions, time passage

A scene with all beats at the same dilation level feels flat. The rhythm should compress-compress-EXPAND-compress-EXPAND. The reader feels the important moments because the prose slows down around them.

## Step 4: Verify Beat Sequence

For each scene's beats, check:
- [ ] Every beat turns something (status/knowledge/plan)
- [ ] Beats connect via therefore/but, not and-then
- [ ] Beat types are mixed (not all the same)
- [ ] MRU order respected (motivation before reaction)
- [ ] Pacing: ~1 turn per 300 words
- [ ] Scene's dramatic question gets answered by the final beat
- [ ] Scene opens on friction (first beat establishes tension)
- [ ] Scene closes on hinge (last beat is decision/reversal/image)

For the full chapter:
- [ ] Total word estimate is reasonable for the chapter
- [ ] Tension escalates across scenes
- [ ] Character state changes are trackable beat-to-beat

## Step 5: Produce the (beats) File

Write the file following the naming convention:
`{paths.arcs}/arc-N-name/X.X Title (beats).md`

Structure:

```markdown
# X.X [Title] — Beats

**POV**: [character]
**Entering state**: [physical, emotional, what they know]
**Chapter goal**: [what the POV character wants across the chapter]

---

## Scene 1: [Title]

**Opening friction**: [what tension starts the scene]
**Dramatic question**: [the one question]

### Beat 1: [description]
**Type**: [type]
**What happens**: [concrete event]
**What turns**: [change]
**~words**: [estimate]

### Beat 2: [description]
...

**Scene outcome**: [Yes, But / No, And / etc.]
**Closing hinge**: [decision / reversal / image]

---

## Scene 2: [Title]
...

---

## Chapter Summary
- **Total estimated words**: [sum]
- **Beat count**: [N]
- **Exiting state**: [how the POV character has changed]
- **Threads advanced**: [which plot threads moved]
- **Setups planted**: [new foreshadowing]
- **Continuity notes**: [anything the draft writer needs to track]
```

## Step 6: Author Review

Present beats to the author. Common adjustments:
- Cutting beats that don't turn anything
- Adding beats where the gap between changes is too large
- Reordering beats for better causality
- Adjusting word estimates to hit target chapter length
- Adding specific dialogue or action ideas

## Step 7: Suggest Next Step

- To draft prose from these beats → `/scribe:write [X.X]`
- To revise scenes → `/scribe:plan scenes [X.X]`
- To check continuity before drafting → `/scribe:continuity [X.X]`

Update `scribe.local.md` with `pipeline_stage: write-draft`.
