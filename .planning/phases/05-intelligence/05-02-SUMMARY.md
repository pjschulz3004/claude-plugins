---
phase: 05-intelligence
plan: 02
subsystem: orchestrator
tags: [self-improvement, learning-loop, rule-evolution, nightly-agent]

requires:
  - phase: 03-orchestrator
    provides: "email-rules.md and budget-rules.md rule files, triage skill pattern"
  - phase: 04-telegram
    provides: "chat_messages SQLite table, task ledger, notification channel"
provides:
  - "6-dimension self-improvement skill (improve/SKILL.md)"
  - "Improve agent definition (improve-agent.md)"
  - "self_improve heartbeat task at 03:30 nightly"
  - "memory_consolidation heartbeat placeholder at 03:00"
affects: [05-intelligence, email-rules, budget-rules]

tech-stack:
  added: []
  patterns: [evidence-based-rule-evolution, conservative-thresholds, observation-vs-action-separation]

key-files:
  created:
    - packages/jarvis/skills/improve/SKILL.md
    - packages/jarvis/agents/improve-agent.md
  modified:
    - packages/jarvis-daemon/heartbeat.yaml

key-decisions:
  - "1+ email corrections trigger new sender rule; 2+ budget observations required for payee rules (email corrections are higher signal)"
  - "Dimensions 1 and 4 (task performance, Telegram patterns) produce observations only -- no auto-modification of configs"
  - "Rule files are append/correct only -- improve agent never deletes existing rules"
  - "memory_consolidation is a placeholder task for plan 05-03 (Neo4j KG)"

patterns-established:
  - "Observation vs action separation: Dimensions 1-4 collect evidence, Dimension 5 applies changes, Dimension 6 reports"
  - "Conservative rule evolution: different confidence thresholds per domain based on signal quality"
  - "Graceful degradation: each dimension skips independently if its data source is unavailable"

requirements-completed: [INTEL-03, INTEL-04, INTEL-05]

duration: 3min
completed: 2026-03-31
---

# Phase 5 Plan 2: Self-Improvement Summary

**6-dimension nightly learning cycle analysing task performance, email/budget corrections, Telegram patterns, evolving rule files, and reporting changes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T14:22:49Z
- **Completed:** 2026-03-31T14:25:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Comprehensive improve skill covering all 6 analysis dimensions with specific SQL queries, MCP tool calls, and decision criteria
- Improve agent with conservative constraints (no rule deletion, evidence thresholds, no config modification)
- Heartbeat wiring: self_improve at 03:30 (15 turns, 5min timeout, all plugin dirs) and memory_consolidation placeholder at 03:00

## Task Commits

Each task was committed atomically:

1. **Task 1: Create comprehensive self-improvement skill** - `7b5b2e0` (feat)
2. **Task 2: Create improve agent and wire heartbeat task** - `2cc1f15` (feat)

## Files Created/Modified
- `packages/jarvis/skills/improve/SKILL.md` - 6-dimension self-improvement procedure (task perf, email corrections, budget corrections, Telegram patterns, rule updates, summary)
- `packages/jarvis/agents/improve-agent.md` - Agent frontmatter (sonnet, email+budget+Read+Write tools, purple) with conservative constraints and graceful error handling
- `packages/jarvis-daemon/heartbeat.yaml` - Added self_improve (03:30, notify, 15 turns) and memory_consolidation (03:00, full, 5 turns) tasks

## Decisions Made
- Email corrections require only 1 instance to create a sender rule (high-signal: Paul explicitly moved the email)
- Budget payee rules require 2+ observations with same category (avoid one-off noise)
- Task performance and Telegram pattern dimensions are observation-only -- they report to Paul but never auto-modify configs
- Rule file updates are append/correct only -- the improve agent never deletes existing rules
- memory_consolidation is a placeholder for plan 05-03 (Neo4j knowledge graph integration)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all artifacts are complete markdown specifications ready for runtime execution.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Self-improvement skill and agent ready for nightly execution once daemon is deployed
- memory_consolidation placeholder awaits plan 05-03 (knowledge graph) for full implementation
- Rule files (email-rules.md, budget-rules.md) are live and will evolve as the improve agent runs

---
*Phase: 05-intelligence*
*Completed: 2026-03-31*
