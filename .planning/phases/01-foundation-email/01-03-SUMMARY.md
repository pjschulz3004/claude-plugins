---
phase: 01-foundation-email
plan: 03
subsystem: daemon
tags: [croner, better-sqlite3, circuit-breaker, scheduler, health-endpoint, claude-cli]

requires:
  - phase: 01-foundation-email/01
    provides: "@jarvis/shared types, CircuitBreaker, npm workspaces"
provides:
  - "TaskLedger: SQLite-backed task run recording with WAL mode"
  - "BreakerManager: per-service circuit breaker wrapper"
  - "Dispatcher: claude CLI dispatch with JSON parsing, jitter, timeout"
  - "Scheduler: croner-based heartbeat.yaml reader with breaker integration"
  - "HealthServer: HTTP /health endpoint with breaker states and last runs"
  - "main.ts: daemon entry point with SIGTERM/SIGINT graceful shutdown"
affects: [jarvis-daemon, telegram, orchestrator]

tech-stack:
  added: [croner, yaml, better-sqlite3, node:http]
  patterns: [dependency-injection-for-testing, connection-per-operation-sqlite, jitter-dispatch]

key-files:
  created:
    - packages/jarvis-daemon/package.json
    - packages/jarvis-daemon/tsconfig.json
    - packages/jarvis-daemon/heartbeat.yaml
    - packages/jarvis-daemon/src/main.ts
    - packages/jarvis-daemon/src/scheduler.ts
    - packages/jarvis-daemon/src/dispatcher.ts
    - packages/jarvis-daemon/src/health.ts
    - packages/jarvis-daemon/src/state/ledger.ts
    - packages/jarvis-daemon/src/state/breakers.ts
  modified: []

key-decisions:
  - "Dispatcher uses constructor-injected exec function for testability (avoids mocking node:child_process directly)"
  - "Scheduler exposes fireTask() for direct invocation by tests and future on-demand dispatch"
  - "HealthServer accepts taskNames callback to dynamically resolve task list from scheduler"

patterns-established:
  - "Dependency injection via constructor for testable daemon components"
  - "Jitter on all claude -p dispatches to avoid rate limit bursts (DAEMON-09)"
  - "WAL mode enabled on all SQLite databases (Pitfall 8)"
  - "JSON extraction fallback for claude -p output (Pitfall 4)"

requirements-completed: [DAEMON-01, DAEMON-02, DAEMON-03, DAEMON-04, DAEMON-05, DAEMON-06, DAEMON-07, DAEMON-08, DAEMON-09]

duration: 6min
completed: 2026-03-31
---

# Phase 1 Plan 3: Daemon Core Summary

**Croner scheduler, claude CLI dispatcher with jitter, SQLite task ledger, per-service circuit breakers, /health endpoint, and SIGTERM graceful shutdown**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T12:21:49Z
- **Completed:** 2026-03-31T12:28:03Z
- **Tasks:** 2
- **Files created:** 14 (9 source + 5 test)

## Accomplishments
- Full daemon skeleton: scheduler reads heartbeat.yaml, dispatches via claude CLI, records outcomes in SQLite
- Circuit breakers per service prevent cascading failures (3 consecutive failures trips)
- Health endpoint at /health returns JSON with uptime, breaker states, and most recent run per task
- 36 tests across 5 test files covering all daemon modules
- Graceful shutdown on SIGTERM/SIGINT stops scheduler, closes health server, closes database

## Task Commits

Each task was committed atomically:

1. **Task 1: Ledger, breakers, dispatcher, and scheduler** - `0015e55` (feat) - TDD: 32 tests
2. **Task 2: Health endpoint and main.ts wiring** - `381440a` (feat) - 4 health tests

## Files Created/Modified
- `packages/jarvis-daemon/package.json` - Package manifest with croner, better-sqlite3, yaml deps
- `packages/jarvis-daemon/tsconfig.json` - TypeScript config referencing jarvis-shared
- `packages/jarvis-daemon/heartbeat.yaml` - Declarative task schedule (email_triage hourly 7-23)
- `packages/jarvis-daemon/src/state/ledger.ts` - SQLite task run recording with WAL mode, pruning
- `packages/jarvis-daemon/src/state/breakers.ts` - Per-service CircuitBreaker manager
- `packages/jarvis-daemon/src/dispatcher.ts` - claude CLI dispatch with JSON parsing and jitter
- `packages/jarvis-daemon/src/scheduler.ts` - Croner-based heartbeat.yaml parser with breaker checks
- `packages/jarvis-daemon/src/health.ts` - HTTP /health endpoint via node:http
- `packages/jarvis-daemon/src/main.ts` - Daemon entry point with graceful shutdown

## Decisions Made
- **Dispatcher uses DI for exec function:** Instead of mocking `node:child_process` in tests, the Dispatcher accepts an optional `execFn` in its constructor. Default uses `execFile` (no shell injection). Tests inject a mock. Cleaner and avoids issues with module-level mocking.
- **Scheduler exposes `fireTask()` publicly:** Enables direct invocation for tests and future on-demand dispatch (e.g., from Telegram commands).
- **HealthServer uses `taskNames` callback:** Dynamically resolves task list from the scheduler rather than hardcoding, so it stays in sync as heartbeat.yaml evolves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript operator precedence in health.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** `this.config.port ?? Number(process.env.JARVIS_HEALTH_PORT) || 3333` fails TS strict mode: cannot mix `??` and `||` without parentheses
- **Fix:** Added parentheses: `this.config.port ?? (Number(process.env.JARVIS_HEALTH_PORT) || 3333)`
- **Files modified:** packages/jarvis-daemon/src/health.ts
- **Committed in:** 381440a

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial syntax fix. No scope change.

## Issues Encountered
- Pre-existing type errors in `packages/jarvis-email/src/mcp-server.ts` prevent `tsc --build` from root. The `ToolResult` interface lacks an index signature the MCP SDK requires. Logged to `deferred-items.md`. Daemon builds independently via `tsc --build packages/jarvis-daemon`.

## Known Stubs
None. All components are fully wired. The daemon can start and serve /health. Dispatch will fail without `claude` CLI available, which is expected (daemon runs on VPS where Claude Code is installed).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Daemon skeleton is complete and ready for Telegram bot integration (Phase 4)
- Scheduler/dispatcher pattern established for adding more heartbeat tasks
- Health endpoint ready for Uptime Kuma monitoring

## Self-Check: PASSED

- All 16 key files verified present (9 src + 6 dist + 1 summary)
- Both task commits verified on VPS: `0015e55`, `381440a`
- 36 tests passing across 5 test files
- Daemon builds independently via `tsc --build packages/jarvis-daemon`

---
*Phase: 01-foundation-email*
*Completed: 2026-03-31*
