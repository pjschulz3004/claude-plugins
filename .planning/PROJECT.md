# Jarvis TypeScript Redesign

## What This Is

A personal AI assistant built as a TypeScript plugin constellation for Claude Code, plus a lean daemon on the VPS for autonomous 24/7 operation. Each tool (email, calendar, budget, contacts, files) is an independent plugin. Jarvis actively grows into his role through nightly self-reflection, learning from corrections, and autonomous skill creation.

## Core Value

A personal assistant that works when you're not looking (daemon) and when you are (plugin), with every tool independently reusable across any Claude Code instance. **Jarvis should be better tomorrow than he was today.**

## Current Milestone: v2.0 Jarvis Growth Intelligence

**Goal:** Transform Jarvis from a task executor into a self-reflecting, self-improving assistant that grows into his role overnight.

**Target features:**
- Structured telemetry with correction capture
- Nightly growth engine with mission-driven self-reflection
- Dual-stream learning (tactical corrections + strategic patterns)
- Rule evolution with confidence scoring and regression detection
- Autonomous skill creation (VOYAGER/LATM patterns)
- Prompt optimisation (OPRO pattern)
- GitHub issue creation for large feature requests
- Fix email_triage reliability and Telegram UX

## Requirements

### Validated

- Tool plugins expose MCP servers for email, calendar, contacts, budget, files — v1.0
- Each tool plugin works standalone without the orchestrator — v1.0
- Daemon runs as systemd service on VPS with heartbeat scheduler — v1.0
- Daemon dispatches tasks via `claude -p` using Max subscription — v1.0
- Orchestrator plugin provides unified assistant commands and skills — v1.0
- Circuit breakers per service prevent cascading failures — v1.0
- Task ledger records all heartbeat runs for observability — v1.0
- Voice reference ensures natural, human-feeling output — v1.0
- All plugins published to pjschulz3004/claude-plugins marketplace — v1.0

### Active

- [ ] Structured telemetry for every action with correction capture
- [ ] Nightly growth engine (01:00-05:00) with mission-driven self-reflection
- [ ] Dual-stream learning: tactical corrections + strategic pattern analysis
- [ ] Rule evolution with confidence scoring, source attribution, rollback
- [ ] Autonomous skill creation (detect gaps, build tools, verify, deploy)
- [ ] Prompt optimisation for heartbeat tasks based on performance data
- [ ] Regression detection with auto-revert
- [ ] GitHub issue creation for features too large to implement overnight
- [ ] Email triage reliability fix
- [ ] Telegram UX improvements (better slash commands, richer responses)
- [ ] Telegram bot + notifications fully working
- [ ] Knowledge graph enrichment from growth sessions

### Out of Scope

- API billing — all Claude usage through Max subscription via `claude -p`
- Mistral provider — Claude handles all reasoning, one LLM
- Multi-tenant support — single user (Paul)
- PWA push notifications — future milestone
- Mobile app — Telegram is the mobile interface
- Fine-tuning — evolving markdown rules and prompt optimisation achieve the same goal
- Full autonomous self-modification of core daemon code — growth engine can create new skills and tune prompts, but core TypeScript changes require human review

## Context

**v1.0 shipped:** 9 npm packages (jarvis-shared, jarvis-email, jarvis-calendar, jarvis-contacts, jarvis-budget, jarvis-files, jarvis-kg, jarvis-daemon, jarvis orchestrator). 223 tests. Daemon running on VPS. Plugins installed. Growth engine skeleton deployed.

**Current issues:** email_triage fails ~50% (prompt too ambitious for max_turns, plugin tools weren't loading). Telegram free-text relay hits OAuth expiry. Growth engine skeleton needs intelligence layers.

**Research completed:** Reflexion, VOYAGER, LATM, DSPy/SIMBA, SCOPE, ACE, OPRO patterns. Key findings: separate execution from reflection, telemetry before prompts, dual-stream learning, VOYAGER skill library, LATM tool-making split, OPRO for prompt evolution.

## Constraints

- **Billing**: No API billing. Max subscription via `claude -p` CLI only
- **Runtime**: VPS (Hetzner) with systemd
- **Language**: TypeScript end-to-end
- **Growth window**: 01:00-05:00 nightly (4 hours, rate-limit aware)
- **Safety**: Regression detection on all self-modifications. New skills go to staging.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript over Python | Plugin ecosystem is TS-native | Validated v1.0 |
| `claude -p` over Agent SDK | Uses Max subscription, structured output | Validated v1.0 |
| Daemon + Plugin architecture | 24/7 autonomy + composability | Validated v1.0 |
| Growth engine as time-bounded loop | Ralph Loop pattern, avoids single-shot limitations | — Pending |
| VOYAGER pattern for skill creation | Proven: detect need, create tool, verify, store | — Pending |
| OPRO for prompt evolution | Simplest effective approach, no framework dependency | — Pending |
| Dual-stream learning (SCOPE) | Tactical fixes + strategic patterns at different cadences | — Pending |
| Regression detection via correction rate | 7-day rolling window, auto-revert on increase | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after milestone v2.0 initialization*
