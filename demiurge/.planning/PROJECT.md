# Demiurge — Forge-to-GSD Integration Layer

## What This Is

Integration modules that bring Forge's development discipline (5-layer decomposition, Point & Call gates, specialist agent routing, architecture validation) into GSD's project lifecycle. Not a new plugin — a set of GSD-compatible commands, workflows, and agents that extend GSD with Forge's unique capabilities while delegating project management, state tracking, and git integration to GSD natively.

## Core Value

Forge's decomposition discipline (types-first, layer-ordered execution, 1-shot architecture tests) applied to GSD's phase execution — without maintaining a separate plugin or duplicating GSD's orchestration.

## Context

- GSD v1.30.0 is the project management backbone (57 commands, 18 agents, full lifecycle)
- Forge v0.1.2 is a custom plugin with a 4-phase pipeline (IGNITE -> SHAPE -> TEMPER -> DELIVER) and 6 specialist agents
- Improve v0.2.0 is a standalone improvement loop (already copied to safe zone, no GSD integration needed for v1)
- Forge agents are already copied to `~/.claude/agents/forge-*.md` (safe zone)
- Forge quality gate hook and decomposition template are already in place

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] `gsd:forge` command that routes to IGNITE/SHAPE/TEMPER/DELIVER workflows within GSD
- [ ] `forge-ignite` workflow adapted to produce GSD-compatible PROJECT.md and invoke `gsd:new-project`
- [ ] `forge-discipline` workflow wrapper that enforces decomposition order on GSD phase execution
- [ ] `forge-autonomous` command (Option A) — standalone autonomous loop with Forge discipline
- [ ] `forge-temper` workflow as standalone hardening pass (security, performance, diff review)
- [ ] `forge-deliver` workflow integrated with `gsd:ship`
- [ ] Opt-in config flag (`forge_discipline: true`) in `.planning/config.json`
- [ ] All patch-zone files survive `gsd:update` + `gsd:reapply-patches` cycle
- [ ] Decomposition template accessible from GSD workflows

### Out of Scope

- Improve-to-GSD integration (`improve-phase` command) — v2
- Modifying GSD core files (Option B rejected)
- Agent Teams support (experimental, not stable)
- Standalone Forge plugin maintenance (will be deprecated)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Option A for autonomous | Avoids patching GSD core, clean separation | gsd:forge-autonomous as separate command |
| Discipline wrapper opt-in | Doesn't interfere with vanilla GSD usage | Config flag in .planning/config.json |
| Forge agents in safe zone | Auto-preserved across GSD updates, no patching | Already done (~/.claude/agents/forge-*.md) |
| Improve stays standalone | Different paradigm (timed loop vs phase-based), already working | /improve command in safe zone |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current Milestone: v2.0 Improve Integration + Plugin Deprecation

**Goal:** Integrate Improve into GSD as a phase-compatible module, deprecate and remove standalone Forge and Improve plugins.

**Target features:**
- `gsd:improve-phase` command and workflow (run Improve rotation as GSD phase)
- Uninstall standalone forge and improve plugins locally
- Mark forge and improve as deprecated in pjschulz3004/claude-plugins
- Update documentation with unified command reference

## Current State

**v1.0 shipped** (2026-03-27) — 4 phases, 20 requirements, 8 plans, all verified.

Delivered:
- 3 GSD commands (`/gsd:forge`, `/gsd:forge-temper`, `/gsd:forge-autonomous`)
- 5 workflow files (ignite, discipline, temper, deliver, autonomous)
- 6 specialist agents in safe zone
- Config flag and state schema
- Update survival validated

---
*Last updated: 2026-03-27 after v1.0 milestone completion*
