---
phase: 04-telegram
plan: 01
subsystem: jarvis-daemon
tags: [telegram, bot, chat, commands]
dependency_graph:
  requires: [01-03, 02-01, 02-02, 02-04]
  provides: [telegram-bot, chat-history, message-splitting]
  affects: [jarvis-daemon]
tech_stack:
  added: [telegraf]
  patterns: [auth-middleware, message-splitting, conversation-history, graceful-degradation]
key_files:
  created:
    - packages/jarvis-daemon/src/telegram.ts
    - packages/jarvis-daemon/src/state/history.ts
    - packages/jarvis-daemon/src/state/history.test.ts
    - packages/jarvis-daemon/src/telegram.test.ts
  modified:
    - packages/jarvis-daemon/src/main.ts
    - packages/jarvis-daemon/src/state/ledger.ts
    - packages/jarvis-daemon/package.json
    - packages/jarvis-daemon/tsconfig.json
decisions:
  - Tool backends imported directly into daemon for slash commands (avoids claude -p overhead)
  - Optional backend pattern with graceful "service not configured" messages
  - TaskLedger exposes database getter for ChatHistory to share SQLite connection
  - getRecentAll() added to TaskLedger for cross-task ledger queries
metrics:
  duration: 5min
  completed: "2026-03-31T14:05:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 4
---

# Phase 4 Plan 1: Telegram Bot Summary

Telegraf bot with auth middleware, 7 slash commands, free-text relay through claude -p with conversation history, and message splitting at paragraph boundaries.

## What Was Built

### ChatHistory (state/history.ts)
- SQLite table `chat_messages` with chat_id, role, text, created_at
- `record()` stores user/assistant messages
- `getRecent()` returns last N messages in chronological order
- `prune()` keeps only latest N per chat_id using window function

### splitMessage (telegram.ts)
- Splits text at paragraph boundaries (\n\n) respecting 4000 char limit
- Falls back to line boundaries (\n), then hard-cuts
- Adds [1/N] prefix when multiple chunks
- Reserves 10 chars for prefix to prevent over-limit chunks

### Telegram Bot (telegram.ts)
- `createBot(config)` returns configured Telegraf instance
- Auth middleware as first middleware: checks `ctx.chat.id` against `JARVIS_TELEGRAM_CHAT_ID`
- Unauthorized messages silently dropped (no response to avoid revealing bot)
- `bot.catch()` overrides default error handler -- logs but never kills process
- Every command handler wrapped in individual try/catch

### 7 Slash Commands
1. `/start` -- Welcome message
2. `/status` -- Uptime, breaker states, last 5 task runs
3. `/inbox` -- Last 10 unread emails via ImapFlowBackend
4. `/today` -- Today's calendar events via TsdavCalendarBackend
5. `/budget` -- Top 5 categories by activity via YnabBackend
6. `/tasks` -- Pending VTODOs from calendar
7. `/history` -- Last 10 task runs across all task names

### Free-Text Relay
- Records user message in ChatHistory
- Retrieves last 10 messages for context
- Builds prompt with system instruction and conversation history
- Dispatches through `claude -p` via existing Dispatcher
- Records assistant response in ChatHistory
- Sends response through splitMessage

### Daemon Integration (main.ts)
- Bot created with shared TaskLedger database instance
- Tool backends constructed from env vars with graceful fallback
- `bot.launch({ dropPendingUpdates: true })` after health server starts
- `bot.stop(signal)` before ledger.close() on shutdown
- Skips bot entirely if JARVIS_TELEGRAM_BOT_TOKEN not set

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BreakerState enum comparison**
- **Found during:** Task 2 build
- **Issue:** Plan used string literal "half-open" but BreakerState.HALF_OPEN is "half_open"
- **Fix:** Import BreakerState enum and use enum values for comparison
- **Files modified:** packages/jarvis-daemon/src/telegram.ts

**2. [Rule 2 - Missing functionality] getRecentAll for cross-task queries**
- **Found during:** Task 2
- **Issue:** `ledger.getRecent("*", N)` would not match all tasks (WHERE task_name = "?")
- **Fix:** Added `getRecentAll(limit)` method to TaskLedger without task_name filter
- **Files modified:** packages/jarvis-daemon/src/state/ledger.ts

**3. [Rule 2 - Missing functionality] Optional tool backend pattern**
- **Found during:** Task 2
- **Issue:** Plan assumed tool backends always available, but env vars may not be set
- **Fix:** Builder functions return undefined when credentials missing; commands reply with "service not configured"
- **Files modified:** packages/jarvis-daemon/src/telegram.ts, packages/jarvis-daemon/src/main.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 269836b | Chat history table and message splitting utility |
| 2 | e7079a2 | Telegram bot with auth, commands, free-text relay, daemon wiring |

## Known Stubs

None -- all commands are fully wired to real backends (or gracefully degrade when unconfigured).

## Self-Check: PASSED

- All 4 created files exist on disk
- Both commits (269836b, e7079a2) present in git log
- Build passes (`tsc --build` clean)
- All 53 daemon tests pass (7 test files)
