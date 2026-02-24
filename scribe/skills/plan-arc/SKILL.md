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
