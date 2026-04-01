# Roadmap: Jarvis TypeScript Redesign

## Milestones

- ✅ **v1.0 Plugin Constellation** - Phases 1-6 (shipped 2026-03-31)
- 🚧 **v2.0 Jarvis Growth Intelligence** - Phases 7-12 (in progress)

## Phases

<details>
<summary>v1.0 Plugin Constellation (Phases 1-6) - SHIPPED 2026-03-31</summary>

### Phase 1: Foundation + Email
**Goal**: Developer can build the monorepo, email plugin works as a Claude Code MCP server, and daemon dispatches tasks via `claude -p` on the VPS
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01..05, EMAIL-01..10, DAEMON-01..09
**Plans**: 3 plans (all complete)

Plans:
- [x] 01-01-PLAN.md -- Monorepo scaffold and jarvis-shared package
- [x] 01-02-PLAN.md -- Email backend and MCP server
- [x] 01-03-PLAN.md -- Daemon core: scheduler, dispatcher, ledger, breakers, health

### Phase 2: Remaining Tools
**Goal**: All five tool domains have working MCP plugins that operate standalone
**Depends on**: Phase 1
**Requirements**: CAL-01..07, CONT-01..05, BUD-01..07, FILE-01..06
**Plans**: 4 plans (all complete)

Plans:
- [x] 02-01-PLAN.md -- Calendar plugin
- [x] 02-02-PLAN.md -- Contacts plugin
- [x] 02-03-PLAN.md -- Budget plugin
- [x] 02-04-PLAN.md -- Files plugin

### Phase 3: Orchestrator
**Goal**: Users interact with a unified Jarvis assistant that synthesizes across all tool domains
**Depends on**: Phase 2
**Requirements**: ORCH-01..08
**Plans**: 2 plans (all complete)

Plans:
- [x] 03-01-PLAN.md -- Plugin structure, commands, voice reference, rules
- [x] 03-02-PLAN.md -- Skills and agents with model tiering

### Phase 4: Telegram + Notifications
**Goal**: Paul can interact with Jarvis from his phone via Telegram and receives proactive notifications
**Depends on**: Phase 1, Phase 3
**Requirements**: TG-01..07
**Plans**: 2 plans (all complete)

Plans:
- [x] 04-01-PLAN.md -- Telegram bot: telegraf setup, auth, commands, relay
- [x] 04-02-PLAN.md -- Notification abstraction: channels, quiet hours, scheduler wiring

### Phase 5: Intelligence
**Goal**: Jarvis autonomously recovers from failures, learns from corrections, and maintains cross-domain memory
**Depends on**: Phase 4
**Requirements**: INTEL-01..07
**Plans**: 3 plans (all complete)

Plans:
- [x] 05-01-PLAN.md -- Healing skill + agent
- [x] 05-02-PLAN.md -- Self-improvement skill + agent
- [x] 05-03-PLAN.md -- Knowledge graph module and memory consolidation

### Phase 6: Cutover
**Goal**: TypeScript Jarvis replaces Python Jarvis in production
**Depends on**: Phase 5
**Requirements**: MIG-01..04
**Plans**: 1 plan (complete)

Plans:
- [x] 06-01-PLAN.md -- Deployment artifacts, cutover runbook, marketplace checklist

</details>

### v2.0 Jarvis Growth Intelligence

**Milestone Goal:** Transform Jarvis from a task executor into a self-reflecting, self-improving assistant that grows into his role overnight.

- [ ] **Phase 7: Stabilise + Instrument** - Fix email triage and Telegram UX, lay telemetry foundation
- [ ] **Phase 8: Rule Evolution + Regression Safety** - Structured rules with confidence scoring and auto-revert on regression
- [ ] **Phase 9: Growth Engine** - Nightly time-bounded loop that reads mission, picks work, implements, tests, commits
- [ ] **Phase 10: Prompt Optimisation** - OPRO-pattern versioned prompt evolution with A/B testing
- [ ] **Phase 11: Skill Creation** - VOYAGER/LATM-pattern autonomous tool creation with staging and PR workflow
- [ ] **Phase 12: Knowledge Graph Growth** - Growth sessions and corrections feed the KG for contextual memory

## Phase Details

### Phase 7: Stabilise + Instrument
**Goal**: Jarvis reliably handles email triage and Telegram interactions, and every action produces structured telemetry for downstream intelligence
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, TG-UX-01, TG-UX-02, TG-UX-03, TG-UX-04, TEL-01, TEL-02, TEL-03, TEL-04, TEL-05
**Success Criteria** (what must be TRUE):
  1. Email triage completes successfully on >90% of nightly runs (verifiable via task ledger)
  2. Telegram slash commands return formatted human-readable responses, free-text relay works with conversation context, and errors show friendly messages
  3. Every heartbeat task execution writes a structured telemetry row (task_name, outcome, duration_ms, tokens) to SQLite
  4. When Paul moves an email or recategorises a YNAB transaction, a correction event is captured linking back to the original Jarvis decision
  5. 7-day and 30-day rolling correction rates are queryable per task type
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md -- Email triage fix + Telegram UX polish
- [x] 07-02-PLAN.md -- Telemetry foundation: correction_events table + CorrectionStore
- [x] 07-03-PLAN.md -- Correction detection: email + budget correction capture + rolling rates

### Phase 8: Rule Evolution + Regression Safety
**Goal**: Jarvis's email and budget rules are structured, scored, and automatically protected against regression
**Depends on**: Phase 7 (telemetry needed for correction rates)
**Requirements**: RULE-01, RULE-02, RULE-03, RULE-04, RULE-05, RULE-06, REG-01, REG-02, REG-03, REG-04
**Success Criteria** (what must be TRUE):
  1. Email rules and budget payee rules live in structured YAML with confidence scores (0.0-1.0) and source attribution (user_correction / self_generated / seeded)
  2. Rules below 0.8 confidence are flagged for human review (visible in morning summary or growth log)
  3. All rule changes are git-tracked with clear commit messages
  4. After a growth session modifies rules, if the 7-day correction rate increases, the change is auto-reverted and the regression is logged with the reverted commit hash
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md -- Structured YAML rule format + RuleStore + migration of existing rules
- [x] 08-02-PLAN.md -- Regression detection with snapshot-compare-revert safety net

### Phase 9: Growth Engine
**Goal**: Jarvis autonomously improves himself overnight through a structured reflect-plan-implement-verify loop
**Depends on**: Phase 8 (rules and regression detection must exist before the engine modifies things)
**Requirements**: GROW-01, GROW-02, GROW-03, GROW-04, GROW-05, GROW-06, GROW-07, GROW-08, GROW-09, GROW-10
**Success Criteria** (what must be TRUE):
  1. Growth loop runs between 01:00-05:00 nightly, executing multiple rounds of the Ralph Loop (read mission, review ledger, pick one backlog item, implement, test, commit)
  2. Growth engine has full tool access and can edit prompts, skill files, agent files, reference files, and TypeScript source -- but only commits when tests pass
  3. Features too large for a single night result in a GitHub issue with scope description
  4. Each growth session produces a GROWTH_LOG.md entry with reflection, work done, and commit hashes
  5. Paul receives a morning summary notification after growth session completes
**Plans**: TBD

### Phase 10: Prompt Optimisation
**Goal**: Heartbeat task prompts evolve based on measured performance, with losing versions automatically reverted
**Depends on**: Phase 9 (growth engine executes prompt mutations), Phase 7 (telemetry provides per-version metrics)
**Requirements**: PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04, PROMPT-05
**Success Criteria** (what must be TRUE):
  1. Each heartbeat task prompt carries a version number and telemetry is tracked per version (success rate, duration, token usage)
  2. Growth engine proposes prompt mutations based on failure analysis (OPRO pattern) and A/B tests them by alternating versions across consecutive runs
  3. Winning prompt versions are promoted and losing versions are reverted, with the decision logged
**Plans**: TBD

### Phase 11: Skill Creation
**Goal**: Jarvis can detect capability gaps and autonomously create new tools, verified and submitted for human review
**Depends on**: Phase 9 (growth engine is the execution environment for skill creation)
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06
**Success Criteria** (what must be TRUE):
  1. Growth engine detects capability gaps from repeated manual requests or "no tool available" failures in telemetry
  2. New skills are written as TypeScript MCP tools with Zod schemas, tests, and SKILL.md documentation
  3. New skills are verified (tests pass, build succeeds, tool responds to test invocation) before being committed to a staging branch
  4. A GitHub PR is created for each new skill with description and test results, awaiting Paul's review
**Plans**: TBD

### Phase 12: Knowledge Graph Growth
**Goal**: Growth sessions and corrections enrich the knowledge graph, giving Jarvis contextual memory for future improvements
**Depends on**: Phase 9 (growth engine writes to KG), Phase 7 (telemetry provides correction events)
**Requirements**: KG-01, KG-02, KG-03
**Success Criteria** (what must be TRUE):
  1. Learned rules and patterns from growth sessions are stored as KG episodes with temporal metadata
  2. Correction events are stored as KG episodes linking the original decision to the correction
  3. Growth engine queries the KG for relevant context before making improvements (verifiable in growth log)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Email | v1.0 | 3/3 | Complete | 2026-03-31 |
| 2. Remaining Tools | v1.0 | 4/4 | Complete | 2026-03-31 |
| 3. Orchestrator | v1.0 | 2/2 | Complete | 2026-03-31 |
| 4. Telegram + Notifications | v1.0 | 2/2 | Complete | 2026-03-31 |
| 5. Intelligence | v1.0 | 3/3 | Complete | 2026-03-31 |
| 6. Cutover | v1.0 | 1/1 | Complete | 2026-03-31 |
| 7. Stabilise + Instrument | v2.0 | 2/3 | In Progress|  |
| 8. Rule Evolution + Regression Safety | v2.0 | 1/2 | In Progress|  |
| 9. Growth Engine | v2.0 | 0/? | Not started | - |
| 10. Prompt Optimisation | v2.0 | 0/? | Not started | - |
| 11. Skill Creation | v2.0 | 0/? | Not started | - |
| 12. Knowledge Graph Growth | v2.0 | 0/? | Not started | - |
