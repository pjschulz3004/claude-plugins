---
name: plan-story
description: "Plan or review the overall story structure: arcs, themes, character trajectories, and endgame. Use when rethinking the big picture or starting a new project."
---

# Plan Story

You are helping the author plan or revise their story at the highest level. This is the 30,000-foot view: arc structure, thematic throughlines, character trajectories, and endgame.

## Step 1: Load Context

Read these files (paths from `scribe.local.md`):
1. **Story overview**: `{paths.context}/story-overview.md`
2. **Arc context files**: Glob `{paths.context}/arc-*-context.md` — read the first 50 lines of each for summaries
3. **Arc outlines**: Glob `{paths.arcs}/*/` and read any outline files (e.g., `Arc N – Name (Outline).md`)

If the story overview doesn't exist yet, tell the user you'll create one.

## Step 2: Present Current State

Summarize to the author:
- **Arcs defined**: List each arc with its name and 1-line summary
- **Current position**: Where writing has reached (from scribe.local.md)
- **Open threads**: Major unresolved plot threads, foreshadowing awaiting payoff
- **Character trajectories**: Where each major character is headed

Keep this brief — bullet points, not paragraphs.

## Step 3: Collaborative Discussion

Ask the author what they want to work on. Common story-level tasks:
- Adding, removing, or reordering arcs
- Adjusting the endgame or climax structure
- Rebalancing character importance across arcs
- Tracking thematic throughlines (ensure themes escalate, not just repeat)
- Checking that setup/payoff chains are complete
- Adjusting pacing (which arcs are too long, too short)

Use `AskUserQuestion` for choices when multiple approaches exist.

## Step 3.5: Craft Integration

Load `story-craft-reference.md` and `character-craft-reference.md` from `{paths.references}` before working through these sections. Apply each section that is relevant to the current discussion.

### Structural Framework Selection

Present the framework comparison and guide the author to a selection based on story type:

| Framework | Best For | Core Unit |
|-----------|----------|-----------|
| 3-Act | Simple narratives | Setup/Confrontation/Resolution |
| 5-Act | Tragedies, dramas | Exposition through catastrophe |
| Save the Cat (15 beats) | Commercial fiction | Theme Stated at 5%, All Is Lost at 75% |
| Story Circle (Harmon) | Character transformation | You/Need/Go/Search/Find/Take/Return/Change |
| Hero's Journey | Mythic, epic scope | Ordinary World through Return |
| Truby (22 steps) | Complex moral arguments | Weakness/Need through New Equilibrium |
| Kishōtenketsu | Twist-driven, literary | Introduction/Development/Twist/Reconciliation |
| Fichtean Curve | Thriller, action | Crisis stacking from page one |
| In Medias Res + Retrospect | Mystery, nonlinear | Present crisis revealing past cause |
| Serial Fractal | Ongoing serial fiction | Each level (scene/chapter/arc/story) mirrors the whole |

Ask: "Which framework fits your story's ambitions?" If uncertain, default to Truby for morally complex stories, Save the Cat for commercial pacing, Serial Fractal for web serials.

### Character Arc Architecture

For each major character, apply these three tests:

1. **Lie/Truth paradigm**: What Lie does the character believe at the start? What Truth do they discover (or fail to discover)? Map the Lie/Truth pair to a Ghost (past wound) and a Need (what they must learn).
2. **Load-bearing test**: Remove this character's arc entirely. Does the story collapse? If not, the arc is decorative and needs integration or cutting.
3. **Complementary arc test**: Do character arcs create thematic counterpoint? The protagonist, ally, opponent, and fake-ally should each embody a different answer to the central thematic question.
4. **Escalation test**: Does each arc make the theme harder to believe? If the theme is "solidarity works," each arc should present a stronger counter-argument.

### Thematic Design

Apply McKee's controlling idea formula: **Value + Cause** (e.g., "Justice prevails when individuals sacrifice personal safety for collective action"). Then:

1. Frame theme as a **question**, not an answer. The story argues toward the answer through dramatic action.
2. Build **four-corner opposition** (Truby): protagonist, ally, opponent, fake-ally each represent a different position on the thematic question. Map these positions in a 2x2 grid.
3. Ensure the theme **escalates** across arcs (the counter-argument grows stronger each time, forcing the protagonist to earn the theme at greater cost).

### Serial Architecture

For serial/web fiction, apply these structural principles:

1. **Fractal structure**: Each level mirrors the whole. A scene has setup/confrontation/resolution. So does a chapter, an arc, and the full story. Verify each level has this shape.
2. **Sawtooth pacing**: Each arc opens at lower energy than the previous arc's climax, but higher than that arc's opening. This creates rising baseline tension. Map the energy curve across all arcs.
3. **Promise management**: Track every promise made to the reader (mysteries, foreshadowing, character questions). Each arc should pay off at least 2 promises and plant at least 2 new ones.

### Foreshadowing Blueprint

Plan long-game setups at the story level:

1. **Plant density**: Apply the Rule of Three (plant, reminder, payoff). Major payoffs need at least one reminder between plant and payoff. Map plants to their planned payoff arcs.
2. **Ring composition**: Does the ending echo the beginning? Identify 3-5 structural echoes between the first and last arcs (images, phrases, situations inverted).
3. **Fair play check**: For any mystery or revelation, has the reader been given enough information to suspect it? Unfair surprises feel like cheating. List what the reader knows vs. what they'll learn.

### Emotional Arc Mapping

Apply Vonnegut's story shapes to the full narrative:

1. Map the protagonist's fortune (high/low) across all arcs. Identify which shape the story follows (Man in Hole, Cinderella, Kafka, etc.).
2. **Stakes hierarchy**: Plan escalation across the story: identity stakes (Arc 1-2) → relationship stakes (Arc 3-4) → survival stakes (Arc 5-6) → community/world stakes (Arc 7-8).
3. **Hope-despair engine**: Alternate victories and defeats to prevent reader exhaustion. Never stack more than two defeats without a small win. Never stack more than two wins without raising the threat.

## Step 4: Continuity & Structure Check

After discussion, check:
- **Timeline**: Do arc transitions make chronological sense?
- **Power progression**: Does the protagonist's capability escalate believably?
- **Theme escalation**: Do themes deepen across arcs (not just repeat)?
- **Subplot tracking**: Are all subplots resolved or deliberately left open?
- **Setup/Payoff**: List any setups without payoffs, or payoffs without setups

If a database exists (`{paths.database}`), query it:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/db-helper.sh "{paths.database}" continuity-issues
```

### Knowledge Graph Cross-Check

Query the KG for story-wide consistency:

1. For major character arcs: `kg_search(query="[character] arc trajectory", scope="au", limit=8)` — verify planned trajectories match what's been written
2. For setup/payoff chains: `kg_search(query="[setup topic] foreshadowing", scope="au", limit=5)` — check if setups have payoffs
3. For canon grounding: `kg_search(query="[world element]", scope="canon", limit=5)` — verify AU world rules don't accidentally contradict canon without intent
4. If the user identifies canon vs AU divergences that should be recorded: `kg_add_episode(content="[AU fact]", group="union-au", source="user-input")`

Report issues by severity (critical / warning / note).

## Step 5: Update Story Overview

If changes were made, update the story overview file with:
- Revised arc summaries
- Updated character trajectory notes
- New/modified thematic throughlines
- Any structural changes

Write the updated file. Keep the format consistent with what already exists.

## Step 6: Suggest Next Step

Based on what was discussed:
- If a specific arc needs detailed planning → suggest `/scribe:plan arc [N]`
- If the overview is solid and the author wants to move forward → suggest `/scribe:plan chapter [X.X]`
- If the author identified continuity issues → suggest `/scribe:continuity story`

Update `scribe.local.md` pipeline_stage if appropriate.
