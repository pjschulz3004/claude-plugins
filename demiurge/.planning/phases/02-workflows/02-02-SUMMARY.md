---
phase: 02-workflows
plan: 02
subsystem: forge-discipline
tags: [workflow, decomposition, discipline, agent-routing, 1-shot-test]
dependency_graph:
  requires:
    - forge.local.md (Phase 01 — state schema)
    - .planning/config.json (forge_discipline flag)
    - ~/.claude/agents/forge-backend.md
    - ~/.claude/agents/forge-frontend.md
    - ~/.claude/agents/forge-designer.md
    - ~/.claude/agents/forge-tester.md
    - ~/.claude/get-shit-done/templates/forge-decomposition.md
  provides:
    - ~/.claude/get-shit-done/workflows/forge-discipline.md
  affects:
    - forge-autonomous.md (calls this as discipline wrapper before each phase)
    - GSD execute-phase (wrapped by this workflow when forge_discipline=true)
tech_stack:
  added: []
  patterns:
    - GSD workflow XML structure (<purpose>, <process>, <step>, <success_criteria>)
    - python3 regex replace for forge.local.md state updates (preserves YAML structure)
    - AskUserQuestion gates for interactive 1-shot test
key_files:
  created:
    - ~/.claude/get-shit-done/workflows/forge-discipline.md
  modified:
    - .planning/STATE.md
decisions:
  - "forge_discipline check is first operation — exits silently (not with error) when false so forge-autonomous can call unconditionally"
  - "Layer identification is text-analysis of phase goal, not hardcoded per-phase rules"
  - "Ordering check is ADVISORY not BLOCKING — already-planned phases proceed regardless"
  - "forge.local.md updates use python3 regex replace pattern to preserve YAML frontmatter structure"
  - "1-shot test result offers tech debt logging path, not forced blocking — discipline without obstruction"
metrics:
  duration_seconds: 157
  completed_date: "2026-03-27T18:07:18Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 02: forge-discipline.md Workflow Summary

**One-liner:** Forge decomposition discipline wrapper for GSD execute-phase — reads forge_discipline flag, identifies L1-L5 layers from phase goal text, routes to specialist agents (forge-backend for L1-3, forge-frontend+designer for L4, forge-tester for L5), and runs interactive 1-shot foundation test between phases.

## What Was Built

`~/.claude/get-shit-done/workflows/forge-discipline.md` — a 605-line GSD-native workflow that wraps GSD's execute-phase with Forge's decomposition discipline. New file synthesized from Forge principles (no direct source skill to adapt).

### Workflow Structure

5 steps:
1. **check_flag** — reads forge_discipline from .planning/config.json; exits silently if false (allows unconditional invocation by forge-autonomous)
2. **identify_layers** — text-analyzes phase goal to determine which L1-L5 layers are relevant; displays analysis table; updates forge.local.md current_layer
3. **enforce_ordering** — scans plan file task names for ordering inversions (UI before types, E2E before logic); displays PASS/ADVISORY result; never blocks
4. **spawn_agents** — routes to forge-backend (L1-3), forge-frontend+forge-designer (L4), forge-tester (L5) based on layer relevance; increments agent_xp and layers_complete in forge.local.md after each agent
5. **one_shot_test** — interactive AskUserQuestion gate: user describes a feature to add, workflow attempts it in one prompt and assesses across L1-L5 dimensions; ADVISORY surfaces tech debt option; PASS sets integration_tested=true in forge.local.md

### Requirements Satisfied

- **WF-03:** forge_discipline flag check at entry; layer identification from phase goal text
- **WF-04:** types-first ordering enforcement (advisory check on plan task names)
- **WF-05:** specialist agent routing by layer with XP tracking
- **WF-06:** 1-shot prompt test with AskUserQuestion gates

## Deviations from Plan

None — plan executed exactly as written.

The workflow structure matches the full specification in the plan task action section. All behavioral rules encoded:
- Silent exit when forge_discipline=false
- Text-analysis layer identification (no hardcoded per-phase rules)
- Advisory ordering (not blocking)
- Full phase context passed to agents (plan file content)
- python3 regex replace for forge.local.md state updates
- Interactive 1-shot test with per-dimension assessment table

## Known Stubs

None. This is a workflow file (Markdown instructions for Claude), not application code. No data flows or rendering paths.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write forge-discipline.md workflow | 99e7c63 | ~/.claude/get-shit-done/workflows/forge-discipline.md |

## Self-Check

Checks run post-creation:

- `test -f ~/.claude/get-shit-done/workflows/forge-discipline.md` → PASS
- `grep -q "forge_discipline"` → PASS
- `grep -qE 'step name="identify_layers"'` → PASS
- `grep -q "forge-backend"` → PASS
- `grep -q "forge-frontend"` → PASS
- `grep -q "forge-tester"` → PASS
- `grep -qi "1-shot"` → PASS
- `grep -q "agent_xp"` → PASS
- `grep -c "forge.local.md"` → 36 (requirement: >= 3)
- `grep -q "<purpose>"` → PASS
- `grep -q "<success_criteria>"` → PASS
- `wc -l` → 605 (requirement: >= 120)
