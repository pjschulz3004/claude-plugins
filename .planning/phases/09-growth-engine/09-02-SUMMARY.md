---
phase: 09-growth-engine
plan: 02
subsystem: daemon
tags: [growth-engine, github-issues, backlog, morning-summary, notifications]

requires:
  - phase: 09-01
    provides: "Growth loop with council review, regression detection, and GrowthSessionResult"
provides:
  - "Enhanced growth prompt with explicit GitHub issue creation instructions"
  - "Backlog self-maintenance instructions with P1-P4 priority format"
  - "compileMorningSummary function for readable morning notifications"
affects: [10-smart-scheduling, 11-knowledge-extraction, 12-proactive-assistant]

tech-stack:
  added: []
  patterns:
    - "Prompt instruction sections (GITHUB ISSUES, BACKLOG MAINTENANCE) as structured blocks"
    - "compileMorningSummary as pure function on GrowthSessionResult"

key-files:
  created: []
  modified:
    - packages/jarvis-daemon/src/growth.ts
    - packages/jarvis-daemon/src/growth.test.ts

key-decisions:
  - "GitHub issue instructions embedded in prompt with explicit gh CLI command and flags"
  - "Backlog priorities use P1-P4 scale matching existing Jarvis priority conventions"
  - "Morning summary always sent (even for zero rounds) to confirm session ran"

patterns-established:
  - "Growth prompt uses named sections (GITHUB ISSUES, BACKLOG MAINTENANCE) for scannable instructions"

requirements-completed: [GROW-07, GROW-09, GROW-10]

duration: 2min
completed: 2026-04-01
---

# Phase 9 Plan 02: Growth Engine - GH Issues, Backlog Maintenance, Morning Summary

**Enhanced growth prompt with explicit GitHub issue creation, P1-P4 backlog self-maintenance, and compileMorningSummary for structured morning notifications**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T08:22:11Z
- **Completed:** 2026-04-01T08:24:04Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Growth prompt now has explicit GITHUB ISSUES section with full `gh issue create` command, flags, and workflow
- Growth prompt now has BACKLOG MAINTENANCE section with P1-P4 priority and type taxonomy
- Added `filed-as-issue` instruction so backlog items link to their GitHub issues
- Added `compileMorningSummary` pure function that formats GrowthSessionResult into readable notification
- Morning summary notification now uses compileMorningSummary (always sends, even for zero rounds)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `87622fd` (test)
2. **Task 1 (GREEN): Implementation** - `55c0b9c` (feat)

## Files Created/Modified
- `packages/jarvis-daemon/src/growth.ts` - Enhanced prompt sections, added compileMorningSummary, updated runGrowthLoop summary
- `packages/jarvis-daemon/src/growth.test.ts` - 5 new tests for GH issue instructions, backlog maintenance, filed-as-issue, and morning summary

## Decisions Made
- GitHub issue instructions are embedded directly in the prompt (not a separate file) to keep the claude -p session self-contained
- Backlog priorities use P1-P4 scale to match existing Jarvis conventions
- compileMorningSummary always sends a notification even for zero rounds so Paul knows the session ran

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Growth engine now has all three core behaviors: loop execution (09-01), issue filing + backlog maintenance + morning summary (09-02)
- Ready for Phase 10+ features that depend on the growth engine as execution environment

---
*Phase: 09-growth-engine*
*Completed: 2026-04-01*
