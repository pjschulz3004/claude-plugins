---
phase: 07-stabilise-instrument
plan: 01
subsystem: daemon
tags: [email-triage, telegram-ux, decision-logging, morning-greeting]
dependency_graph:
  requires: []
  provides: [decision_summary_column, morning_greeting, formatted_telegram_commands]
  affects: [scheduler, telegram, ledger, heartbeat]
tech_stack:
  added: []
  patterns: [relativeTime helper, getTodayEvents extraction, buildMorningSummary export]
key_files:
  created: []
  modified:
    - packages/jarvis-daemon/heartbeat.yaml
    - packages/jarvis-daemon/src/scheduler.ts
    - packages/jarvis-daemon/src/state/ledger.ts
    - packages/jarvis-daemon/src/telegram.ts
    - packages/jarvis-daemon/src/main.ts
    - packages/jarvis-shared/src/types.ts
decisions:
  - EUR currency formatting for /budget (Paul is in Germany)
  - Morning greeting sent as urgent to bypass quiet hours filter
  - relativeTime helper exported for reuse across modules
metrics:
  duration: 178s
  completed: "2026-04-01T07:45:53Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
---

# Phase 7 Plan 1: Email Triage Fix + Telegram UX Polish Summary

Fixed email triage prompt to request structured JSON decisions and added decision_summary column to ledger for per-email tracking. Polished all Telegram slash commands with EUR formatting, relative timestamps, /morning greeting, and contextual error messages in free-text relay.

## Task Results

### Task 1: Fix email triage prompt + add per-email decision logging
**Commit:** `0be1695`
**Files:** heartbeat.yaml, types.ts, ledger.ts, scheduler.ts

- heartbeat.yaml: Added JSON decision output instruction to email_triage prompt (no plugin-dir references exist)
- types.ts: Added `decision_summary?: string` to LedgerEntry interface and LedgerEntrySchema
- ledger.ts: Added `decision_summary TEXT` column to CREATE_TABLE_SQL, migration-safe ALTER TABLE for existing DBs, updated INSERT and all SELECT queries
- scheduler.ts: After successful dispatch, regex-extracts ```json...``` fenced blocks from result and stores as decision_summary in ledger

### Task 2: Telegram UX -- formatted responses, error handling, /morning command
**Commit:** `e4d34a3`
**Files:** telegram.ts, main.ts

- Added `relativeTime()` helper for human-friendly timestamps ("2h ago", "yesterday")
- Extracted `getTodayEvents()` helper from /today command for reuse
- /budget now formats with EUR currency and "spent X EUR, remaining Y EUR"
- /history now shows relative timestamps instead of raw ISO dates
- /status now shows relative timestamps for recent tasks
- Added /morning command: greeting with date, calendar events, overnight task runs, unread email count
- Exported `buildMorningSummary()` for use by morning cron
- Free-text relay error handler now detects auth (401/OAuth/token expired) and timeout patterns with specific friendly messages
- main.ts: Added 07:30 Europe/Berlin cron that calls buildMorningSummary and sends via notification channels

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: passes (no type errors)
- `npm test`: 230/231 pass (1 pre-existing health test port conflict, unrelated)
- `npm run build`: passes
- `grep plugin-dir heartbeat.yaml`: no matches (clean)
- `grep decision_summary ledger.ts`: 7 matches (column, migration, insert, selects)
- `grep morning telegram.ts`: 6 matches (command, helper, export)

## Known Stubs

None -- all features are fully wired.
