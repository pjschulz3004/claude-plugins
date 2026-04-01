---
phase: 05-improve-integration
plan: 01
subsystem: infra
tags: [improve, gsd-workflow, rotation-cycle, autopilot, verification]

# Dependency graph
requires:
  - phase: 04-update-survival
    provides: GSD safe-zone patterns established
provides:
  - GSD workflow forge-improve-phase.md that adapts Improve rotation for phase context
  - VERIFICATION.md output format for GSD verifier consumption
  - Scoped category rotation (security,quality default) with hard time gate
affects: [05-improve-integration, 06-plugin-deprecation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hard time gate: REMAINING < 300s forces Phase 2 — non-negotiable constraint"
    - "Autopilot lifecycle: touch .autopilot at Phase 0 start, rm -f .autopilot at Phase 2 end"
    - "In-memory cycle log: CYCLE_LOG array, never written to .improve-log.md"
    - "VERIFICATION.md with YAML frontmatter for machine-readable status: passed|gaps_found"

key-files:
  created:
    - ~/.claude/get-shit-done/workflows/forge-improve-phase.md
  modified: []

key-decisions:
  - "Visual/UI and Feature Creep categories are hard-rejected in GSD phase mode — explicit error message"
  - "Security always runs first regardless of input order when included in categories"
  - "In-memory cycle log only — no .improve-log.md or .improve-research.md created in GSD mode"
  - "REMAINING < 300 (not 600) is the Phase 2 trigger — shorter than standalone /improve to fit 30m default"

patterns-established:
  - "GSD workflow structure: purpose block + required_reading + process steps + success_criteria"
  - "Phase-context-aware improvement: reads .planning/STATE.md and ROADMAP.md before scanning"

requirements-completed: [IMP-02, IMP-03, IMP-04]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 5 Plan 01: Write forge-improve-phase.md Workflow Summary

**GSD-native improvement workflow that runs scoped category rotation (default: security+quality, 30m) and outputs VERIFICATION.md with machine-readable frontmatter status for the GSD verifier**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T10:29:28Z
- **Completed:** 2026-03-28T10:31:52Z
- **Tasks:** 1
- **Files modified:** 1 (forge-improve-phase.md created in GSD safe zone)

## Accomplishments

- Wrote complete forge-improve-phase.md at `~/.claude/get-shit-done/workflows/forge-improve-phase.md`
- Phase 0 implements autopilot enable, argument parsing, GSD context reading, git cleanliness check, project type detection
- Phase 1 runs scoped category rotation with mandatory time gate (REMAINING < 300s → skip to Phase 2), per-cycle Analyse/Fix/Verify/Commit/Log protocol, stall detection, and second rotation on remaining time
- Phase 2 runs final test suite, disables autopilot, and writes VERIFICATION.md with YAML frontmatter
- All differences from standalone `/improve` are preserved: no .improve-log.md, no .improve-research.md, scoped categories, VERIFICATION.md output

## Task Commits

Each task was committed atomically:

1. **Task 1: Write forge-improve-phase.md workflow** - `142c9a0` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `~/.claude/get-shit-done/workflows/forge-improve-phase.md` — Complete GSD-native improvement workflow with three phases (setup, cycles, output)

## Decisions Made

- Hard time gate threshold set to 300s (5 min) rather than standalone's 600s (10 min) — appropriate for 30m default budget
- Visual/UI and Feature Creep are hard-rejected with explicit error at Phase 0, not silently ignored
- Security category is always sorted first regardless of user input order
- CYCLE_LOG is in-memory array (never a file) to enforce GSD-mode discipline
- VERIFICATION.md is the sole output artifact in GSD mode

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- forge-improve-phase.md is ready for Plan 05-02: write the `gsd:improve-phase` command wrapper that invokes this workflow
- No blockers

---
*Phase: 05-improve-integration*
*Completed: 2026-03-28*
