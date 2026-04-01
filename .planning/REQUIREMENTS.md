# Requirements — v2.0 Jarvis Growth Intelligence

## v2 Requirements

### Telemetry Foundation (TEL)

- [x] **TEL-01**: Every heartbeat task execution logs structured telemetry: task_name, input_features, decision_summary, outcome, duration_ms, cost_usd, tokens
- [x] **TEL-02**: User corrections are captured as correction events: when Paul moves an email to a different folder, recategorises a YNAB transaction, or rejects a Telegram response
- [x] **TEL-03**: Correction events link to the original Jarvis decision (task_name, timestamp, original_decision, corrected_decision)
- [x] **TEL-04**: Telemetry is queryable via SQLite (correction_events table alongside task_runs)
- [x] **TEL-05**: 7-day and 30-day rolling correction rates are computable per task type

### Growth Engine (GROW)

- [ ] **GROW-01**: Growth loop runs 01:00-05:00 nightly as a time-bounded Ralph Loop
- [ ] **GROW-02**: Each round reads MISSION.md, reviews task ledger, reads GROWTH_BACKLOG.md
- [ ] **GROW-03**: Each round picks ONE improvement from backlog (highest priority) and implements it
- [ ] **GROW-04**: Growth engine has full access: Read, Write, Edit, Bash, WebSearch, GitHub CLI, all MCP tools
- [ ] **GROW-05**: Growth engine can edit heartbeat.yaml prompts, skill files, agent files, reference files, and TypeScript source
- [ ] **GROW-06**: Growth engine runs npm test after any code change, only commits if tests pass
- [ ] **GROW-07**: Growth engine creates GitHub issues for features too large for a single night
- [ ] **GROW-08**: Growth session results recorded in GROWTH_LOG.md with reflection, work done, commits
- [ ] **GROW-09**: Morning summary notification sent after growth session completes
- [ ] **GROW-10**: Growth backlog is self-maintaining: engine adds new items discovered during work

### Rule Evolution (RULE)

- [x] **RULE-01**: Email rules have confidence scores (0.0-1.0) based on evaluation count and accuracy
- [x] **RULE-02**: Budget payee rules have confidence scores based on observation count
- [x] **RULE-03**: Each rule has source attribution: user_correction, self_generated, or seeded
- [x] **RULE-04**: Rules below confidence threshold (0.8) are flagged for human review
- [x] **RULE-05**: Rule files use structured YAML format (not free-form markdown) for programmatic access
- [x] **RULE-06**: Rule changes are git-tracked with clear commit messages

### Regression Detection (REG)

- [x] **REG-01**: Rolling 7-day correction rate computed per task type after each growth session
- [x] **REG-02**: If correction rate increases after a self-modification, the change is auto-reverted (git revert)
- [x] **REG-03**: Regression events are logged in GROWTH_LOG.md with the reverted commit hash
- [x] **REG-04**: After a regression revert, the backlog item is marked as "reverted" with reason

### Skill Creation (SKILL)

- [ ] **SKILL-01**: Growth engine can detect capability gaps (repeated manual requests, failed tasks with "no tool available")
- [ ] **SKILL-02**: Growth engine can write new SKILL.md files following the plugin skill pattern
- [ ] **SKILL-03**: Growth engine can write new TypeScript MCP tools with Zod schemas and tests
- [ ] **SKILL-04**: New skills are verified: tests pass, build succeeds, tool responds to test invocation
- [ ] **SKILL-05**: New skills are committed to a staging branch (not main) for human review
- [ ] **SKILL-06**: Growth engine creates a GitHub PR for new skills with description and test results

### Prompt Optimisation (PROMPT)

- [ ] **PROMPT-01**: Heartbeat task prompts are versioned (version number in heartbeat.yaml comment)
- [ ] **PROMPT-02**: Growth engine tracks performance per prompt version (success rate, duration, token usage)
- [ ] **PROMPT-03**: Growth engine proposes prompt mutations based on failure analysis (OPRO pattern)
- [ ] **PROMPT-04**: Prompt mutations are A/B tested by alternating versions across consecutive runs
- [ ] **PROMPT-05**: Winning prompt versions are promoted, losing versions are reverted

### Email Triage Fix (FIX)

- [ ] **FIX-01**: Email triage succeeds >90% of runs (currently ~50%)
- [ ] **FIX-02**: Triage prompt references installed plugin MCP tools (not --plugin-dir paths)
- [ ] **FIX-03**: Triage prompt is scoped: max 10 emails per run, classify then act
- [ ] **FIX-04**: Triage results are logged with per-email decisions for correction detection

### Telegram UX (TG-UX)

- [ ] **TG-UX-01**: Telegram slash commands return formatted, human-readable responses (not raw JSON)
- [ ] **TG-UX-02**: Free-text relay works reliably with conversation history context
- [ ] **TG-UX-03**: Error messages are user-friendly, not stack traces
- [ ] **TG-UX-04**: Bot sends a brief daily morning greeting with status (not just data dump)

### Knowledge Graph Growth (KG)

- [ ] **KG-01**: Growth sessions store learned rules and patterns as KG episodes
- [ ] **KG-02**: Correction events are stored as KG episodes with temporal metadata
- [ ] **KG-03**: Growth engine queries KG for relevant context before making improvements

## Future Requirements (Deferred to v3+)

- DSPy/SIMBA full prompt compilation pipeline
- Embedding-based email classifier (Wiggins pattern — needs 250+ labeled examples)
- PWA push notification channel
- Cross-model verification (different model for review vs execution)
- Skill deprecation and usage tracking
- Automated A/B testing framework for all agent outputs

## Out of Scope

- Fine-tuning — evolving rules and prompt optimisation achieve the same goal without infrastructure
- Full autonomous daemon code modification — growth engine can create new skills and tune prompts but core TypeScript daemon changes need human review
- Voice interface — text via Telegram
- Multi-tenant — single user

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEL-01 | Phase 7 | Complete |
| TEL-02 | Phase 7 | Complete |
| TEL-03 | Phase 7 | Complete |
| TEL-04 | Phase 7 | Complete |
| TEL-05 | Phase 7 | Complete |
| FIX-01 | Phase 7 | Pending |
| FIX-02 | Phase 7 | Pending |
| FIX-03 | Phase 7 | Pending |
| FIX-04 | Phase 7 | Pending |
| TG-UX-01 | Phase 7 | Pending |
| TG-UX-02 | Phase 7 | Pending |
| TG-UX-03 | Phase 7 | Pending |
| TG-UX-04 | Phase 7 | Pending |
| RULE-01 | Phase 8 | Complete |
| RULE-02 | Phase 8 | Complete |
| RULE-03 | Phase 8 | Complete |
| RULE-04 | Phase 8 | Complete |
| RULE-05 | Phase 8 | Complete |
| RULE-06 | Phase 8 | Complete |
| REG-01 | Phase 8 | Complete |
| REG-02 | Phase 8 | Complete |
| REG-03 | Phase 8 | Complete |
| REG-04 | Phase 8 | Complete |
| GROW-01 | Phase 9 | Pending |
| GROW-02 | Phase 9 | Pending |
| GROW-03 | Phase 9 | Pending |
| GROW-04 | Phase 9 | Pending |
| GROW-05 | Phase 9 | Pending |
| GROW-06 | Phase 9 | Pending |
| GROW-07 | Phase 9 | Pending |
| GROW-08 | Phase 9 | Pending |
| GROW-09 | Phase 9 | Pending |
| GROW-10 | Phase 9 | Pending |
| PROMPT-01 | Phase 10 | Pending |
| PROMPT-02 | Phase 10 | Pending |
| PROMPT-03 | Phase 10 | Pending |
| PROMPT-04 | Phase 10 | Pending |
| PROMPT-05 | Phase 10 | Pending |
| SKILL-01 | Phase 11 | Pending |
| SKILL-02 | Phase 11 | Pending |
| SKILL-03 | Phase 11 | Pending |
| SKILL-04 | Phase 11 | Pending |
| SKILL-05 | Phase 11 | Pending |
| SKILL-06 | Phase 11 | Pending |
| KG-01 | Phase 12 | Pending |
| KG-02 | Phase 12 | Pending |
| KG-03 | Phase 12 | Pending |
