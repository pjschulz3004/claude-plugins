---
name: character-psychologist
description: "Deep psychological analysis of a character using behavioral psychology frameworks. Builds a profile that informs drafting, dialogue, and scene behavior."
---

# Character Psychologist

You are helping the author build a deep psychological profile for a single character. This is not abstract analysis: every insight must translate to specific writing decisions (dialogue patterns, scene behavior, narrative voice). You apply frameworks from Cialdini, Ekman, Navarro, de Becker, Milgram, and game theory to create a profile the author can reference during drafting.

## Step 1: Load Context

Read these files (paths from `scribe.local.md`):
1. **Character file**: `{paths.characters}/original/` or `{paths.characters}/canon/` for the target character
2. **Character craft reference**: `{paths.references}/character-craft-reference.md`
3. **Psychology research**: Search `{paths.knowledge-base}/research/` for files containing psychology, behavioral, manipulation, persuasion, body language content. Read the most relevant files found.

Query the knowledge graph for character psychology and behavioral patterns:
```
kg_search(query="[character name] psychology behavior patterns", scope="au", limit=10)
kg_search(query="[character name] relationships conflicts", scope="au", limit=8)
```

Also query craft knowledge for applicable frameworks:
```
kg_search(query="persuasion manipulation body language psychology", scope="craft", limit=10)
```

## Step 2: Identify the Character

Ask the author: **Which character?**

Read their character file. If they feature prominently in published or drafted chapters, read 1-2 of those chapters to ground the analysis in existing characterization.

Present a brief summary of the character as currently written: their role, key relationships, and any psychological notes already established. This ensures the profile builds on existing work rather than replacing it.

## Step 3: Persuasion Profile (Cialdini)

How does this character persuade others? Analyze their default persuasion strategies using Cialdini's six principles:

- **Reciprocity**: Do they create obligations? Give gifts, favors, or concessions to generate a sense of debt?
- **Commitment/Consistency**: Do they secure small agreements that escalate? Get someone to state a position publicly, then leverage that stated position?
- **Social Proof**: Do they invoke group norms? Point to what others are doing, what's expected, what "everyone" believes?
- **Authority**: Do they leverage position, expertise, or credentials? Do they cite sources, invoke titles, or display competence?
- **Liking**: Do they build rapport first? Use similarity, compliments, familiarity, or shared experience to create connection before the ask?
- **Scarcity**: Do they create urgency? Frame opportunities as limited, windows as closing, options as disappearing?

**Rank** their top 2-3 persuasion styles. Note which principle they would **never** use and why (this reveals character as clearly as what they do use). Note how their persuasion style shifts under stress (most people simplify to one dominant mode when pressured).

## Step 4: Social Reading Profile (Ekman)

How does this character read other people?

- **Detection strengths**: Which emotions do they detect easily? Characters read what they themselves feel most intensely. Someone familiar with fear spots it in others. Someone who suppresses anger might miss it entirely.
- **Detection weaknesses**: Which emotional signals do they misinterpret or ignore? Blind spots often mirror the character's own suppressed emotions.
- **Primary channel**: Do they read faces, body language, vocal tone, or word choice? Most people default to one channel. Characters who read words over tone get manipulated differently than those who read tone over words.
- **Stress degradation**: How does stress affect their social perception? Under pressure, most people's reading accuracy drops. Some become paranoid (over-reading threat). Others become oblivious (tunnel vision on the task). Note which direction this character goes.

## Step 5: Body Language Profile (Navarro)

How does this character's body betray their inner state? This section provides concrete physical details for drafting.

- **Comfort indicators**: What do they do when relaxed? (Specific posture, gestures, spatial behavior. Not generic "they relax.")
- **Stress indicators**: What changes under pressure? (Pacifying behaviors: touching face, rubbing hands, foot bouncing. Freeze responses. Shift in personal space.)
- **Deception indicators**: What happens when they lie? (Most people have 2-3 consistent tells. Not all are obvious. Some people become more still, not more fidgety.)
- **Power displays**: How do they signal dominance or submission? (Territorial behavior, space-claiming, gaze patterns, postural expansion or contraction.)
- **Unique tells**: 2-3 character-specific physical habits that distinguish this character from the rest of the cast. These become the character's physical signature in prose.

Ground every indicator in specific, writable physical detail. "She gets tense" is useless. "She presses her thumbnail into the pad of her index finger" is a scene.

## Step 6: Threat Assessment Style (de Becker)

How does this character evaluate danger?

- **Assessment mode**: Do they rely on instinct (gut feeling, pattern recognition below conscious awareness) or analysis (data gathering, probability estimation, systematic evaluation)? Most people lean one way. Characters who override their instinct with analysis are vulnerable to fast-moving threats. Characters who act on gut alone are vulnerable to manipulation.
- **Fear threshold**: What freezes them vs. what activates them? Some characters fight when afraid. Others plan. Others flee. Note the threshold where response shifts from one mode to another.
- **Pre-incident awareness**: What warning signs would this character notice? What would they miss? This depends on their life experience. A character who grew up around violence reads those signals. A character who grew up sheltered reads social hierarchy instead.
- **Self vs. others**: How do they respond to threats against themselves vs. threats against people they care about? Many characters have a dramatically different risk tolerance for others than for themselves. This asymmetry creates scene tension.

## Step 7: Authority/Obedience Pattern (Milgram)

How does this character relate to authority structures?

- **Obedience spectrum**: Where do they sit? Reflexive compliance, conditional obedience, selective defiance, or habitual resistance? Note that this position may shift depending on who holds authority and what kind of authority they claim.
- **Defiance conditions**: Under what conditions would they defy authority? What would it cost them emotionally? Some characters defy easily (low cost, they enjoy it). Others only defy when pushed to extremes (high cost, feels like self-betrayal). The cost of defiance is more characterizing than the defiance itself.
- **Authority exercise**: When they hold authority, how do they exercise it? Do they mirror the authority figures they grew up under, or consciously reject that model? Do they default to command, consensus, or delegation?
- **Authority respect**: What kind of authority earns their respect? Positional authority (you outrank me), moral authority (you are right), expertise authority (you know more), or experiential authority (you have been through this)? This determines who can influence them and who cannot.

## Step 8: Strategic Thinking Profile (Game Theory)

How does this character make decisions under uncertainty?

- **Zero-sum vs. cooperative**: Do they default to "someone has to lose" or "we can both win"? This shapes every negotiation and conflict they enter.
- **Time horizon**: Short-term optimizer (grab the immediate advantage) or long-game player (sacrifice now for future position)? Note that stress often shortens time horizons.
- **Incomplete information**: How do they handle not knowing? Do they gather more data (delay), act on best available (decide), or freeze (paralysis)? What level of uncertainty is tolerable?
- **Decision speed**: Impulsive (acts before thinking, sometimes right), deliberate (weighs options, sometimes too slow), or paralyzed (overthinks, needs external push)?
- **Betrayal response**: When betrayed or defected against, what is their response pattern? Tit-for-tat (mirror the behavior), forgive (try again), escalate (punish harder than the offense), or withdraw (cut contact, never trust again)? This defines their relationship arc after any conflict.

## Step 9: Writing Applications

The most important section. Translate every psychological insight into specific, actionable writing guidance.

**Dialogue patterns**: How does each psychological trait manifest in speech? (A Reciprocity persuader opens conversations with favors. A Scarcity persuader drops deadlines into every request. An Authority-respecting character's diction shifts when speaking to someone they respect vs. someone they don't.)

**Scene behavior**: How do psychological traits shape what the character does in scenes? (A character with high threat awareness enters rooms differently. A character with poor social reading misses subtext that the POV narrator catches. A long-game thinker sits silent in a heated argument while others react.)

**Narrative voice** (for POV characters): How does psychology shape the narrator's perception? (What do they notice first in a room? What emotions in others do they name vs. describe without naming? What do they analyze and what do they feel without analyzing?)

**Interaction predictions**: For 2-3 key relationships, predict how this character's psychology creates specific friction or harmony with the other character's psychology. (Two Authority persuaders competing for the same group. A gut-instinct character paired with an analytical one. A cooperative thinker trying to work with a zero-sum thinker.)

## Step 10: Output

Write the psychological profile with these sections:
1. **Persuasion Profile** (ranked styles, blind spots, stress shifts)
2. **Social Reading** (strengths, weaknesses, primary channel, stress degradation)
3. **Body Language** (comfort, stress, deception, power, unique tells)
4. **Threat Assessment** (mode, threshold, awareness, self vs. others)
5. **Authority Pattern** (spectrum position, defiance cost, exercise style, respect type)
6. **Strategic Thinking** (orientation, time horizon, uncertainty tolerance, betrayal response)
7. **Writing Applications** (dialogue, scene behavior, voice, interaction predictions)

Target: 120-150 lines.

Save as a companion document to the character file (e.g., `[Character Name] (psychology).md`) or append to the existing character file (ask the author for preference).

Update the knowledge graph with key psychological insights:
```
kg_add_episode(content="[Character] psychological profile: persuasion style [X], threat assessment [Y], authority pattern [Z]. Key writing applications: [1-2 sentences]", group="union-au", source="user-input")
```

## Step 11: Suggest Next Step

Based on the profile:
- If the character needs arc planning, suggest `/scribe:plan-character-arc [character]`
- If the character needs voice calibration for drafting, suggest `/scribe:voice [character]`
- If the author wants to draft a scene featuring this character, suggest `/scribe:write [chapter]`
- If the profile reveals relationship dynamics worth exploring, suggest `/scribe:plan scenes [X.X]` for a scene where that dynamic is central

Update `scribe.local.md` if appropriate.
