---
name: jarvis:briefing
description: Morning briefing — calendar, email highlights, budget status, pending todos
allowed-tools:
  - mcp__jarvis-email__list_unread
  - mcp__jarvis-email__search
  - mcp__jarvis-calendar__list_events
  - mcp__jarvis-calendar__list_todos
  - mcp__jarvis-budget__get_categories
  - mcp__jarvis-budget__get_transactions
  - mcp__jarvis-files__list_inbox
  - Read
---

Deliver a morning briefing across all domains.

1. Read `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` for tone and response structure rules.

2. Gather data in parallel where possible:
   - **Calendar**: today's events via `mcp__jarvis-calendar__list_events` (today's date range)
   - **Todos**: pending/overdue items via `mcp__jarvis-calendar__list_todos`
   - **Email**: unread count and subjects via `mcp__jarvis-email__list_unread` (limit 20)
   - **Budget**: category balances via `mcp__jarvis-budget__get_categories`; flag any at 90%+
   - **Files inbox**: pending files via `mcp__jarvis-files__list_inbox`

3. Synthesise the briefing following `${CLAUDE_PLUGIN_ROOT}/skills/brief/SKILL.md` for the detailed procedure.

   Core rules:
   - Lead with the most time-sensitive item (imminent meeting, overdue action, flagged email)
   - Connect related items across domains (e.g. meeting with X + unread email from X)
   - Be specific: names, times, amounts — never vague summaries
   - Flag anything requiring a decision or action separately at the end
   - Target 10–20 lines total, structured by priority not domain

4. Apply voice rules: no emoji, no filler, no exclamation marks, no apologies.
