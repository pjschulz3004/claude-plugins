---
name: plan-campaign
description: "Plan a multi-chapter military campaign, gang war, or sustained conflict arc. Maps escalation, force evolution, attrition, morale, coalition dynamics, turning points."
---

# Plan Campaign

You are helping the author plan a sustained conflict that spans multiple chapters. A campaign is not a single battle: it is a sequence of engagements, retreats, escalations, and quiet periods that together form the backbone of an arc or cross multiple arcs.

## Step 1: Identify Target

From the user's argument or `scribe.local.md`, determine which conflict to plan. The user may specify by arc number, faction names, or a general description ("the Empire war" or "Arc 7 campaign").

## Step 2: Load Context

Read these files:
1. **Story overview**: `{paths.context}/story-overview.md`
2. **Relevant arc context(s)**: `{paths.context}/arc-N-*-context.md` for each arc the campaign spans
3. **Relevant arc outline(s)**: `{paths.arcs}/arc-N-*/*Outline*.md`
4. **Character files**: Read character files for all major combatants and commanders (`{paths.characters}/`)

Load references:
5. **Battle craft**: `{paths.references}/battle-craft-reference.md` (coalition warfare section especially)
6. **Story craft**: `{paths.references}/story-craft-reference.md` (escalation and stakes sections)

### Knowledge Graph Lookup

1. For each faction: `kg_search(query="[faction] members powers territory strength", scope="au", limit=8)`
2. For previous conflicts: `kg_search(query="[faction] battles conflicts losses", scope="au", limit=5)`
3. For alliance dynamics: `kg_search(query="[faction A] [faction B] relationship alliance tension", scope="au", limit=5)`
4. Flag any AU divergences from canon. If the user identifies a missing fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

## Step 3: Campaign Overview

Define the campaign's shape:

- **Duration**: How many chapters does this campaign span? Which arc(s)?
- **Geographic scope**: Where does the fighting happen? Multiple fronts or a single theater?
- **Sides/factions**: Who is fighting whom? Are there neutrals who could be pulled in?
- **Central strategic question**: What must each side achieve to win? Victory conditions should be asymmetric (one side wants territory, the other wants survival; one wants to destroy, the other wants to expose).
- **Why a campaign, not a battle?**: What makes this unresolvable in a single engagement? Resources, geography, political complexity, or the impossibility of decisive force?

## Step 4: Force Evolution

Map how each side changes across the campaign's duration:

### Opening Strength vs. Closing Strength
For each faction, track:
- **Personnel**: Numbers, named characters, rank structure
- **Capabilities**: Powers, equipment, intelligence assets
- **Morale**: Cohesion, will to fight, internal dissent
- **Resources**: Territory, supply lines, allies, public support

### Change Vectors
- **Recruitment**: Who joins during the campaign? What pulls them in?
- **Attrition**: Who is lost? To death, injury, defection, exhaustion?
- **Revelation**: Hidden assets revealed (new powers, secret members, outside support). Each revelation should cost something or come at a price.
- **Defection**: Who switches sides, and what do they bring with them?
- **Power creep prevention**: New capabilities must cost something. A faction that gains strength in one dimension should weaken in another. Track this explicitly.

### Morale Arcs
Each faction gets a morale trajectory across the campaign. High morale can mask a weak tactical position; low morale can undermine a strong one. Map:
- Starting morale and its basis (ideology, fear, loyalty, momentum)
- Morale inflection points (victories that inspire, losses that demoralize, betrayals that shatter trust)
- How morale interacts with tactical decisions (desperate gambles, cautious retreats, reckless offensives)

## Step 5: Escalation Architecture

Design the escalation curve across chapters. Each chapter must raise stakes without repeating the TYPE of escalation.

### Three Escalation Tracks (layer these)
1. **Tactical escalation**: Better weapons, new powers deployed, more sophisticated tactics. The arms race.
2. **Moral escalation**: Harder choices, dirtier methods, collateral damage, lines crossed. What the characters are willing to do.
3. **Stakes escalation**: More to lose, more people affected, less room for error. What failure costs.

### Escalation Rules
- Vary the type: if Chapter 1 escalates tactically, Chapter 2 should escalate morally.
- Personal to institutional progression: individual fights in early chapters give way to organizational warfare in later chapters. Small-unit engagements become coordinated operations become full-scale campaigns.
- Identify the "no going back" moment: when does retreat become impossible? This should fall near the campaign's midpoint.
- Map what each escalation costs. Free escalation is cheap drama.

## Step 6: Coalition Dynamics

If the campaign involves alliances (and it almost always does):

### Alliance Stability
- Who is committed to the end? Who is wavering?
- What would cause each ally to break away?
- Who has parallel interests but different motivations?

### Internal Faction Conflicts
Every coalition has fault lines. Map them:
- Leadership disputes (who commands, who advises, who resents)
- Resource disputes (who contributes what, who free-rides)
- Moral disputes (how far is too far, who objects to which methods)
- Strategic disputes (what to attack, when to retreat, who to sacrifice)

### Coordination Spectrum
From `battle-craft-reference.md`: Integration > Coordination > Deconfliction > Parallel Operations. Where does each alliance pair fall on this spectrum at the campaign's start? Where do they end? The gap between levels IS the dramatic tension.

### War Council Scenes
Plan at least 2-3 war council scenes across the campaign:
- Who has authority? Who has influence? Where do those two diverge?
- The map moment: whoever controls the intelligence controls the narrative
- At least one faction must refuse something at each council. That refusal becomes a dramatic question.

## Step 7: Casualty Budget

Plan losses across the full campaign, not concentrated in the climactic battle.

### Major Character Deaths
- Each one must be earned with prior investment (minimum 2-3 scenes establishing what they mean to the story)
- Deaths should serve the campaign's narrative arc, not just shock
- Space them: multiple deaths in one chapter dilute each other
- At least one should be a decision (sacrifice), not just a casualty

### Minor Character Losses
- Accumulate gradually to create weight. The named minor characters from earlier chapters become the casualty list later.
- Track injuries that persist and compound across chapters. A wound from Chapter 2 of the campaign should still matter in Chapter 6.

### The Attrition Tax
Every chapter of the campaign should cost something: personnel, resources, morale, relationships, moral compromises. If a chapter is free, it's not part of the campaign.

### Violence Budget
From `battle-craft-reference.md`: one full-witness death per arc maximum. The rest are implied, fragmented, or offscreen. Escalate depiction through the campaign (early: impacts and injuries; middle: first deaths; late: horror and aftermath).

## Step 8: Turning Points

Identify 2-3 pivotal moments that shift the campaign's trajectory:

- Each turning point should be a **decision**, not just an event. A character chooses, and the campaign changes direction.
- At least one turning point should be a **defeat** that creates the conditions for eventual victory (losing a battle but gaining information, losing territory but gaining allies).
- At least one should come from **inside the coalition** (a faction breaks, a leader falters, a secret is revealed).
- The **final turning point** is the campaign's climax. Plan it as a battle chapter (use `/scribe:plan-scenes` for detailed scene work later).

## Step 9: Pacing Across Chapters

Not every chapter is a battle chapter. Map the chapter-by-chapter rhythm:

### Chapter Types
- **Battle**: Active combat, high compression, visceral stakes
- **Aftermath**: Silence after noise, cost tallied, grief and anger
- **Planning**: War council, strategy, coalition dynamics. Conflict is political, not physical
- **Reconnaissance**: Information gathering, tension from exposure risk
- **Morale**: Character arcs live here. Relationships deepen or fracture under pressure
- **Supply/Logistics**: The practical problems of sustained conflict. Mundane but grounding

### Pacing Rules
- Sawtooth pattern: energy rises through battle, drops in aftermath, rises again from a higher baseline
- Never two battle chapters in a row without an aftermath or planning chapter between them
- Quiet chapters between battles are where character arcs advance. Do not skip them.
- The campaign's emotional climax may not be its tactical climax. Identify both.

## Output Format

Produce a campaign planning document with all sections above. Include a **chapter-by-chapter campaign map** as a table:

| Chapter | Phase | Type | Escalation Level | Key Characters | Campaign Beat |
|---------|-------|------|-------------------|----------------|---------------|
| X.X | Opening | Battle | Tactical | [names] | First engagement; plan works, minor cost |
| X.X | Rising | Aftermath | Moral | [names] | Cost tallied; coalition friction surfaces |
| ... | ... | ... | ... | ... | ... |

Also include:
- Force evolution summary per faction (opening vs. closing strength)
- Casualty budget table (who is lost, when, how)
- Turning point descriptions (the decision, the cost, the consequence)
- Coalition dynamics map (who trusts whom, where the fault lines are)

After completion, suggest next steps:
- For individual battle chapters: `/scribe:plan scenes [X.X]`
- For operation-style chapters: `/scribe:plan operation [X.X]`
- For arc-level revisions: `/scribe:plan arc [N]`

Update `scribe.local.md` with campaign status.
