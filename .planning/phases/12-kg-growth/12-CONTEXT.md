# Phase 12: Knowledge Graph Growth — Context

## Decisions

- **D-01**: Wire the existing `@jarvis/kg` package (KnowledgeGraphClient) into growth.ts
- **D-02**: Store growth improvements as KG episodes after commit (subject: "growth_session", relation: "PRODUCED", object: the improvement)
- **D-03**: Store corrections as KG episodes with temporal metadata (subject: task, relation: "CORRECTED_BY", object: correction)
- **D-04**: Growth prompt includes KG search results for relevant context before picking work
- **D-05**: Graceful degradation: if Neo4j is unavailable, skip KG operations (already the pattern in jarvis-kg client)

## Deferred Ideas

- None for this phase

## Claude's Discretion

- Episode entity naming conventions for growth sessions
- How many KG search results to include in growth prompt (default 5)
- Which search queries to run (based on backlog item keywords)

## Key Context

- `packages/jarvis-kg/` has KnowledgeGraphClient with addEpisode(), search(), getStats()
- Episode type: { subject: Entity, relation: Relation, object: Entity, timestamp, source }
- `@jarvis/kg` is already a dependency of `@jarvis/daemon` (in package.json)
- growth.ts builds the reflection prompt and runs the loop — KG wiring goes here
- CorrectionStore in `state/telemetry.ts` provides correction events
