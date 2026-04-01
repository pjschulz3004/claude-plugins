---
phase: 07-stabilise-instrument
plan: 03
subsystem: telemetry
tags: [corrections, detection, learning, cron, telegram]

requires:
  - phase: 07-01
    provides: "decision_summary column in task_runs, email triage JSON format"
  - phase: 07-02
    provides: "CorrectionStore with recordCorrection() and rollingCorrectionRate()"
provides:
  - "detectEmailCorrections() comparing triage decisions to current email state"
  - "detectBudgetCorrections() comparing auto-categorisation to current YNAB categories"
  - "Rolling correction rates in /status command (7d/30d)"
  - "Periodic correction detection cron (every 2h, 07:00-23:00)"
affects: [08-rule-regression, 09-growth-engine]

tech-stack:
  added: []
  patterns: ["dependency-injected detection functions with lookup callbacks"]

key-files:
  created:
    - packages/jarvis-daemon/src/state/corrections.ts
    - packages/jarvis-daemon/src/state/corrections.test.ts
  modified:
    - packages/jarvis-daemon/src/main.ts
    - packages/jarvis-daemon/src/telegram.ts

key-decisions:
  - "Lookup functions as simple callbacks rather than full backend interfaces for testability"
  - "Email/budget lookups stubbed as undefined until IMAP getMessageFlags and YNAB getTransaction are implemented"

patterns-established:
  - "Detection-via-comparison: query logged decisions, compare to current world state, record delta"
  - "Callback injection for external service lookups (emailLookup, budgetLookup)"

requirements-completed: [TEL-02, TEL-05]

duration: 3min
completed: 2026-04-01
---

# Phase 7 Plan 3: Correction Detection Summary

**Email and budget correction detection comparing Jarvis decisions to current world state, with rolling rates in /status**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T07:47:50Z
- **Completed:** 2026-04-01T07:52:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- detectEmailCorrections() compares triage action (TRASH/IMPORTANT/NEWSLETTER/INVOICE) to current email folder/flags
- detectBudgetCorrections() compares auto-assigned category to current YNAB category
- 8 TDD tests covering empty data, matching state, and correction scenarios
- /status command shows 7d/30d rolling correction rates per task type
- Correction detection scheduled every 2 hours during waking hours

## Task Commits

Each task was committed atomically:

1. **Task 1: RED + GREEN -- Email and budget correction detection** - `72e713a` (feat)
2. **Task 2: Wire correction detection into daemon + /status** - `46fd3d1` (feat)

## Files Created/Modified
- `packages/jarvis-daemon/src/state/corrections.ts` - Detection functions with DI for email/budget lookups
- `packages/jarvis-daemon/src/state/corrections.test.ts` - 8 tests covering all detection scenarios
- `packages/jarvis-daemon/src/main.ts` - CorrectionStore construction, detection cron job
- `packages/jarvis-daemon/src/telegram.ts` - Rolling correction rates in /status, CorrectionStore in TelegramConfig

## Decisions Made
- Used simple callback functions `(uid) => Promise<{folder, flags}>` and `(id) => Promise<{category_name}>` rather than full backend classes -- keeps detection logic pure and easily testable
- Email/budget lookups are currently undefined (stubs) until IMAP getMessageFlags and YNAB getTransaction methods are implemented -- detection logic is correct and tested, just needs real data sources wired in later

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `packages/jarvis-daemon/src/main.ts` | ~170 | `emailLookup = undefined` | IMAP backend lacks getMessageFlags method; will produce 0 corrections until wired |
| `packages/jarvis-daemon/src/main.ts` | ~175 | `budgetLookup = undefined` | YNAB backend lacks getTransaction method; will produce 0 corrections until wired |

These stubs are intentional and documented -- detection functions gracefully return 0 when lookups are undefined. Real wiring depends on extending the email and budget backends with per-message/transaction query methods.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Correction detection infrastructure complete -- 07-stabilise-instrument phase done
- Ready for Phase 8 (rule + regression) which will consume correction data to build learning rules
- Email/budget lookup wiring is a natural follow-up when those backends gain per-item query methods

---
*Phase: 07-stabilise-instrument*
*Completed: 2026-04-01*
