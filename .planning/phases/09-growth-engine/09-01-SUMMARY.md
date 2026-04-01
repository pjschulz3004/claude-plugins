---
phase: 09-growth-engine
plan: 01
subsystem: growth
tags: [council, regression, telemetry, growth-engine, self-improvement]

requires:
  - phase: 08-rule-evolution
    provides: RegressionDetector, CorrectionStore, correction rates
provides:
  - Complete growth loop with council review gate after each round
  - Regression detection integrated into growth loop (snapshot before, check after)
  - Enriched reflection prompt with correction rates and improve skill procedure
  - GrowthSessionResult return type for downstream consumption
affects: [09-growth-engine]

tech-stack:
  added: []
  patterns: [injectable-git-exec, maxRounds-for-testability, prompt-enrichment-pattern]

key-files:
  created:
    - packages/jarvis-daemon/src/growth.test.ts
  modified:
    - packages/jarvis-daemon/src/growth.ts
    - packages/jarvis-daemon/src/main.ts

key-decisions:
  - "Used 'failure' status with error field for council rejections and regressions (ledger schema only allows success/failure/skipped)"
  - "Embedded improve skill procedure as const string rather than reading from disk at runtime"
  - "Added maxRounds config option for testable loop termination"

patterns-established:
  - "GitExecFn injection: same pattern as RegressionDetector for shell-safe git operations"
  - "Prompt enrichment: correction rates and skill procedure injected via tagged XML sections"

requirements-completed: [GROW-01, GROW-02, GROW-03, GROW-04, GROW-05, GROW-06, GROW-08]

duration: 6min
completed: 2026-04-01
---

# Phase 9 Plan 1: Growth Engine Council + Regression Integration Summary

**Wired council review and regression detection into the nightly growth loop, with enriched prompt including correction rates and improve skill procedure**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T08:13:43Z
- **Completed:** 2026-04-01T08:20:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Council reviews every growth round that produces a git commit; rejection triggers automatic revert
- RegressionDetector snapshots correction rates before dispatch, checks after commit, reverts on regression
- Reflection prompt now includes 7-day correction rates and the improve skill procedure steps
- Prompt explicitly mandates `npm test` and `npm run build` before committing
- runGrowthLoop returns GrowthSessionResult with round summaries and total cost
- 9 unit tests covering council integration, regression detection, prompt enrichment, and session result

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire council + regression into growth loop and enrich prompt** - `a6f3929` (feat)
2. **Task 2: Wire GrowthConfig in main.ts with corrections + taskNames** - `e9b34c7` (feat)

## Files Created/Modified
- `packages/jarvis-daemon/src/growth.ts` - Complete growth loop with council + regression gates, enriched prompt
- `packages/jarvis-daemon/src/growth.test.ts` - 9 unit tests for growth engine orchestration
- `packages/jarvis-daemon/src/main.ts` - Wired corrections and taskNames into GrowthConfig

## Decisions Made
- Used `failure` status with descriptive error field for council rejections and regressions, since the ledger schema only allows success/failure/skipped
- Embedded the improve skill procedure as a const string in growth.ts rather than reading SKILL.md from disk at runtime, avoiding file path issues inside the claude -p prompt
- Added optional `maxRounds` config field so tests can limit loop iterations without mocking time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used failure status instead of rejected/reverted for ledger records**
- **Found during:** Task 1 (build step)
- **Issue:** Plan specified `status: "rejected"` and `status: "reverted"` but ledger CHECK constraint only allows success/failure/skipped
- **Fix:** Used `status: "failure"` with descriptive error field: `council_rejected: ...` or `regression_reverted: ...`
- **Files modified:** packages/jarvis-daemon/src/growth.ts
- **Verification:** `npm run build` passes clean
- **Committed in:** a6f3929 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor adaptation to existing schema constraints. No scope creep.

## Issues Encountered
- Pre-existing test failures in 7 test files (better-sqlite3 native module issues) -- not related to this plan's changes

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- Growth loop is fully operational with quality gates
- Ready for 09-02: backlog seeding and growth log formatting

---
*Phase: 09-growth-engine*
*Completed: 2026-04-01*
