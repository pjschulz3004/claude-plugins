---
name: plan-arc
description: "Plan a specific arc: act structure, character change, setup/payoff, chapter breakdown. Use when designing or revising an arc."
---

# Plan Arc

You are helping the author plan or revise a specific story arc. An arc is a major section of the story (typically 8-15 chapters) with its own internal act structure, character development, and thematic focus.

## Step 1: Identify Target Arc

From the user's argument or `scribe.local.md`, determine which arc to plan. The target may be specified by number (`3`) or name (`Agitprop`).

## Step 2: Load Context

Read these files:
1. **Story overview**: `{paths.context}/story-overview.md`
2. **Target arc context**: `{paths.context}/arc-N-name-context.md`
3. **Target arc outline** (if exists): `{paths.arcs}/arc-N-name/Arc N – Name (Outline).md` or similar
4. **Previous arc context**: `{paths.context}/arc-(N-1)-*-context.md` (for continuity at arc boundaries)
5. **Character files**: Read character files for major characters appearing in this arc (check `{paths.characters}/`)

Do NOT load style guides or prose references — this is structural planning, not prose work.

### Knowledge Graph Lookup

Query the KG for broad character and thematic context:

1. For each major character in the arc: `kg_search(query="[character] full arc trajectory relationships powers", scope="au", limit=8)` and `kg_search(query="[character]", scope="canon", limit=5)` for canon baseline
2. For thematic elements: `kg_search(query="[theme/concept] in Worm", scope="canon", limit=5)` to understand how canon handles similar themes
3. For cross-arc threads: `kg_search(query="[plot thread]", scope="au", limit=5)` to track what's been established in the AU
4. Flag any canon vs AU divergences. If the user identifies a missing AU fact, record it via `kg_add_episode(content="...", group="union-au", source="user-input")`

Use KG results to ground arc planning in established facts and track long-term threads.

## Step 3: Present Arc State

Summarize:
- **Arc premise**: What this arc is about in 2-3 sentences
- **Act structure**: Beginning / Middle / End (or more granular if already planned)
- **Chapters planned**: List with 1-line descriptions
- **Character arcs within this arc**: Who changes, how
- **Key setups**: What this arc establishes for later
- **Key payoffs**: What earlier setups this arc resolves
- **Thematic focus**: The ideas this arc explores

## Step 4: Collaborative Planning

Work with the author on:

### Act Structure
Every arc needs internal structure. Common patterns:
- **3-Act**: Setup (25%) → Confrontation (50%) → Resolution (25%)
- **5-Act**: Exposition → Rising Action → Climax → Falling Action → Resolution
- **Kishōtenketsu**: Introduction → Development → Twist → Reconciliation

### Chapter Breakdown
For each chapter in the arc:
- **Purpose**: What this chapter accomplishes for the arc
- **POV**: Whose perspective (if rotating)
- **Key beats**: 2-3 major events
- **Character state change**: How the protagonist is different at end vs. start

### Setup/Payoff Tracking
- What setups from previous arcs pay off here?
- What new setups does this arc plant for future arcs?
- Are there any dangling threads that need resolution?

### Character Change
- **Entering state**: Where is the protagonist at arc start?
- **Pressure**: What forces change?
- **Midpoint shift**: What changes their understanding?
- **Exiting state**: Where are they at arc end?
- **Relationship shifts**: How do key relationships evolve?

## Step 4.5: Craft Integration

Load `story-craft-reference.md` and `character-craft-reference.md` from `{paths.references}` before working through these sections. Apply each section that is relevant to the current arc.

### Arc Structure Verification

Check the arc against the story's chosen structural framework:

1. **Three-act within the arc**: Does this arc have its own Setup (25%), Confrontation (50%), Resolution (25%)? Map chapter ranges to each act.
2. **Midpoint mirror**: The arc's midpoint should mirror or invert its opening question. If the arc opens with "Can Taylor trust the team?", the midpoint should force a trust/betrayal crisis that reframes the question.
3. **Framework alignment**: Verify this arc hits the beats required by the story-level framework (e.g., if using Save the Cat, which of the 15 beats does this arc contain?).

### Character Arc Pacing

For each character appearing in this arc:

1. **Lie/Truth percentage**: Where in their overall Lie-to-Truth journey are they? (e.g., "Anchor is at 40%: still believes the Lie but cracks are showing.") Map this percentage to specific chapter positions within the arc.
2. **Required beats**: What moments must this arc deliver for the character's overall arc to work? List 2-3 non-negotiable character beats and assign them to chapters.
3. **State delta**: Write one sentence for each character: "[Character] enters this arc [state]. They exit [different state]." If the states are the same, the character is wasted in this arc.

### Foreshadowing Architecture

Build a setup/payoff tracking table for this arc:

| Plant (from earlier) | Payoff (this arc) | Chapter |
|----------------------|-------------------|---------|
| [setup description]  | [how it resolves] | [X.X]   |

| New Plant (this arc) | Intended Payoff (future arc) | Chapter |
|---------------------|------------------------------|---------|
| [setup description]  | [planned resolution]         | [X.X]   |

Every arc should pay off at least 2 earlier plants and establish at least 2 new ones. Flag any dangling threads from previous arcs that need attention.

### Subplot Weaving

Manage active threads for this arc:

1. **Thread count**: 6-11 active threads is ideal. Fewer than 4 feels thin. More than 12 overwhelms. List all active subplots and categorize them:
   - **Primary** (present in most chapters): 1-2 threads
   - **Secondary** (appears every 2-3 chapters): 2-4 threads
   - **Tertiary** (touched 2-3 times in the arc): 2-3 threads
   - **Background** (referenced but not foregrounded): 1-3 threads
2. **Convergence points**: Identify 2-3 chapters where multiple subplots collide (these become the arc's high-pressure moments).
3. **Rotation plan**: No subplot should go dormant for more than 3 consecutive chapters without a brief reference.

### Ensemble Management

Plan screen time across the arc's cast:

1. **Screen time budget**: List every named character who appears. Assign rough percentage of page time. Verify the protagonist gets 40-60% minimum.
2. **Entrances/exits**: Who enters the story in this arc? Space introductions (max 2 new significant characters per arc). Who exits (death, departure, background)?
3. **Introduction curve**: New characters need 2-3 scenes to establish before they can carry dramatic weight. Don't introduce a character and give them a pivotal scene in the same chapter.

### Escalation Planning

Prevent power creep while maintaining rising stakes:

1. **Stakes type shift**: If the previous arc used survival stakes, this arc should shift to relationship or identity stakes (not just "bigger threat"). Map the stakes type for this arc.
2. **Personal-to-institutional**: Individual conflicts in early arcs should give way to systemic/institutional conflicts in later arcs. Where does this arc fall on that spectrum?
3. **Cost accounting**: What did the previous arc cost the protagonist? This arc's opening should reflect that cost. Victories should come at higher prices as the story progresses.

### Thematic Deepening

Ensure the theme grows more complex in this arc:

1. **Counter-argument**: What is the strongest argument against the story's central theme in this arc? The antagonist (or circumstances) should embody this counter-argument. State it in one sentence.
2. **Theme under pressure**: How does this arc make the central theme harder to believe? (e.g., "Solidarity works" is tested when a member betrays the group for personal survival.)
3. **Thematic action**: The theme must be argued through dramatic action, not dialogue or internal monologue. Identify 2-3 scenes where a character's choice (not words) makes the thematic argument.

## Step 5: Cross-Arc Continuity Check

Verify:
- **Previous arc ending** → this arc's opening: smooth transition?
- **Character states**: Do characters enter this arc in the state the previous arc left them?
- **Timeline**: Does the time elapsed make sense?
- **Props/locations**: Anything carried over that needs tracking?
- **Power levels**: Consistent with established capabilities?

If database exists, query character states:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" character-state "[protagonist]"
```

## Step 6: Write/Update Arc Outline

Produce or update the arc outline file at `{paths.arcs}/arc-N-name/`. Include:
- Arc summary (2-3 paragraphs)
- Act structure with chapter assignments
- Chapter list with purposes and key beats
- Character arc summary
- Setup/payoff tracking
- Thematic notes

## Step 7: Update Context File

If the arc context file needs updating, revise `{paths.context}/arc-N-name-context.md` with any new information.

## Step 8: Suggest Next Step

- If chapters need detailed planning → suggest `/scribe:plan chapter [X.X]`
- If another arc needs work → suggest `/scribe:plan arc [N]`
- If the author wants to jump to scenes → suggest `/scribe:plan scenes [X.X]`

Update `scribe.local.md` with `current_arc` and `pipeline_stage: plan-chapter`.
