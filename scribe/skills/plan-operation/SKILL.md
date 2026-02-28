---
name: plan-operation
description: "Plan a chapter structured as an operation: heist, raid, infiltration, rescue. Assembly, briefing, execution, deviation, improvisation."
---

# Plan Operation

You are helping the author plan a chapter (or 2-3 chapter sequence) structured as an operation. Operations have a distinctive rhythm: a team assembles, a plan is briefed, execution begins, reality deviates from the plan, and improvisation fills the gap. The structure applies to heists, raids, infiltrations, rescues, sabotage missions, and any coordinated action with a discrete objective.

## Step 1: Identify Target

From the user's argument or `scribe.local.md`, determine which chapter or sequence to plan. The user may specify by chapter number (`3.9`), operation type ("the warehouse raid"), or narrative goal ("the rescue mission").

## Step 2: Load Context

Read these files:
1. **Arc context**: `{paths.context}/arc-N-*-context.md`
2. **Chapter outline** (if exists): check `{paths.arcs}/arc-N-*/` for relevant outline or scene file
3. **Character files**: Read character files for every team member (`{paths.characters}/`)

Load references:
4. **Tension reference**: `{paths.references}/tension-reference.md` (operational pacing section especially)
5. **Battle craft**: `{paths.references}/battle-craft-reference.md` (if combat is expected)

### Knowledge Graph Lookup

1. For the target location: `kg_search(query="[location] layout security defenses", scope="au", limit=8)`
2. For each team member's capabilities: `kg_search(query="[character] powers abilities limitations", scope="au", limit=5)`
3. For the opposition: `kg_search(query="[enemy faction] security patrols response capability", scope="au", limit=5)`
4. For prior operations (to avoid repeating structure): `kg_search(query="operation raid heist mission", scope="au", limit=5)`
5. Flag any missing details. If the user identifies a missing fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

## Step 3: Operation Framework

Define the operation type and its structural skeleton:

### Type Classification
- **Heist**: Objective is to acquire something (information, a person, an object). Stealth preferred. Combat is a sign of failure.
- **Raid**: Objective is to destroy, disable, or seize by force. Speed and violence of action. Combat is the plan.
- **Infiltration**: Objective requires sustained covert presence. Cover identity, social engineering, slow information gathering. Exposure is the primary threat.
- **Rescue**: Objective is a person who must be extracted alive. All the constraints of a raid plus the fragility of the objective.
- **Sabotage**: Objective is to degrade capability without revealing who did it. Stealth in, damage, stealth out.

### Universal Structure
All operation types share five phases:
1. **Assembly**: The team comes together. Motivations beyond the mission surface.
2. **Briefing**: The plan is laid out. Must contain friction (disagreements, doubts, competing priorities).
3. **Execution**: The plan meets reality. Early beats go according to plan, establishing competence.
4. **Deviation**: Something breaks. The plan can no longer be followed.
5. **Resolution**: Improvisation, cost, and consequence.

## Step 4: The Team

### Roster
List every team member and their function:
- **Role**: Lead, specialist, lookout, backup, wild card, liaison
- **Capability**: What can they do that no one else can?
- **Limitation**: What can't they do? What gap does their presence leave?
- **Motivation**: Why are they on this mission beyond being told to? Personal stakes raise investment.

### Team Dynamics
- Who trusts whom? Where are the friction points?
- Who has worked together before? Who hasn't?
- Authority vs. influence: who gives orders, who actually shapes decisions?
- The "Chekhov's Skill": one team member has an ability that seems marginal during assembly. It saves the operation later. Plant it early so it reads as inevitable, not convenient.

### Character Beats
Assign each team member at least one moment during the operation:
- **Major beats** (2-3 per operation): decisions that change the outcome
- **Minor beats** (3-4): moments of competence, fear, humor, or connection
- **Implied** (rest of team): present and contributing without spotlight

## Step 5: The Plan (As Briefed)

### The Step-by-Step
Write the plan as the team understands it:
1. Phase 1 (approach): How do they get to the target?
2. Phase 2 (entry): How do they get in?
3. Phase 3 (objective): What do they do once inside?
4. Phase 4 (extraction): How do they get out?

### Contingencies
- Plan B: what if entry fails?
- Plan C: what if they're detected?
- Emergency extraction: how do they abort?
- Each contingency is a Chekhov's gun. Some fire; some don't. The unfired contingencies build verisimilitude.

### Reader Revelation Strategy
How much of the plan does the reader see in advance?

| Strategy | Reader Knows | Tension Source | Best For |
|----------|-------------|----------------|----------|
| **Full reveal** | Everything | Dramatic irony: reader watches deviations unfold | Heists, complex multi-phase operations |
| **Partial reveal** | The outline, not the trick | Anticipation: reader senses the shape but not the punchline | Raids with a hidden ace |
| **Concealed** | Almost nothing | Surprise: reader discovers the plan as it executes | Short operations, infiltrations, twist endings |

Choose one and note why.

### The Clancy Threshold
From `tension-reference.md`: Too little operational detail and deviations carry no weight. Too much and momentum dies. Triage every detail:
- **Must** (reader needs this to feel the deviation): include
- **Should** (deepens immersion but not essential): include if space allows
- **Could** (interesting but tangential): cut it

## Step 6: The Deviation

This is the heart of the operation chapter. Where and how the plan breaks.

### Deviation Source
The deviation should come from character, not random chance:
- **Bad intelligence**: Someone was wrong about the target. Who, and was it honest error or betrayal?
- **Unexpected opposition**: The enemy did something no one predicted. What and why?
- **Internal failure**: A team member freezes, disobeys, or reveals a hidden agenda. Who and what drives it?
- **Environmental**: The location itself is different from expected (collapsed corridor, moved security, civilian presence). Still grounded in something knowable.

### Deviation Design
- The deviation forces the most interesting character choice. Not "will they survive?" but "what are they willing to sacrifice to succeed?"
- Impact is proportional to how well the reader understood the plan. If the briefing was thorough, the deviation lands hard.
- The deviation should invalidate the plan but not the preparation. Skills established in assembly, relationships forged in briefing: these are the raw materials for improvisation.

### Cascading Failure
From `tension-reference.md` (ratchet technique):
1. One thing goes wrong (manageable)
2. The fix breaks something else (cascading)
3. The new break forces a choice between two bad options (dilemma)
4. The chosen option has unforeseen consequences (escalation)

Each step of the cascade closes off previous options. No going back.

## Step 7: Improvisation

### The Adapted Solution
- Must use established capabilities in new ways (not new capabilities)
- At least one team member's specific skill becomes essential in a way no one predicted
- The solution should be technically legal within established power rules but creatively surprising
- The reader should think "of course" on second read

### Cost of Improvisation
The improvised solution costs something the original plan would not have:
- Time (extraction window shrinks)
- Resources (powers burned, equipment lost)
- Personnel (someone is hurt, left behind, or compromised)
- Information (the enemy learns something about the team)
- Relationships (trust strained by decisions made under pressure)

The cost is what separates an operation chapter from a power fantasy. Plan the cost with the same care as the victory.

## Step 8: Pacing Design

### Ratchet Technique
Within the execution phase, tension only tightens. No full releases until resolution. Small wins punctuate losses (so the reader still believes success is possible), but each respite introduces a worse problem.

### Nested Questions
Stack 3-5 simultaneous dramatic questions during execution:
- Will they get in? (plot)
- Will they be detected? (suspense)
- Will the intel be accurate? (mystery)
- Can they get out? (survival)
- Will the team hold together? (relationship)

Resolve them at different rates. Never drop below 2 active questions.

### Time Pressure
Establish a deadline and make it feel real:
- External clock (patrol schedule, reinforcement arrival, dawn)
- Internal clock (power duration, injury worsening, emotional limit)
- Both clocks should move at different speeds. One runs out before the other.

### Voice Compression
From `tension-reference.md` (compression ladder):
- **Briefing**: Full composed voice. Recursive sentences, parentheticals, analysis.
- **Approach**: Sentences shorten. Theory drops. Observations sharpen.
- **Execution**: Fragments. Sensory data. Verbs without subjects.
- **Deviation/Crisis**: Near-wordless. Single-word reactions. Intellect overwhelmed.
- **Aftermath**: Voice returns shakier, rebuilt but different.

### Intercutting
If multiple sub-teams operate simultaneously, limit to 2 threads maximum. Alternate at natural cliffhanger points. Each thread should be at a different phase of the operation when you cut away (one executing, one deviating; one succeeding, one failing).

## Step 9: Resolution

### Outcome Spectrum
- **Full success** (rare; feels unearned unless the cost was enormous)
- **Partial success with cost** (most satisfying; the objective is achieved but the price changes the characters)
- **Pyrrhic success** (objective achieved, but the cost makes it feel like failure)
- **Failure with gain** (objective missed, but something else was learned or gained)
- **Full failure** (rare in serialized fiction; use only when the failure drives the next arc's engine)

Choose the outcome and note what makes it feel earned.

### Revelation
What did the operation reveal that the characters did not expect?
- About the enemy (capability, motivation, internal fractures)
- About themselves (what they're capable of under pressure, what they're willing to do)
- About the larger situation (the operation's objective may have been a distraction from the real play)

### Aftermath
- Immediate consequences: injuries tallied, equipment lost, cover blown
- Long-term implications: what does the enemy now know? What relationships shifted?
- Character change: who is different after this operation? What can't they undo?

### Seeds
The operation's aftermath should plant at least 2 elements for future chapters:
- A piece of information gained (or lost)
- A relationship altered (strengthened or fractured)
- A capability revealed (the team's or the enemy's)

## Output Format

Produce an operation planning document with all sections above. Include:

### Phase Timeline

| Phase | Duration (chapter %) | Key Beats | Tension Level | Voice Register |
|-------|---------------------|-----------|---------------|----------------|
| Assembly | ~10% | [beats] | Low, building | Composed |
| Briefing | ~15% | [beats] | Medium (friction) | Composed, sharpening |
| Execution | ~25% | [beats] | Rising | Clipped to fragmentary |
| Deviation | ~25% | [beats] | Maximum | Fragmentary to survival |
| Resolution | ~25% | [beats] | Release/reckoning | Numb, rebuilding |

### Also Include
- Team roster with roles and assigned character beats
- The plan as briefed (step-by-step)
- Deviation point(s) and cascading failure sequence
- Improvisation design (what capability, what cost)
- Nested questions list (which resolve when)
- Outcome and its consequences
- Seeds for future chapters

After completion, suggest next steps:
- For detailed scene work: `/scribe:plan scenes [X.X]`
- For beat-by-beat expansion: `/scribe:plan beats [X.X]`
- For the campaign this operation belongs to: `/scribe:plan campaign [description]`

Update `scribe.local.md` with operation status.
