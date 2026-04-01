# Phase 9: Growth Engine Intelligence - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated

<domain>
## Phase Boundary

Wire the growth engine (already a skeleton in growth.ts) into a fully intelligent nightly loop that reads MISSION.md, reviews performance via telemetry, picks improvements from the backlog, implements them with full tool access, runs the Nightly Council for cross-model critique, uses regression detection before committing, creates GitHub issues for large features, and produces a morning summary.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- growth.ts skeleton already exists — enhance, don't rewrite
- Wire in: RuleStore (08-01), RegressionDetector (08-02), CorrectionStore (07-02), Council (council.ts)
- The growth prompt (in buildReflectionPrompt) needs to reference the improve skill properly
- Add council review step between implementation and commit
- Add regression snapshot before commit, check after
- GitHub issues via `gh issue create` in the growth prompt
- GROWTH_LOG.md and GROWTH_BACKLOG.md updates should be done by the claude -p session, not by the daemon code
- Morning summary queued as notification after loop ends

### Key integration points
- growth.ts imports: assembleCouncil, conveneCouncil from council.ts
- growth.ts imports: RegressionDetector from state/regression.ts
- growth.ts gets git diff after claude -p round for council review
- growth.ts snapshots rates before commit, checks after

</decisions>

<code_context>
## Existing Code

- packages/jarvis-daemon/src/growth.ts — skeleton loop
- packages/jarvis-daemon/src/council.ts — 3-round deliberation
- packages/jarvis-daemon/src/state/regression.ts — snapshot-compare-revert
- packages/jarvis-daemon/src/state/telemetry.ts — CorrectionStore
- packages/jarvis-daemon/src/state/rules.ts — RuleStore
- packages/jarvis/MISSION.md, GROWTH_BACKLOG.md, GROWTH_LOG.md — growth state files
- packages/jarvis/skills/improve/SKILL.md — the growth skill procedure

</code_context>

<specifics>
## Specific Ideas

None beyond requirements.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
