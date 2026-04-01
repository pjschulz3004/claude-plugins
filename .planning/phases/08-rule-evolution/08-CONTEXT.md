# Phase 8: Rule Evolution + Regression Safety - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Convert email and budget rules from free-form markdown to structured YAML with confidence scoring, source attribution, and review flags. Build regression detection that auto-reverts changes when 7-day correction rate increases.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Rules in YAML format (programmatically parseable, git-trackable)
- Confidence: 0.0-1.0 based on evaluation count and accuracy
- Source: user_correction | self_generated | seeded
- Rules below 0.8 confidence flagged for human review
- Regression detection: compare 7-day rolling correction rate before/after a self-modification. If rate increased, auto-revert via git revert.
- The growth engine (Phase 9) will consume these structured rules. This phase just builds the format + regression safety net.

### From research
- SIMBA pattern: rules with confidence and evaluation tracking
- ACE pattern: structured delta updates, not over-summarised
- Regression detection via correction rate rolling window

</decisions>

<code_context>
## Existing Code

### Current rule files (free-form markdown)
- packages/jarvis/references/email-rules.md
- packages/jarvis/references/budget-rules.md

### Telemetry (just built in Phase 7)
- packages/jarvis-daemon/src/state/telemetry.ts — CorrectionStore with rollingCorrectionRate()
- packages/jarvis-daemon/src/state/corrections.ts — detectEmailCorrections(), detectBudgetCorrections()
- packages/jarvis-daemon/src/state/ledger.ts — task_runs with decision_summary

</code_context>

<specifics>
## Specific Ideas

None beyond requirements.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
