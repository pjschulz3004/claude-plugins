---
name: brief
description: "Synthesize cross-domain data into a natural-language briefing. Combines calendar, email, budget, todos, and files."
---

# Briefing Synthesis Skill

Gathers data from all five tool domains and synthesises a cross-domain briefing. Priority-ordered, not domain-ordered. Lead with what matters most.

## Step 1: Load Voice Reference

Read `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md`. Apply tone rules throughout: specific names/times/amounts, no filler, dry wit welcome if natural, plain text (no markdown in output).

## Step 2: Gather Data

Call all sources in sequence. Record what each returns.

**Calendar (today's events):**
Call `mcp__jarvis-calendar__list_events` for today. Note: event times, summaries, locations, attendees. Flag anything starting within 2 hours.

**Todos (pending items):**
Call `mcp__jarvis-calendar__list_todos` for pending items. Note: overdue todos (due date < today), high-priority items. Count total.

**Email (unread):**
Call `mcp__jarvis-email__list_unread` with limit 10. Count total unread. Note subjects flagged as action_required. Note any from senders who appear on today's calendar.

**Budget (category health):**
Call `mcp__jarvis-budget__get_categories`. Note: categories at 90%+ spend, total remaining budget, any recently exceeded limits. Skip categories with no activity.

**Files (inbox):**
Call `mcp__jarvis-files__list_inbox`. Count pending files. Note any filenames that suggest urgent invoices or time-sensitive documents.

## Step 3: Cross-Reference

Find connections before writing. Look for:

- Calendar attendees who also appear in unread email: "You have a meeting with [name] at [time] — there's an unread email from them about [subject]"
- Invoice emails that relate to an overspent budget category: "Invoice from [vendor] for [amount] — your [category] has [remaining] left this month"
- Overdue todos on a light calendar day: "Quiet afternoon — good time to tackle [todo]"
- Files in inbox that relate to today's meetings or action-required emails

Note each connection found. These are the most valuable lines in the briefing.

## Step 4: Synthesise

Write the briefing. Structure by priority, not by domain.

Rules:
- Lead with the single most urgent or important item
- Group connected items together (cross-domain connections read as one item)
- Be specific: "3 unread emails, 1 from Sarah about the contract" not "some unread emails"
- Include counts: "4 calendar events today", "2 overdue todos", "budget 94% spent on dining"
- End with a light observation if appropriate — if everything is quiet, say so briefly with dry wit. Never force it.
- Target 10-20 lines total
- Plain text only. No bullet points unless structure genuinely helps. No markdown headings.

**Morning briefing emphasis:** today's schedule, urgent emails, budget health

**Evening summary emphasis:** today's spending, what got done, tomorrow's calendar

## Output Example

```
Two things need your attention today.

Sarah emailed about the contract review deadline — she needs a decision by Friday. You also have a meeting with her at 14:00; the email arrived this morning, so she may bring it up.

Hetzner invoice landed in the inbox (€4.51). Your infrastructure budget is at 87% for the month, so you're fine.

Otherwise: 3 meetings today (9:00 standup, 11:00 design review, 14:00 Sarah), 2 newsletters archived, nothing else urgent.

The overdue "update portfolio site" todo has been sitting there for 9 days. Your afternoon is clear.
```
