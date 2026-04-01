---
phase: 11-skill-creation
plan: 01
subsystem: growth-engine
tags: [skill-creation, gap-detection, growth, voyager-pattern]
dependency_graph:
  requires: [ledger, growth-engine]
  provides: [skill-creator, gap-detection, skill-templates]
  affects: [growth-prompt, nightly-loop]
tech_stack:
  added: []
  patterns: [static-helper-class, tdd, gap-keyword-matching]
key_files:
  created:
    - packages/jarvis-daemon/src/skill-creator.ts
    - packages/jarvis-daemon/src/skill-creator.test.ts
    - packages/jarvis/skills/_template/SKILL.md
    - packages/jarvis/skills/_template/tool-scaffold.ts
  modified:
    - packages/jarvis-daemon/src/growth.ts
    - packages/jarvis-daemon/src/growth.test.ts
decisions:
  - "SkillCreator is all-static (no instance state) -- pure helper functions on Database"
  - "Gap detection uses keyword matching on error messages (no tool, not available, cannot, unsupported)"
  - "IMPROVE_SKILL_PROCEDURE exported as const for testability"
  - "Gap detection is non-blocking in runGrowthLoop (try/catch with console.warn)"
metrics:
  duration: 5m16s
  completed: 2026-04-01
  tasks: 2
  files: 6
---

# Phase 11 Plan 01: Capability Gap Detection and Autonomous Skill Creation Summary

SkillCreator helper class that detects repeated failure patterns from the task ledger and provides SKILL.md/tool templates, wired into the growth engine prompt with full staging-branch + PR workflow instructions.

## What Was Done

### Task 1: SkillCreator helper class with gap detection and templates (58a3d53)

- Created `SkillCreator` static class with four methods:
  - `detectGaps(db, minOccurrences)` -- queries task_runs for failures in last 30 days matching gap keywords, groups by normalized error pattern, returns gaps above threshold
  - `getSkillTemplate()` -- returns SKILL.md template with frontmatter, Trigger, Procedure, Tools, Rules, Output sections
  - `getToolScaffold(toolName)` -- returns TypeScript MCP tool template with Zod schema, handler function, and test reference
  - `formatGapsForPrompt(gaps)` -- formats detected gaps as prompt-friendly summary
- Created template files in `packages/jarvis/skills/_template/`
- 15 tests covering gap detection edge cases, template content, and formatting

### Task 2: Wire SkillCreator into growth prompt (1061f7f)

- Added SkillCreator import to growth.ts
- In `runGrowthLoop()`, call `SkillCreator.detectGaps(ledger.database)` each round (non-blocking)
- Added `capabilityGaps` parameter to `buildReflectionPrompt` with `<capability_gaps>` XML section
- Added SKILL CREATION PROCEDURE to `IMPROVE_SKILL_PROCEDURE` constant with 8-step workflow:
  1. Branch: `skill/{tool-name}`
  2. Create SKILL.md
  3. Create MCP tool with Zod schema
  4. Create test file
  5. Verify (npm test + npm run build)
  6. Commit
  7. PR via `gh pr create --repo pjschulz3004/claude-plugins`
  8. Return to main
- 3 new tests for capability_gaps inclusion/omission and skill creation procedure content
- Exported `IMPROVE_SKILL_PROCEDURE` for test access

## Deviations from Plan

None -- plan executed exactly as written.

## Test Results

- 326 tests passing (was 308, +18 new)
- Build clean (tsc --build)
- All verification grep checks pass

## Known Stubs

None. All methods are fully implemented and tested.
