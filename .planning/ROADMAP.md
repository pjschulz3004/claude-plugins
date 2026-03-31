# Roadmap: Jarvis TypeScript Redesign

## Overview

Jarvis moves from a Python monolith to a TypeScript plugin constellation. The journey starts by proving the core pattern (monorepo builds, MCP server works as plugin, `claude -p` dispatch works) with email as the first tool, then fans out to remaining tools, layers on the orchestrator personality, adds Telegram for user-facing interaction, builds intelligence features on top of operational data, and finishes with a safe cutover from the Python system.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Email** - Monorepo, shared types, email plugin, daemon skeleton -- prove the entire pattern end-to-end
- [ ] **Phase 2: Remaining Tools** - Calendar, contacts, budget, files plugins following proven pattern
- [ ] **Phase 3: Orchestrator** - Unified assistant commands, skills, agents, voice reference
- [x] **Phase 4: Telegram + Notifications** - Bot, free-text relay, notification abstraction, quiet hours (completed 2026-03-31)
- [ ] **Phase 5: Intelligence** - Self-healing, self-improvement, knowledge graph
- [ ] **Phase 6: Cutover** - Shadow mode, output comparison, clean migration from Python

## Phase Details

### Phase 1: Foundation + Email
**Goal**: Developer can build the monorepo, email plugin works as a Claude Code MCP server, and daemon dispatches tasks via `claude -p` on the VPS
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08, EMAIL-09, EMAIL-10, DAEMON-01, DAEMON-02, DAEMON-03, DAEMON-04, DAEMON-05, DAEMON-06, DAEMON-07, DAEMON-08, DAEMON-09
**Success Criteria** (what must be TRUE):
  1. `npm run build` from repo root compiles all packages without errors and `npm test` runs all tests green
  2. Installing jarvis-email as a Claude Code plugin exposes MCP tools (list_unread, search, move, flag) that successfully read from a real IMAP mailbox
  3. `/jarvis-email:inbox` standalone command works in a Claude Code session without the orchestrator or daemon
  4. Daemon starts as systemd service on VPS, fires a heartbeat task on schedule, dispatches it via `claude -p`, and records the outcome in the task ledger
  5. Health endpoint at /health returns JSON with service status, and circuit breakers trip after 3 consecutive failures
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Monorepo scaffold and jarvis-shared package (wave 1)
- [x] 01-02-PLAN.md -- Email backend and MCP server (wave 2, depends on 01-01)
- [x] 01-03-PLAN.md -- Daemon core: scheduler, dispatcher, ledger, breakers, health (wave 2, depends on 01-01)

### Phase 2: Remaining Tools
**Goal**: All five tool domains (email, calendar, contacts, budget, files) have working MCP plugins that operate standalone
**Depends on**: Phase 1
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, BUD-01, BUD-02, BUD-03, BUD-04, BUD-05, BUD-06, BUD-07, FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06
**Success Criteria** (what must be TRUE):
  1. `/jarvis-calendar:today` shows real calendar events and pending VTODOs from mailbox.org CalDAV
  2. User can search contacts by name or email via MCP tool and get full vCard details back
  3. `/jarvis-budget:summary` shows real YNAB category balances and user can categorize transactions via MCP tool
  4. User can list inbox files, save a file, and archive it to the YYYY/MM structure via MCP tools
  5. Each tool plugin installs and works standalone in Claude Code without any other Jarvis plugin present
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md -- Calendar plugin: tsdav CalDAV backend, 4 MCP tools, /jarvis-calendar:today command (wave 1)
- [x] 02-02-PLAN.md -- Contacts plugin: tsdav CardDAV backend, 4 MCP tools, /jarvis-contacts:lookup command (wave 1)
- [x] 02-03-PLAN.md -- Budget plugin: YNAB SDK backend with UUID-to-string, 4 MCP tools, /jarvis-budget:summary command (wave 1)
- [x] 02-04-PLAN.md -- Files plugin: node:fs + rclone backend, 6 MCP tools, /jarvis-files:files command (wave 1)

### Phase 3: Orchestrator
**Goal**: Users interact with a unified Jarvis assistant that synthesizes across all tool domains with a consistent voice
**Depends on**: Phase 2
**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05, ORCH-06, ORCH-07, ORCH-08
**Success Criteria** (what must be TRUE):
  1. `/jarvis:status` returns system health showing uptime, circuit breaker states, and last heartbeat task outcome
  2. `/jarvis:briefing` produces a natural-language synthesis combining calendar events, unread email highlights, budget status, and pending todos
  3. Email triage skill classifies emails using deterministic rules first and falls back to LLM only for ambiguous cases
  4. All user-facing output follows the voice reference: efficient, polite, slight British humour, no emoji, no filler
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- Plugin structure, commands (status/briefing/ask), voice reference, email-rules, budget-rules (wave 1)
- [x] 03-02-PLAN.md -- Skills (triage/brief/filing) and agents (email/budget/briefing) with model tiering (wave 2, depends on 03-01)

### Phase 4: Telegram + Notifications
**Goal**: Paul can interact with Jarvis from his phone via Telegram and receives proactive notifications from heartbeat tasks
**Depends on**: Phase 1 (daemon), Phase 3 (orchestrator skills for relay)
**Requirements**: TG-01, TG-02, TG-03, TG-04, TG-05, TG-06, TG-07
**Success Criteria** (what must be TRUE):
  1. All 7 Telegram slash commands (/start, /status, /inbox, /today, /budget, /tasks, /history) return correct data
  2. Free-text message sent via Telegram gets relayed to `claude -p` with conversation history and returns a meaningful response using Jarvis tools
  3. Heartbeat tasks with autonomy=notify deliver notifications to Telegram, and quiet hours (23:00-07:00) suppress non-urgent messages
  4. Messages from unauthorized chat IDs are silently dropped, and long messages split at paragraph boundaries
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Telegram bot: telegraf setup, auth middleware, 7 slash commands, free-text relay, chat history (wave 1)
- [x] 04-02-PLAN.md -- Notification abstraction: NotifyChannel interface, TelegramChannel, quiet hours, scheduler wiring (wave 2, depends on 04-01)

### Phase 5: Intelligence
**Goal**: Jarvis autonomously recovers from failures, learns from corrections, and maintains cross-domain memory
**Depends on**: Phase 4 (needs operational data and notification delivery)
**Requirements**: INTEL-01, INTEL-02, INTEL-03, INTEL-04, INTEL-05, INTEL-06, INTEL-07
**Success Criteria** (what must be TRUE):
  1. When a heartbeat task fails 3+ consecutive times, the healing agent is dispatched, diagnoses the root cause, and either fixes it or escalates via notification
  2. Nightly self-improvement agent detects email triage corrections (emails moved after classification) and updates email-rules.md with new patterns
  3. Knowledge graph stores cross-domain entities and the nightly consolidation task expires stale edges
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md -- Healing skill + agent (pure markdown) and daemon healing dispatch logic (wave 1)
- [ ] 05-02-PLAN.md -- Self-improvement skill + agent (6 analysis dimensions) and heartbeat task wiring (wave 1)
- [ ] 05-03-PLAN.md -- Knowledge graph module (neo4j-driver wrapper) and memory consolidation task (wave 2, depends on 05-01 + 05-02)

### Phase 6: Cutover
**Goal**: TypeScript Jarvis replaces Python Jarvis in production with zero downtime and verified parity
**Depends on**: Phase 5
**Requirements**: MIG-01, MIG-02, MIG-03, MIG-04
**Success Criteria** (what must be TRUE):
  1. New TS daemon runs alongside old Python service in shadow mode, processing the same heartbeat schedule without affecting production
  2. Shadow mode comparison shows equivalent or better outputs for all heartbeat tasks
  3. After cutover, health endpoint is green, all heartbeat tasks fire on schedule, and all plugins are published to the marketplace
**Plans**: TBD

Plans:
- [ ] 06-01: Shadow mode and output comparison
- [ ] 06-02: Clean cutover and marketplace publishing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Email | 0/3 | Planning complete | - |
| 2. Remaining Tools | 0/4 | Planning complete | - |
| 3. Orchestrator | 1/2 | In Progress|  |
| 4. Telegram + Notifications | 2/2 | Complete   | 2026-03-31 |
| 5. Intelligence | 0/3 | Planning complete | - |
| 6. Cutover | 0/2 | Not started | - |
