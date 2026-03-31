# Phase 4: Telegram + Notifications - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Add Telegram bot to the daemon: 7 slash commands, free-text relay through `claude -p`, notification abstraction with quiet hours, auth middleware, and long message splitting.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All choices at Claude's discretion. Key points:
- Use telegraf library (battle-tested, handler-based)
- Telegram bot code lives in packages/jarvis-daemon/src/telegram.ts and notify.ts
- Free-text relay: build prompt with chat history, call claude -p, parse response
- Chat history stored in SQLite (reuse the daemon's better-sqlite3 DB)
- Auth middleware: check message.chat.id against JARVIS_TELEGRAM_CHAT_ID
- Quiet hours: 23:00-07:00 Europe/Berlin, suppress non-urgent
- Long messages: split at paragraph boundaries, 4000 char Telegram limit
- Second bot token for shadow mode (TG-07) — just document the env var, don't implement dual-bot logic yet

### From Python Jarvis to preserve
- 7 commands: /start, /status, /inbox, /today, /budget, /tasks, /history
- Simple slash commands can call tool backends directly (no claude -p needed for /inbox, /status)
- Free-text goes through claude -p with conversation history
- Voice transcription not in scope (deferred to v2)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- packages/jarvis-daemon/src/ — scheduler, dispatcher, ledger, breakers, health already exist
- packages/jarvis-daemon/src/main.ts — needs wiring for telegram bot startup
- @jarvis/shared — credentials, circuit breaker
- All tool backends available as workspace imports

### Integration Points
- main.ts: start telegram bot alongside scheduler and health server
- notify.ts: called by dispatcher after task completion (already has a notification hook point)
- Daemon already has graceful shutdown — telegram bot.stop() needs adding

</code_context>

<specifics>
## Specific Ideas

PITFALL from research: Telegram 409 Conflict when two bots use same token. For shadow mode (Phase 6), need second bot token. For now, just use JARVIS_TELEGRAM_BOT_TOKEN.

PITFALL: Telegraf default error handler kills the process. Must override with logging-only handler.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
