---
phase: 08-rule-evolution
plan: 02
subsystem: growth-safety
tags: [regression-detection, telemetry, auto-revert, tdd]

requires:
  - phase: 08-01
    provides: RuleStore for structured rule files, CorrectionStore for correction rates
provides:
  - RegressionDetector class with snapshot-compare-revert pattern
  - ExecFn dependency injection for testable git operations
  - GROWTH_LOG.md regression entry format
  - GROWTH_BACKLOG.md revert marking
affects: [09-growth-engine]

tech-stack:
  added: []
  patterns: [snapshot-compare-revert, execFileSync injection, commit hash validation]

key-files:
  created:
    - packages/jarvis-daemon/src/state/regression.ts
    - packages/jarvis-daemon/src/state/regression.test.ts
  modified: []

key-decisions:
  - "ExecFn type for dependency injection allows full git mocking in tests without touching actual repos"
  - "execFileSync (not execSync) prevents shell injection in git revert operations"
  - "Commit hash validated with /^[a-f0-9]{7,40}$/ before any git operation"
  - "Any rate increase (even 0.001) triggers regression — conservative safety net"

patterns-established:
  - "Snapshot-compare-revert: capture rates before growth commit, compare after, auto-revert if worse"
  - "ExecFn injection: default wraps execFileSync, tests inject mock that captures args"

requirements-completed: [REG-01, REG-02, REG-03, REG-04]

duration: 2min
completed: 2026-04-01
---

# Phase 8 Plan 2: Regression Detection Summary

**RegressionDetector class with snapshot-compare-revert pattern: captures correction rates before growth commits, detects increases, auto-reverts bad commits, and logs to GROWTH_LOG.md with backlog marking.**

## What Was Built

`RegressionDetector` class in `packages/jarvis-daemon/src/state/regression.ts` with five methods:

1. **snapshotRates()** - Captures 7-day rolling correction rates per task type from CorrectionStore before a growth commit
2. **checkForRegression(snapshot)** - Re-reads current rates and compares to snapshot; any increase triggers `regressed=true`
3. **revertCommit(hash)** - Validates hash format, runs `git revert --no-edit` via execFileSync, returns revert commit hash
4. **logRegression(result, commitHash, revertHash)** - Appends structured markdown to GROWTH_LOG.md
5. **markBacklogReverted(description, reason)** - Finds and marks items in GROWTH_BACKLOG.md with `[REVERTED: reason]`

## Test Coverage

9 tests covering:
- snapshotRates captures correct rates from CorrectionStore
- checkForRegression detects rate increase (regressed=true)
- checkForRegression with stable/decreased rate (regressed=false)
- revertCommit validates hash format (rejects injection attempts like `foo; rm -rf /`)
- revertCommit constructs correct git args
- logRegression writes correct markdown format
- markBacklogReverted modifies the correct line
- markBacklogReverted handles missing file gracefully
- Full integration: snapshot -> insert corrections -> check -> revert -> log -> mark

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality is fully wired.

## Commits

| Hash | Message |
|------|---------|
| 8041189 | feat(08-02): regression detection with snapshot-compare-revert |

## Self-Check: PASSED
