---
name: write-battle
description: "Draft prose for battle/action chapters. Applies voice compression, time dilation, sensory compression, oscillation, and aftermath decompression. Use after plan-battle or beats are complete."
---

# Write Battle

You are helping the author draft prose for a battle or action chapter. Battle drafting differs from standard drafting: the prose itself must physically change shape as tension escalates. Voice compresses. Time dilates. Senses narrow. The reader should feel the fight through the degradation and recovery of the narrator's voice.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine the chapter. Format: `[arc].[chapter]` (e.g., `5.3`).

## Step 2: Load Context

Read these files:
1. **Battle plan**: `{paths.arcs}/arc-N-name/X.X Title (battle-plan).md` (from plan-battle). If none exists, read the (beats) file instead
2. **Previous chapter ending**: Last 500-1000 words of the prior chapter (voice continuity, entering state)
3. **Character files**: POV character and all major combatants (powers, voice, personality under stress)

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/battle-craft-reference.md`
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md`
- `${CLAUDE_PLUGIN_ROOT}/references/prose-rules.md`
- `${CLAUDE_PLUGIN_ROOT}/references/character-voices.md`

### Knowledge Graph Lookup

1. POV character voice: `kg_search(query="[POV character] voice speech patterns personality", scope="au", limit=5)`
2. Powers in play: `kg_search(query="[character] powers limitations costs", scope="canon", limit=5)` for each combatant
3. Location details: `kg_search(query="[location] physical layout terrain", scope="au", limit=5)`

## Step 3: Pre-Draft Setup

Before writing a word, establish:

### Entering Voice State
What compression level is the POV character at when the chapter opens? If the previous chapter ended mid-tension, don't reset to Level 1. Match the handoff.

### Compression Ladder Map
From the battle plan, confirm where each level kicks in:
- **Level 1 (Composed)**: Full recursive sentences, parentheticals, theory, self-commentary, "which is to say..." Operates during: approach, briefing, waiting
- **Level 2 (Alert)**: Sentences shorten. Parentheticals clip to a few words. Theory drops away. Qualifications thin. Operates during: first contact, early engagement
- **Level 3 (Stressed)**: Fragments appear. Sensory data dominates. Analytical voice reduced to flashes between actions. No digressions. Operates during: the break, cascading failures
- **Level 4 (Crisis)**: Near-wordless. Single-word reactions. Intellect overwhelmed by body. Operates during: peak danger, the turn
- **Level 5 (Aftermath)**: Voice returns slowly. Sentences rebuild but shakier, less certain. The voice is the same person, altered. Operates during: post-battle decompression

### Sensory Palette
Identify the 2-3 dominant senses for this fight. As stress rises, narrow the band:
- Levels 1-2: full sensory rotation (all five senses plus interoception)
- Levels 3-4: dominant sense plus one secondary
- Level 4 peak: single sense fragments, body sensation dominance (heartbeat, trembling, tunnel vision)
- Level 5: senses return unevenly (sound first, then smell, then full vision)

### Emotional Through-Line
The feeling beneath the tactics. Not "Taylor is scared" but the specific quality of fear that colors every perception: the cold arithmetic of knowing the numbers don't work, the body's refusal to match the mind's composure.

## Step 4: Draft the Battle

Work through the battle plan phase by phase.

### Approach / Pre-Combat (Level 1-2)

- Establish terrain through movement, not description. The POV character walks, looks, positions. The reader builds the map from their experience
- Lay out the plan in enough detail that deviations will register. The reader must know what SHOULD happen
- Seed complications: shaking hands, a radio that crackles wrong, an intel gap nobody mentions, bad footing
- Characters reveal themselves in how they handle waiting. Use this space for voice and relationship work
- Micro-tension: the plan exists, so the reader dreads its failure. Every detail of preparation is a Chekhov's gun

### First Contact (Level 2, transitioning to 3)

- The plan works briefly. This matters: the reader must see competence before it breaks. Moderate detail
- Sentences begin to shorten. Parentheticals clip. Observations sharpen
- Establish the rhythm of combat for this specific fight (not a generic battle tempo)
- Ground every action in physical space. The reader should be able to sketch a rough map

### The Break (Level 3-4)

- One failure cascades. Detail MAXIMIZES. Time slows at the crisis point
- Voice compression engages fully: fragments, sensory data, verbs without subjects
- Time dilation: a critical decision gets 200+ words. A standard engagement gets 50. Three pages for a half-second choice
- The cascading failure tests the protagonist's defining trait (for Taylor: her analytical control, her willingness to use people)
- Forced choices: each decision burns a bridge. No option is good. The reader feels the walls closing

### The Turn (Level 4, brief)

- Character-driven resolution. Not luck. Not rescue. A choice that costs something irreplaceable
- Peak compression: the prose is at its shortest, most visceral. The narrator's intellect is overwhelmed
- The clever use moment (if planned): existing power, new application, technically legal but surprising
- Surprising AND inevitable: the reader should not predict it but should recognize it afterward

### Aftermath (Level 5, gradual return to 1)

- Silence after noise. Do not skip this. The aftermath gets equal or greater weight to the action
- Voice rebuilds slowly. First: short declarative sentences. Then: observations return. Then: qualifications creep back. Finally: the recursive voice reassembles, but changed
- Physiological crash: trembling, nausea, thirst, delayed pain, jumpiness, inappropriate laughter or flatness
- Cost made specific: names not numbers. What the dead person's hands looked like. The space where someone used to stand
- Emotional processing: the battle's meaning crystallizes here, not during the fighting. What the POV character now knows about themselves

### Oscillation Discipline

Throughout the entire battle, enforce this rule: never more than 500 words at a single pacing register.

Alternate between:
- **Action burst** (100-200 words): visceral, immediate, one character's experience
- **Tactical assessment** (50-100 words): pull back, wider view, what's changed
- **Emotional beat** (50-100 words): what the POV character feels beneath the action
- Back to action

The rhythm of combat is not constant intensity. It is surge and pause, noise and silence, violence and the moment between violence.

### Quiet Moments (1-2 per battle)

Place after first major shock or before the climactic push:
- Dark humor (gallows wit, inappropriate observation)
- Physical awareness (noticing the shaking hands, the blood that's already drying)
- Memory flash (brief, a sentence or two, not a full flashback)
- Human connection (a look, a hand, a word that isn't tactical)
- Strategic pause (the held breath before committing)

These exist for contrast. The quiet makes the noise louder.

### Sensory Rotation

Do not default to visual. Rotate through:
- **Sound**: Crack of powers, radio static, auditory exclusion (ringing silence after a blast), the voice that cuts through
- **Touch/proprioception**: Jar of impact, wrongness of a limb, vibration through a floor, the weight of gear
- **Interoception**: Heartbeat in ears, stomach lurch, adrenaline taste (metallic), hands that won't stop shaking
- **Smell**: Blood (copper), chemicals, ozone from powers. Max once per scene. Never paired with metaphor
- **Taste**: Bitten cheek, bile, dust, dryness of fear

## Step 5: Post-Draft Verification

### Battle Checklist (from battle-craft-reference.md)

**Setup:**
- [ ] Terrain established through character perception before action starts
- [ ] Plan laid out so reader knows what SHOULD happen
- [ ] Each named character has an assigned role and one signature combat behavior
- [ ] Complications seeded (equipment, nerves, intel gaps)
- [ ] Emotional and tactical stakes clear

**Execution:**
- [ ] First contact: plan works briefly, establishing competence
- [ ] The break: one cascading failure, detail density maximizes
- [ ] Prose physically changes shape (compression ladder engaged)
- [ ] Sensory rotation (not just visual)
- [ ] POV limitations respected (can't see everything; fog of war as feature)
- [ ] Violence escalates through the battle (budgeted, not front-loaded)
- [ ] 1-2 quiet moments for contrast
- [ ] Character moments distributed (2-3 major beats, 3-4 minor, rest implied)

**The Turn:**
- [ ] Character-driven, not luck or deus ex machina
- [ ] Costs something irreplaceable
- [ ] Feels surprising AND inevitable

**Aftermath:**
- [ ] Silence after noise
- [ ] Cost made specific (names, personal consequences, what's lost beyond the person)
- [ ] Physiological crash rendered (not skipped)
- [ ] Character change visible
- [ ] Seeds next conflict

### Author Notes

Append to the draft file:

```markdown
---

## Author Notes for Editing Phase
- **Voice compression**: [Did the ladder engage? Note any flat spots where compression stalled]
- **Spatial clarity**: [Any moments where the reader might lose the map]
- **Pacing concerns**: [Where did oscillation break down? Any stretches at one register too long?]
- **Violence budget**: [What was spent? What remains for the arc?]
- **Aftermath weight**: [Sufficient? Or rushed?]
- **Beats hit**: [List any planned beats modified or skipped, with reasons]
- **Continuity flags**: [Injuries, deaths, environmental damage to track forward]
- **Word count**: [total]
```

## Step 6: Produce the (draft) File

Write the file:
`{paths.arcs}/arc-N-name/X.X Title (draft).md`

Structure:
```markdown
# X.X [Title]

[Full prose draft with scene breaks marked by --- or * * *]

---

## Author Notes for Editing Phase
[Notes from Step 5]
```

## Step 7: Suggest Next Step

Draft complete. Recommend: `/scribe:edit scene [X.X]` for structural review, with particular attention to spatial clarity, compression ladder consistency, and aftermath weight.

Update `scribe.local.md` with `pipeline_stage: edit-1` and note that this is a battle chapter (editing passes should load `battle-craft-reference.md`).
