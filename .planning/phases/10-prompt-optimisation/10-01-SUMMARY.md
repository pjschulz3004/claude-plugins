---
phase: 10-prompt-optimisation
plan: 01
subsystem: jarvis-daemon
tags: [prompt-versioning, a-b-testing, opro, growth-engine]
dependency_graph:
  requires: []
  provides: [PromptVersionStore, PromptVersioner, OPRO-instructions]
  affects: [scheduler, growth-engine, heartbeat-yaml]
tech_stack:
  added: []
  patterns: [A/B-alternation-by-run-parity, OPRO-prompt-mutation, version-comment-in-YAML]
key_files:
  created:
    - packages/jarvis-daemon/src/state/prompt-versions.ts
    - packages/jarvis-daemon/src/state/prompt-versions.test.ts
    - packages/jarvis-daemon/src/prompt-versioner.ts
    - packages/jarvis-daemon/src/prompt-versioner.test.ts
  modified:
    - packages/jarvis-daemon/src/scheduler.ts
    - packages/jarvis-daemon/src/growth.ts
    - packages/jarvis-daemon/heartbeat.yaml
decisions:
  - "D-01: Version stored as # version: N comment inside YAML prompt block (not a separate field)"
  - "D-02: PromptVersionStore shares TaskLedger database via constructor injection"
  - "D-03: OPRO pattern is instructions in the growth prompt, not code logic"
  - "D-04: A/B alternation uses total run count parity (even=current, odd=candidate)"
  - "D-05: Promotion/reversion happens automatically in scheduler after evaluate()"
metrics:
  duration: 5m22s
  completed: "2026-04-01T08:44:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 3
  tests_added: 21
  tests_total: 308
---

# Phase 10 Plan 01: Versioned Prompt Evolution with OPRO A/B Testing Summary

SQLite-backed prompt version store with A/B alternation, automatic evaluation/promotion, and OPRO mutation instructions in the growth engine.

## What Was Built

### PromptVersionStore (prompt-versions.ts)
- `prompt_versions` table: id, task_name, version, prompt_text, status (current/candidate/retired), created_at
- `prompt_version_metrics` table: id, prompt_version_id, run_id, success, duration_ms, tokens
- Index on (task_name, status) for fast lookups
- Methods: registerVersion, recordMetric, getMetrics, getCurrentVersion, getCandidateVersion, updateStatus, getTotalRunCount

### PromptVersioner (prompt-versioner.ts)
- `parseVersion(taskName)`: Extracts `# version: N` from heartbeat.yaml prompt text
- `selectPrompt(taskName)`: Returns current prompt when no candidate; alternates by run count parity when candidate exists
- `registerCandidate(taskName, promptText, version)`: Stores new candidate version
- `evaluate(taskName, minRuns)`: Compares success rate (primary) then token efficiency (tiebreak); returns winner or null if insufficient runs
- `promote(taskName)`: Swaps candidate to current, retires old, updates heartbeat.yaml on disk
- `revert(taskName)`: Retires candidate, keeps current
- `getPerformanceSummary(taskName)`: Formatted string for growth prompt inclusion

### Scheduler Wiring
- Added optional `promptVersioner` to SchedulerConfig
- `fireTask()` calls `selectPrompt()` before dispatch, falls back to task.prompt on error
- Records per-version metrics (success/failure) after each run
- Auto-evaluates and promotes/reverts after each metric recording via `maybeEvaluatePrompt()`

### Growth Engine Wiring
- Added optional `promptVersioner` to GrowthConfig
- `buildReflectionPrompt()` includes `<opro_prompt_mutation>` section with OPRO instructions
- Performance section includes per-version A/B testing status when available
- Growth loop builds version summary from all task names before prompt assembly

### heartbeat.yaml
- Added `# version: 1` as first line of both email_triage and memory_consolidation prompt blocks

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2742c0f | PromptVersionStore + PromptVersioner with A/B testing logic |
| 2 | 2fea680 | Wire PromptVersioner into Scheduler and Growth Engine |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all code paths are fully wired. The A/B testing activates when a PromptVersioner instance is passed to Scheduler/GrowthConfig (which happens in the daemon's main.ts boot sequence).

## Self-Check: PASSED

All 7 files verified present. Both commits (2742c0f, 2fea680) verified in git log.
