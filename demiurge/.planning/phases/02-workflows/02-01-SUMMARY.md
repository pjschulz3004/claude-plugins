---
phase: 02-workflows
plan: 01
subsystem: workflows
tags: [forge, ignite, gsd-workflow, point-and-call, decomposition, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: forge.local.md schema and forge_discipline config flag
provides:
  - forge-ignite.md GSD workflow file encoding SPEAK → EXPLORE → SHAPE_DOMAIN → FIRST_1000_LINES
  - Point & Call gates at SPEAK, EXPLORE, and FIRST_1000_LINES steps
  - forge.local.md state write pattern (python3 regex-based field updates)
  - gsd:new-project handoff at IGNITE completion
affects:
  - 02-workflows (forge-discipline.md and forge-autonomous.md reference this workflow)
  - Any future GSD projects started via /gsd:forge new

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GSD workflow XML format: <purpose>, <required_reading>, <process>, <success_criteria>"
    - "forge.local.md field updates via python3 regex — preserves full file, modifies specific YAML fields"
    - "Task() invocation for forge-researcher and forge-tester specialist agents"
    - "Skill() invocation for GSD command handoff at phase completion"

key-files:
  created:
    - "~/.claude/get-shit-done/workflows/forge-ignite.md"
  modified: []

key-decisions:
  - "Phase transition at IGNITE completion invokes Skill(skill='gsd:new-project') — not forge-shape — making IGNITE GSD-native"
  - "forge.local.md updates use python3 regex pattern — avoids sed quoting issues, handles multiline YAML safely"
  - "All 5 decomposition layer gates use AskUserQuestion (none auto-approved) — user must review each layer before proceeding"
  - "Layer 4 (UI) is explicitly skippable for API/CLI/library projects"
  - "forge-researcher spawned via Task() agent invocation for codebase exploration"

patterns-established:
  - "Point & Call form: exact commitment phrases ('The system takes [X]...', 'I chose approach [A]...', 'I can add a feature in 1 shot...')"
  - "SHAPE_DOMAIN layer gate pattern: present types/signatures → AskUserQuestion → write health_check → proceed"
  - "State write pattern: python3 regex replacement of individual YAML fields without clobbering full file"

requirements-completed: [WF-01, WF-02]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 02 Plan 01: forge-ignite.md Workflow Summary

**IGNITE phase behavioral script (814 lines) encoding SPEAK → EXPLORE → SHAPE_DOMAIN → FIRST_1000_LINES with Point & Call gates, 5-layer decomposition approval loop, TDD via forge-tester, and gsd:new-project handoff**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T18:04:36Z
- **Completed:** 2026-03-27T18:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `~/.claude/get-shit-done/workflows/forge-ignite.md` — 814 lines, GSD XML workflow format
- All 4 IGNITE steps (speak, explore, shape_domain, first_1000_lines) plus gsd_handoff step present
- All 3 Point & Call gates with exact commitment phrases encoded
- All 5 decomposition layer gates with forge.local.md health_check writes after each approval
- Phase transition invokes `Skill(skill="gsd:new-project")` — not a Forge-internal skill

## Task Commits

Each task was committed atomically:

1. **Task 1: Write forge-ignite.md workflow** - tracked via state update commit (file is outside demiurge git repo at ~/.claude/get-shit-done/workflows/)

**Plan metadata:** committed with docs(02-01) state update

## Files Created/Modified

- `~/.claude/get-shit-done/workflows/forge-ignite.md` — Full IGNITE phase workflow with all 5 steps, Point & Call gates, forge.local.md state writes, forge-researcher and forge-tester Task() spawning, and gsd:new-project Skill() handoff

## Decisions Made

- Used `python3 -c` regex replacement for forge.local.md updates instead of sed — handles multiline YAML safely without quoting hazards
- Layer 4 (UI) made explicitly skippable via AskUserQuestion option — API/CLI projects should not be forced through UI decomposition
- All layer gates block on user approval — no auto-proceeding even for "obvious" layers
- forge-researcher spawned via Task() (not Skill()) since it's an agent, not a GSD command
- Phase transition uses Skill(skill="gsd:new-project") as required by WF-02 — hands control to GSD for project lifecycle

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- forge-ignite.md is installed and satisfies WF-01 (SPEAK → EXPLORE → SHAPE_DOMAIN → FIRST_1000_LINES) and WF-02 (gsd:new-project handoff)
- Remaining plans 02-03 through 02-05 (forge-temper.md, forge-deliver.md, forge-autonomous.md) can proceed independently

## Self-Check

- [x] File exists: `~/.claude/get-shit-done/workflows/forge-ignite.md` (814 lines)
- [x] All 4 steps present: speak, explore, shape_domain, first_1000_lines
- [x] gsd_handoff step present with `Skill(skill="gsd:new-project")`
- [x] Point & Call gates: 3 present (SPEAK, EXPLORE, FIRST_1000_LINES)
- [x] All 5 decomposition layers present with individual AskUserQuestion gates
- [x] forge.local.md state writes present after each step
- [x] forge-researcher spawning present in EXPLORE step
- [x] <purpose> and <success_criteria> sections present

---
*Phase: 02-workflows*
*Completed: 2026-03-27*
