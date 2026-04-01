---
phase: 02-workflows
plan: 04
subsystem: infra
tags: [forge, autonomous, gsd, workflow, discipline, loop]

# Dependency graph
requires:
  - phase: 02-02
    provides: forge-discipline.md workflow (called before/after each phase in the loop)
  - phase: 02-03
    provides: forge-temper.md and forge-deliver.md workflows (called at end of loop)
provides:
  - forge-autonomous.md at ~/.claude/get-shit-done/workflows/ — Forge-native autonomous GSD phase execution loop
  - Forge discipline injected into every GSD phase via pre-execution Skill(forge-discipline) call
  - Post-execution 1-shot foundation test embedded inline in the loop
  - TEMPER + DELIVER offered after GSD lifecycle completes
affects:
  - phase 03 (commands) — /gsd:forge-autonomous command will invoke this workflow
  - any project using GSD + forge_discipline flag

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Option A autonomous loop pattern: reimplements GSD loop rather than patching it"
    - "Unconditional forge-discipline invocation — self-deactivates via config flag check"
    - "Skill() flat invocation pattern for all GSD commands (never Task())"
    - "Inline 1-shot test avoids re-invoking forge-discipline after execute-phase"
    - "Stall detection: same phase failing twice → automatic handle_blocker escalation"

key-files:
  created:
    - ~/.claude/get-shit-done/workflows/forge-autonomous.md
  modified: []

key-decisions:
  - "1-shot test embedded inline in forge-autonomous.md (not a second forge-discipline invocation) — simpler, cleaner separation of concerns"
  - "forge-discipline called unconditionally before execute-phase — self-deactivates when forge_discipline=false, so forge-autonomous never needs to check the flag itself"
  - "Stall detection threshold is 2 consecutive failures of the same phase — surfaces to handle_blocker automatically"
  - "TEMPER offer is conditional on temper_complete flag in forge.local.md — allows resumption without re-running TEMPER"

patterns-established:
  - "Forge autonomous loop: discuss → plan → forge-discipline → execute → 1-shot test → iterate"
  - "forge.local.md used for cross-phase state tracking (current step, 1-shot test results, tech debt notes)"

requirements-completed: [WF-09]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 2 Plan 4: forge-autonomous.md Summary

**Forge-native autonomous GSD phase execution loop with discipline injection, 1-shot foundation testing, and TEMPER/DELIVER lifecycle at completion**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T18:12:00Z
- **Completed:** 2026-03-27T18:20:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- forge-autonomous.md (871 lines) written to ~/.claude/get-shit-done/workflows/ — the Forge-native autonomous loop
- Reimplements GSD autonomous loop without patching autonomous.md (Option A decision)
- forge-discipline called unconditionally before each phase execution (self-deactivates when flag is false)
- 1-shot foundation test embedded inline after each phase with tech debt logging path
- TEMPER + DELIVER lifecycle offered after all GSD phases complete

## Task Commits

Each task was committed atomically:

1. **Task 1: Write forge-autonomous.md workflow** — no demiurge repo file changed (workflow lives at ~/.claude/get-shit-done/workflows/forge-autonomous.md, outside this repo)

**Plan metadata:** (this SUMMARY.md commit)

## Files Created/Modified
- `~/.claude/get-shit-done/workflows/forge-autonomous.md` — Forge-native autonomous GSD phase execution loop (871 lines)

## Decisions Made
- 1-shot foundation test is embedded inline rather than re-invoking forge-discipline. This keeps concerns separate: forge-discipline handles pre-execution layer analysis and agent routing; the 1-shot test is a post-execution quality gate run by the orchestrator directly.
- forge-discipline is called unconditionally before execute-phase. The discipline workflow checks the config flag itself and exits silently when false. This means forge-autonomous never needs to read the flag — cleaner delegation.
- Stall detection at 2 consecutive failures. If the same phase appears as the failing phase in handle_blocker twice in a row, it auto-escalates rather than presenting the "fix and retry" option indefinitely.
- TEMPER offer conditioned on `temper_complete` in forge.local.md. This handles the resumption case where TEMPER already ran in a prior session.

## Deviations from Plan

None — plan executed exactly as written. The plan provided a detailed structure to produce; all structural elements were implemented: initialize, discover_phases, execute_phase (with 3c forge-discipline pre-execution, 3f 1-shot test), smart_discuss, iterate (with stall detection and forge.local.md updates), lifecycle (with TEMPER/DELIVER offer), and handle_blocker.

The inline 1-shot test approach (rather than re-invoking forge-discipline with `--one-shot-only`) was explicitly noted as the preferred option in the plan: "Alternative: embed the 1-shot test question directly in this workflow instead of re-invoking forge-discipline — this is simpler."

## Issues Encountered

None. All 12 acceptance criteria passed on first verification run (after fixing one false positive in the success_criteria documentation text that accidentally contained the `gsd:autonomous` loop-detection string).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (commands) can now wire `/gsd:forge-autonomous` to invoke this workflow
- forge-autonomous.md depends on forge-discipline.md, forge-temper.md, and forge-deliver.md — all created in Plans 02-03
- The workflow is ready for integration testing once Phase 3 wires the command entry point

## Self-Check: PASSED

- FOUND: ~/.claude/get-shit-done/workflows/forge-autonomous.md (871 lines)
- FOUND: .planning/phases/02-workflows/02-04-SUMMARY.md
- FOUND: commit ea29453 (final metadata commit)
- All 12 acceptance criteria verified: file exists, discipline invocation, execute-phase, plan-phase, no gsd:autonomous calls, forge.local.md reads, handle_blocker, lifecycle steps, TEMPER offer, Skill() pattern, has <purpose>, 871 lines

---
*Phase: 02-workflows*
*Completed: 2026-03-27*
