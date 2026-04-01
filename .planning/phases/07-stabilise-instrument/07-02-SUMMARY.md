---
phase: 07-stabilise-instrument
plan: 02
subsystem: database
tags: [sqlite, better-sqlite3, telemetry, correction-events, tdd]

requires:
  - phase: 05-intelligence
    provides: TaskLedger with SQLite database and task_runs table
provides:
  - CorrectionStore class with recordCorrection(), getCorrections(), rollingCorrectionRate()
  - correction_events SQLite table with index on (task_name, corrected_at)
  - CorrectionEvent interface
affects: [07-stabilise-instrument, 08-rules-regression, 09-growth-engine]

tech-stack:
  added: []
  patterns: [shared-database-instance, rolling-rate-computation]

key-files:
  created:
    - packages/jarvis-daemon/src/state/telemetry.ts
    - packages/jarvis-daemon/src/state/telemetry.test.ts
  modified: []

key-decisions:
  - "CorrectionStore takes Database instance via constructor (same shared-DB pattern as ChatHistory)"
  - "Rolling rate uses corrections/decisions ratio with zero-division guard"
  - "decision_summary column already present in task_runs (added by 07-01), no ALTER TABLE needed"

patterns-established:
  - "Telemetry store pattern: separate class sharing TaskLedger.database, own table + index"
  - "Rolling rate computation: COUNT ratio with configurable day window and zero-guard"

requirements-completed: [TEL-01, TEL-03, TEL-04]

duration: 3min
completed: 2026-04-01
---

# Phase 7 Plan 02: Telemetry Foundation Summary

**correction_events SQLite table with CorrectionStore providing insert, filtered query, and rolling correction rate computation via better-sqlite3**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T07:42:32Z
- **Completed:** 2026-04-01T07:45:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- correction_events table created alongside task_runs in shared SQLite database
- CorrectionStore with recordCorrection(), getCorrections(), and rollingCorrectionRate()
- 8 tests covering table creation, insert, filtered/unfiltered queries, 7-day and 30-day rolling rates, and division-by-zero edge cases
- All 231 project tests pass, TypeScript compiles clean, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: CorrectionStore RED -- failing tests** - `0119550` (test)
2. **Task 2: CorrectionStore GREEN -- implementation** - `9d53e7e` (feat)

## Files Created/Modified
- `packages/jarvis-daemon/src/state/telemetry.ts` - CorrectionStore class and CorrectionEvent interface
- `packages/jarvis-daemon/src/state/telemetry.test.ts` - 8 vitest tests for full CRUD and rolling rates

## Decisions Made
- CorrectionStore accepts Database.Database via constructor, following the ChatHistory shared-DB pattern from main.ts
- Rolling correction rate computed as corrections/decisions ratio over configurable day window, returning 0 when no decisions exist (avoids division by zero)
- decision_summary column was already present in task_runs schema (added by parallel plan 07-01), so test setup needed no ALTER TABLE

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unnecessary ALTER TABLE in test setup**
- **Found during:** Task 1 (RED phase)
- **Issue:** Plan assumed decision_summary column needed adding via ALTER TABLE in test setup, but 07-01 already added it to the CREATE TABLE schema in ledger.ts
- **Fix:** Removed the ALTER TABLE statement from beforeEach -- column already exists at table creation time
- **Files modified:** packages/jarvis-daemon/src/state/telemetry.test.ts
- **Verification:** All 8 tests run without SQLite "duplicate column" error
- **Committed in:** 0119550 (Task 1 commit)

**2. [Rule 3 - Blocking] Rebuilt better-sqlite3 native module**
- **Found during:** Task 1 (RED phase)
- **Issue:** ERR_DLOPEN_FAILED for better-sqlite3.node -- local workstation had stale native bindings
- **Fix:** Ran npm rebuild better-sqlite3
- **Files modified:** None (binary rebuild only)
- **Verification:** All tests execute properly after rebuild

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CorrectionStore ready for plan 07-03 to wire actual correction detection
- Rolling rate queries ready for Phase 8+ intelligence features
- Shared database pattern established for future telemetry stores

## Self-Check: PASSED

- [x] telemetry.ts exists
- [x] telemetry.test.ts exists
- [x] 07-02-SUMMARY.md exists
- [x] Commit 0119550 (RED) verified in git log
- [x] Commit 9d53e7e (GREEN) verified in git log
- [x] All 231 tests pass
- [x] TypeScript compiles clean
- [x] Build succeeds

---
*Phase: 07-stabilise-instrument*
*Completed: 2026-04-01*
