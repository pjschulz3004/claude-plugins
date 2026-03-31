# Jarvis TypeScript Redesign

## What This Is

A ground-up redesign of Jarvis (Paul's personal AI assistant) as a TypeScript system built on the Claude Code plugin architecture. Jarvis becomes a constellation of plugins published through Paul's GitHub marketplace (`pjschulz3004/claude-plugins`), plus a lean daemon on the VPS for autonomous 24/7 operation. Each tool (email, calendar, budget, contacts, files) is an independent plugin usable across any Claude Code instance.

## Core Value

A personal assistant that works when you're not looking (daemon) and when you are (plugin), with every tool independently reusable across any Claude Code instance.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Tool plugins expose MCP servers for email, calendar, contacts, budget, files
- [ ] Each tool plugin works standalone without the orchestrator
- [ ] Daemon runs as systemd service on VPS with heartbeat scheduler
- [ ] Daemon dispatches tasks via `claude -p` using Max subscription
- [ ] Telegram bot for notifications and free-text conversation relay
- [ ] Orchestrator plugin provides unified assistant commands and skills
- [ ] Circuit breakers per service prevent cascading failures
- [ ] Task ledger records all heartbeat runs for observability
- [ ] Voice reference ensures natural, human-feeling output
- [ ] Self-healing agent diagnoses repeated failures
- [ ] Nightly self-improvement cycle learns from corrections and patterns
- [ ] Notification abstraction (Telegram first, PWA push later)
- [ ] Knowledge graph integration (Neo4j + Graphiti, carried forward)
- [ ] All plugins published to pjschulz3004/claude-plugins marketplace

### Out of Scope

- API billing — all Claude usage through Max subscription via `claude -p`
- Mistral provider — Claude handles all reasoning, one LLM
- Python codebase — replaced entirely, not ported
- Multi-tenant support — single user (Paul)
- PWA push notifications — future, after Telegram works
- Mobile app — Telegram is the mobile interface

## Context

**Existing system:** Python Jarvis runs on VPS (Hetzner, 188.245.108.247) as systemd service. 10 heartbeat tasks, Telegram bot, Neo4j knowledge graph, circuit breakers, self-healing. 586 tests pass. Running in production for 5+ days.

**Plugin ecosystem:** Paul maintains `pjschulz3004/claude-plugins` with existing plugins (scribe, kg, improve, forge, library, union-writer). The new Jarvis plugins join this marketplace.

**Infrastructure:** VPS runs Neo4j (Docker), has Claude Code installed with Max subscription auth. Files sync between Elysium (workstation) and VPS via Mutagen. Git repo lives on VPS.

**Prior art worth preserving:** Heartbeat.yaml format, circuit breaker pattern, task ledger, connection-per-operation backends, quiet hours, deterministic-before-LLM classification.

## Constraints

- **Billing**: No API billing. Max subscription via `claude -p` CLI only
- **Runtime**: VPS (Hetzner) with systemd, same as current deployment
- **Ecosystem**: Must be Claude Code plugins publishable via GitHub marketplace
- **Language**: TypeScript end-to-end (daemon, tool libraries, MCP servers)
- **Auth**: Credentials via environment variables (same naming convention as Python)
- **Compatibility**: Old Python Jarvis runs in parallel until cutover

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript over Python | Primary target for Claude SDKs, plugin ecosystem is TS-native | — Pending |
| `claude -p` over Agent SDK | Uses Max subscription, no monkey-patching, structured JSON output | — Pending |
| Drop Mistral entirely | Claude handles all reasoning, eliminates dual-LLM complexity | — Pending |
| Daemon + Plugin (not pure plugin) | Daemon provides 24/7 autonomy; plugins provide composability | — Pending |
| Tool plugins as separate packages | Each independently installable and reusable | — Pending |
| imapflow for email | Modern, streaming, production-ready TS IMAP library | — Pending |
| tsdav for CalDAV/CardDAV | Single library covers both protocols, OAuth2 support | — Pending |
| ynab (official JS SDK) for budget | Direct equivalent of Python SDK, officially maintained | — Pending |
| telegraf for Telegram | Battle-tested, handler-based, matches aiogram patterns | — Pending |
| better-sqlite3 for state | Synchronous API simpler for daemon, proven in current system | — Pending |

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
*Last updated: 2026-03-31 after initialization*
