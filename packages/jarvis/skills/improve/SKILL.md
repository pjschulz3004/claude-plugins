---
name: improve
description: "Nightly growth cycle. Self-reflects against mission, reviews performance, picks one improvement from the growth backlog, implements it, and records the outcome."
---

# Nightly Growth Skill

This skill is invoked by the growth engine during the 01:00-05:00 window. Each round focuses on ONE improvement. The growth engine loops, calling this skill repeatedly with fresh context.

## Philosophy

Jarvis is not a finished product. Every night, while Paul sleeps, Jarvis reviews his own performance, identifies where he fell short of his mission, and works to be better by morning. This is not bug fixing. This is growth.

Read MISSION.md first. Every decision should trace back to: "Does this make Paul's life easier?"

## Round Procedure

### Step 1: Reflect

Read the performance data provided in the prompt. Ask yourself:
- What went well today? (successful tasks, good triage decisions, useful briefings)
- What fell short? (failures, timeouts, misclassifications, empty results)
- What's missing entirely? (things Paul asked for that I couldn't do, patterns I should have noticed)
- What does my mission say I should be doing that I'm not?

Write 2-3 sentences of honest reflection. Not a report — a genuine assessment.

### Step 2: Pick

Read GROWTH_BACKLOG.md. Pick the highest-priority queued item. If nothing fits or the backlog is empty, generate a new item based on your reflection.

Types of improvements (in priority order):
1. **fix**: Something is broken and failing. Fix the root cause.
2. **tune**: Something works but could work better. Adjust prompts, config, thresholds.
3. **expand**: An existing capability needs broader coverage. New rules, new patterns.
4. **new-tool**: A genuinely new capability that serves the mission. New MCP tool, new skill, new heartbeat task.
5. **research**: Don't know the best approach yet. Use WebSearch to find best practices, then decide.

### Step 3: Act

Implement the improvement. Be concrete:

**For prompt/config changes (heartbeat.yaml):**
- Read the current prompt
- Identify what's wrong (too ambitious, wrong model, missing context, bad structure)
- Edit with surgical precision
- The daemon will pick up yaml changes on next task fire (no restart needed for prompt changes)

**For rule file updates (email-rules.md, budget-rules.md):**
- Follow the 6-dimension analysis from the original improve skill (below)
- Only add rules with evidence (2+ observations for budget, 1+ for email)
- Never delete existing rules — only add or correct

**For TypeScript code changes:**
- Edit the source file
- Run `npm run build` to verify compilation
- Run `npm test` to verify no regressions
- Only commit if both pass
- The daemon needs a restart for code changes (note this in the log — Paul or the next growth session can restart)

**For new tools or skills (markdown):**
- Create the file following existing patterns
- No build/restart needed for markdown plugins

**For things too big to implement tonight:**
- Create a GitHub issue with a detailed spec:
  ```bash
  gh issue create --repo pjschulz3004/claude-plugins \
    --title "Jarvis Growth: [clear title]" \
    --body "[what, why, how, acceptance criteria]" \
    --label "jarvis,growth"
  ```
- Mark the backlog item as `filed-as-issue` with the issue URL

### Step 4: Commit

If you made file changes:
```bash
cd [repo root]
git add -A
git commit -m "growth(YYYY-MM-DD): [brief description of what improved]"
```

Only commit if tests pass. If tests fail, revert your changes and log the failure.

### Step 5: Record

Update GROWTH_BACKLOG.md:
- Mark the item you worked on as `done` (add completion date)
- Add any NEW items you discovered while working (with appropriate priority)

Update GROWTH_LOG.md:
- Add an entry for this round with: what you reflected on, what you did, what you committed

### Step 6: Identify Next

Before finishing, scan for the next improvement opportunity. If you notice something during your work that could be better, add it to GROWTH_BACKLOG.md. The next round will pick it up.

## The 6-Dimension Analysis (for rule file updates)

When the growth round involves updating rules, use these analysis dimensions:

### Dimension 1: Task Performance
Query the task ledger for anomalies: >30% failure rate, >2x average duration, >50% empty results. Log as observations.

### Dimension 2: Email Triage Corrections
Check if emails were moved to different folders after triage classified them. Each move is a correction signal. Extract sender, current folder, expected folder.

### Dimension 3: Budget Categorisation Corrections
Check if YNAB transactions were recategorised after the budget agent categorised them. Each recategorisation is a correction signal. Extract payee, current category, expected category.

### Dimension 4: Telegram Conversation Patterns
Scan chat history for recurring questions (3+ times in 7 days). Each pattern is a candidate for proactive automation.

### Dimension 5: Apply Rule Changes
Update email-rules.md and budget-rules.md with evidence from Dimensions 2-3. Preserve all existing content. Add or correct, never delete.

### Dimension 6: Summary
Compile a natural-language summary following jarvis-voice.md tone. Lead with count, group by type, be specific.
