# Phase 5: Intelligence - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated

<domain>
## Phase Boundary

Build the intelligence layer: healing agent/skill (dispatched on 3+ consecutive failures), nightly self-improvement agent/skill (reads ledger, detects corrections, updates rules), and Neo4j knowledge graph integration (Graphiti wrapper, memory consolidation task).

This phase has two components:
1. Orchestrator plugin additions (skills/healing, skills/improve, agents/healing-agent, agents/improve-agent) — pure markdown
2. Optional KG module in daemon or shared package — TypeScript wrapping neo4j-driver + graphiti

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Healing agent dispatched by daemon when breaker data shows 3+ consecutive failures for same task
- Self-improvement runs as nightly heartbeat task (03:30) via claude -p with improve skill
- KG is optional — daemon degrades gracefully if Neo4j not available
- Use neo4j-driver (official) for TypeScript, not graphiti-core (Python-only)

### Key design from spec
- Healing: daemon detects failures from ledger, builds prompt with error context, dispatches claude -p with healing skill
- Improve: reads ledger (failed/slow tasks), checks email folder state vs triage log (correction signals), checks YNAB recategorizations, updates email-rules.md and budget-rules.md
- KG: wrap neo4j-driver with add_episode/search/get_stats/expire_stale methods

</decisions>

<code_context>
## Existing Code Insights

### Available for integration
- packages/jarvis-daemon/src/state/ledger.ts — task run history
- packages/jarvis-daemon/src/state/breakers.ts — consecutive failure tracking
- packages/jarvis-daemon/src/dispatcher.ts — claude -p dispatch
- packages/jarvis/skills/ — existing skills pattern
- packages/jarvis/agents/ — existing agents pattern

</code_context>

<specifics>
## Specific Ideas

The nightly self-improvement cycle is the most novel feature. Design it to be comprehensive (as user requested). Full spec deferred to the planner.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
