---
name: forge-shape
description: This skill should be used when the user runs "forge shape", "start building features", "execute the plan", or when the IGNITE phase is complete and it's time to build. Wraps GSD for execution while enforcing decomposition discipline and quality loops.
version: 0.1.0
---

# Forge SHAPE — Execution Phase

IGNITE provided the foundation. SHAPE builds on it using GSD for structured execution with forge's discipline layer on top.

## Entry

1. Read `forge.local.md` — verify IGNITE is complete (all gates passed)
2. If IGNITE is not complete, explain which gates remain and invoke `forge-ignite`
3. If this is the first SHAPE entry, proceed to GSD Handoff

## GSD Handoff

Invoke `/gsd:new-project` with context from IGNITE:
- Project description from `ignite.speak_summary`
- Architecture approach from `ignite.approach_chosen`
- Data model and function signatures from the IGNITE output
- Acceptance criteria from Layer 5

GSD will create a roadmap with phases. After roadmap creation, update `forge.local.md`: set `shape.gsd_project` to the project name.

## Per-Phase Discipline

For each GSD phase, enforce the decomposition order:

### Before Phase Execution
1. Read the phase plan
2. Identify which decomposition layers this phase touches
3. Ensure tasks are ordered: data model → pure logic → edge → UI → integration

### During Phase Execution
Use specialist agents based on the layer:
- **Layer 1-2 (data model, pure logic):** Spawn `forge-backend` subagent
- **Layer 3 (edge logic):** Spawn `forge-backend` subagent with boundary focus
- **Layer 4 (UI):** Spawn `forge-frontend` + `forge-designer` subagents
- **Layer 5 (integration):** Spawn `forge-tester` subagent for E2E

If agent teams are enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`):
- Create a team with relevant specialists for the phase
- Backend and frontend can coordinate directly on API contracts
- Tester runs alongside implementation

If agent teams are not available:
- Use subagents sequentially
- Main session coordinates results between specialists

### After Phase Execution
1. Invoke ralph-loop skill on the phase output
2. Continue ralph loop iterations until quality passes
3. Run forge health check (see below)
4. Update `forge.local.md`: increment `shape.phases_completed`

## Health Check (Between Phases)

After each GSD phase completes, run the 1-shot prompt test:

1. Identify a small feature or change relevant to the next phase
2. Attempt to implement it in a single prompt
3. If it works cleanly → architecture is holding up, proceed
4. If it fights back → technical debt is accumulating, pause and address

Log the result to `shape.health_checks` in `forge.local.md`:
```yaml
health_checks:
  - phase: 1
    date: "2026-02-22"
    result: pass
    note: "Added API endpoint in 1 shot"
```

If a health check fails:
1. Spawn `forge-researcher` to analyze what went wrong
2. Present findings to user
3. Decide: refactor now or accept the debt (with explicit acknowledgment)

## Phase Transition

When all GSD phases are complete and verified:
1. Update `forge.local.md`: set `phase: TEMPER`
2. Announce: "SHAPE complete. All features built and verified. Transitioning to TEMPER for hardening."
3. Invoke the `forge-temper` skill
