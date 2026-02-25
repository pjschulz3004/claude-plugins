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
