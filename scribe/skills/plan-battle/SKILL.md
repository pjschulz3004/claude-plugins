---
name: plan-battle
description: "Plan a single battle or action chapter: force disposition, spatial map, power interactions, pacing blueprint, casualty plan. Produces a battle plan document."
---

# Plan Battle

You are helping the author plan a battle or action chapter. A battle is a three-act story with an emotional overlay: Approach, Battle (Contact > Break > Turn), Aftermath. This skill produces a comprehensive battle plan that feeds into `/scribe:write battle`.

## Step 1: Identify Target Chapter

From the user's argument or `scribe.local.md`, determine the chapter. Format: `[arc].[chapter]` (e.g., `5.3`).

## Step 2: Load Context

Read these files:
1. **Arc context**: `{paths.context}/arc-N-name-context.md`
2. **Arc outline**: `{paths.arcs}/arc-N-name/Arc N – Name (Outline).md`
3. **Character files**: For ALL combatants (both sides). Powers, limitations, costs, personality under stress
4. **Previous chapter**: The most recent chapter file (scenes/beats/draft) for continuity
5. **Scenes file** (if exists): `{paths.arcs}/arc-N-name/X.X Title (scenes).md`

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/battle-craft-reference.md`
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md`

### Knowledge Graph Lookup

1. For each combatant: `kg_search(query="[character] powers abilities limitations", scope="canon", limit=5)` and `kg_search(query="[character] current state injuries relationships", scope="au", limit=5)`
2. For the location: `kg_search(query="[location] physical layout", scope="au", limit=5)` and `kg_search(query="[location] Brockton Bay", scope="canon", limit=5)`
3. For faction dynamics: `kg_search(query="[faction] tactics strategy resources", scope="au", limit=5)`

## Step 3: Force Disposition

Map all forces. For each side:

- **Combatants**: Named characters with roles (point, support, reserve, command)
- **Powers**: What each power does, what it cannot do, what it costs
- **Resources**: Equipment, position, preparation time, intelligence quality
- **Objectives**: What does this side want? (May differ between members)
- **Morale**: Confidence, cohesion, willingness to take casualties
- **Asymmetries**: Where is each side stronger or weaker? Numerical, tactical, informational, positional

Identify: which side does the reader root for? What does the POV character stand to lose personally (beyond the tactical objective)?

## Step 4: Spatial Map

Define the battlespace through the POV character's experience:

- **Location**: Name, type (street, building, compound, open ground), time of day
- **Terrain features**: Cover, concealment, elevation, chokepoints, fatal funnels
- **Sight lines**: What can be seen from where? Where are blind spots?
- **Movement corridors**: How do people get from A to B? Where are they exposed?
- **Environmental factors**: Weather, lighting, civilians, collateral constraints, noise
- **Escape routes**: For both sides. Cutting off retreat changes everything

Rule: geography through movement. Characters experience space by moving through it. No overhead map descriptions. Subjective landmarks, relative positioning, simplified shapes.

Note how the environment degrades during the fight (fire, collapse, debris, shifted cover).

## Step 5: Three-Phase Battle Arc

Design the battle in three phases:

### Phase 1: Contact (plan works)
- What is the plan? Lay it out so deviations register
- First engagement: brief success establishes competence before destroying it
- Complications already seeded (equipment, nerves, intel gaps, friction)
- What goes right and why (the reader needs to see the plan could have worked)

### Phase 2: The Break (plan fails)
- What single failure cascades? (One domino, not multiple simultaneous problems)
- How does the cascading failure test the protagonist's defining trait?
- Detail MAXIMIZES here. Time slows. This is where the writing earns its weight
- What choices are forced? Each choice must close off a previous option (bridge-burning)

### Phase 3: The Turn (decisive moment)
- Character-driven resolution (not luck, not deus ex machina)
- What does it cost? The cost must be irreplaceable
- Surprising AND inevitable: the reader should not predict it but should recognize it as the only possible outcome
- What changes permanently? Who entered is not who exits

For each phase: concrete events, what goes wrong, which decision matters, emotional register.

## Step 6: Power Interaction Matrix

Map how powers interact across the battle:

- **Synergies**: Which powers amplify each other? (Planned or discovered mid-fight)
- **Counters**: Which powers neutralize which? What workarounds exist?
- **Environmental interactions**: How do powers change the terrain? (Ice on streets, collapsed walls, fires)
- **Unexpected combinations**: Plan at least one "clever use" moment (existing power, new application)

Apply Sanderson's First Law: magic solves problems proportional to reader understanding. The reader must know the rules before the clever moment. Establish, sit in the problem, then solve.

Identify the constraint that creates drama. The power itself is never interesting. The limitation under pressure is the story.

## Step 7: Casualty Plan

- **Who gets hurt**: Names, severity, which phase
- **Escalation curve**: Early (impacts, near-misses), middle (first blood, injuries), late (deaths, horror). Never front-load
- **Violence budget**: One precise, concrete, slightly incongruous detail per major injury. The brain under stress latches onto small, irrelevant things. Choose the mundane detail that becomes permanently associated with the violence
- **Depiction mode per casualty**: Full witness (max 1 per arc, transforms narrator), implied/offscreen (reader imagines worse), fragmented/dissociative (tunnel vision, most realistic for first-person)
- **Aftermath weight**: Equal to or greater than action weight. Bodies don't vanish. Post-combat crash: trembling, nausea, thirst, jumpiness, inappropriate emotions
- **Persistent consequences**: Injuries, losses, and psychological damage that carry into future chapters. Death that matters requires investment before loss (minimum 2-3 prior scenes with the character)

## Step 8: Pacing Blueprint

### Voice Compression Ladder Mapping
Map which compression level operates in each phase:
- **Approach**: Level 1 (composed analysis, full recursive sentences, theory, parentheticals)
- **Contact**: Level 2 (clipped efficiency, shorter sentences, observations sharpen)
- **The Break**: Level 3-4 (sensory fragments, verbs without subjects, near-wordless at peak)
- **Aftermath**: Level 5 to Level 1 (voice rebuilds slowly, shakier, less certain)

### Time Dilation Plan
- Where does time slow? (Crisis decisions, the break point, moments of personal danger)
- Where does time compress? (Routine engagements, movement between positions, clearing rooms)
- Target: 200+ words for a critical half-second decision. 50 words for a standard engagement

### Oscillation Map
Plan alternation points (never >500 words at a single register):
- Action burst (100-200 words) > tactical assessment (50-100 words) > emotional beat (50-100 words)
- Close-in visceral > pull-back tactical > close-in visceral
- Noise > silence > noise

### Quiet Moments (1-2 per battle)
Plan placement for contrast: dark humor, memory flash, noticing shaking hands, a hand on a shoulder, strategic pause. Best placed after first major shock or before the climactic push.

### Sensory Palette
Choose the 2-3 dominant senses for this fight. Plan rotation points. Avoid visual-only combat.
- Sound (powers, radio, auditory exclusion)
- Touch/proprioception (impact, wrongness, vibration)
- Interoception (heartbeat, stomach, adrenaline)
- Smell (max 1 per scene, never with metaphor)

## Step 9: Emotional Overlay

Separate from the tactical arc:

- **Emotional trajectory**: Map the feeling-line through the battle (e.g., dread > confidence > shock > desperation > resolve > hollowness)
- **POV character's personal stakes**: What do they learn, lose, or become?
- **Moment of greatest vulnerability**: Not the moment of greatest physical danger. The moment where the mask slips, the ideology fails, or the cost becomes personal
- **Aftermath emotional state**: How the POV character exits. What haunts them. What they can't unsee

## Step 10: Produce the Battle Plan

Write the battle plan document:

```markdown
# X.X [Title] — Battle Plan

## Force Disposition
[Both sides: combatants, powers, objectives, asymmetries]

## Spatial Map
[Location, terrain, movement, environment]

## Battle Arc
### Phase 1: Contact
[Plan, early success, seeded complications]
### Phase 2: The Break
[Cascading failure, forced choices, time dilation point]
### Phase 3: The Turn
[Character-driven resolution, cost, what changes]

## Power Interactions
[Synergies, counters, clever use moment, key constraint]

## Casualty Plan
[Who, when, how depicted, aftermath weight]

## Pacing Blueprint
[Compression ladder map, time dilation points, oscillation plan, quiet moments, sensory palette]

## Emotional Arc
[Feeling-line, personal stakes, vulnerability moment, exit state]

## Battle Checklist Verification
[15-item checklist from battle-craft-reference.md]
```

Save as: `{paths.arcs}/arc-N-name/X.X Title (battle-plan).md`

## Step 11: Suggest Next Step

- If beats exist: `/scribe:write battle [X.X]` to draft
- If no beats: `/scribe:plan beats [X.X]` to expand the battle plan into beat-level detail
- If scenes file needs updating: `/scribe:plan scenes [X.X]`

Update `scribe.local.md` with `current_chapter` and note that a battle plan exists.
