---
phase: 04-telegram
plan: 02
subsystem: jarvis-daemon
tags: [notification, quiet-hours, telegram, scheduler]
dependency_graph:
  requires: [04-01]
  provides: [notify-channel, quiet-hours, proactive-notifications]
  affects: [jarvis-daemon, scheduler]
tech_stack:
  added: []
  patterns: [interface-based-abstraction, promise-allSettled, intl-timezone]
key_files:
  created:
    - packages/jarvis-daemon/src/notify.ts
    - packages/jarvis-daemon/src/notify.test.ts
  modified:
    - packages/jarvis-daemon/src/scheduler.ts
    - packages/jarvis-daemon/src/main.ts
decisions:
  - "NotifyChannel interface with send(text) contract -- adding channels requires no dispatcher changes"
  - "Quiet hours via Intl.DateTimeFormat for timezone-safe hour extraction (no external deps)"
  - "Task failures are urgent (bypass quiet hours); successes are non-urgent"
  - "Scheduler restructured in main.ts: bot created before scheduler so TelegramChannel can be wired in"
metrics:
  duration: 3min
  completed: "2026-03-31T14:10:24Z"
  tasks: 2
  files: 4
---

# Phase 4 Plan 2: Notification Abstraction Summary

Pluggable notification system with quiet hours enforcement, wired into the scheduler for proactive task result delivery via Telegram.

## What Was Built

### NotifyChannel Interface + TelegramChannel (notify.ts)

- `NotifyChannel` interface: `{ name: string; send(text: string): Promise<void> }` -- any new channel (email, webhook) implements this without touching dispatcher
- `TelegramChannel`: wraps `bot.telegram.sendMessage` with `splitMessage` for long messages; swallows errors to avoid crashing daemon
- `isQuietHours(now?, timezone?)`: checks 23:00-07:00 in Europe/Berlin using `Intl.DateTimeFormat` -- no external timezone libraries
- `sendNotification(channels, text, opts?)`: quiet hours suppression for non-urgent, urgent bypass, `Promise.allSettled` for channel isolation

### Scheduler Integration (scheduler.ts + main.ts)

- `SchedulerConfig.notifyChannels` optional field -- backward compatible
- After task success: non-urgent notification with task name + first 500 chars of result
- After task failure: urgent notification with task name + first 300 chars of error (bypasses quiet hours)
- Only triggered when `task.autonomy === "notify"` -- existing tasks without the field default to silent
- `main.ts` restructured: bot created first, then `TelegramChannel` + scheduler initialized with channels

## Test Coverage

14 tests in `notify.test.ts`:
- `isQuietHours`: boundary conditions at 22:59, 23:00, 23:30, 00:00, 06:59, 07:00
- `sendNotification`: suppression during quiet hours, urgent bypass, empty channels no-op, multi-channel delivery, channel failure isolation
- `TelegramChannel`: single message send, long message splitting, error swallowing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file location adjusted**
- **Found during:** Task 1
- **Issue:** Plan specified `packages/jarvis-daemon/tests/notify.test.ts` but vitest config includes `packages/*/src/**/*.test.ts`
- **Fix:** Placed test at `packages/jarvis-daemon/src/notify.test.ts` to match vitest glob
- **Files modified:** packages/jarvis-daemon/src/notify.test.ts

**2. [Rule 2 - Missing functionality] sendNotification needs testable time injection**
- **Found during:** Task 1
- **Issue:** Plan's `sendNotification` signature only takes `{ urgent?: boolean }` -- tests cannot control the clock without mocking globals
- **Fix:** Extended opts to `SendNotificationOpts` with optional `now` and `timezone` fields for deterministic testing
- **Files modified:** packages/jarvis-daemon/src/notify.ts

**3. [Rule 3 - Blocking] Scheduler creation order in main.ts**
- **Found during:** Task 2
- **Issue:** Scheduler was created at module top level before bot; needed bot for TelegramChannel
- **Fix:** Moved scheduler + health server creation into `start()` function after bot initialization
- **Files modified:** packages/jarvis-daemon/src/main.ts

## Known Stubs

None -- all functionality is fully wired.

## Commits

| Task | Commit  | Description                                                |
| ---- | ------- | ---------------------------------------------------------- |
| 1    | 8fdb799 | NotifyChannel interface, TelegramChannel, quiet hours      |
| 2    | 84f6f15 | Wire notifications into scheduler for autonomy=notify      |

## Self-Check: PASSED
