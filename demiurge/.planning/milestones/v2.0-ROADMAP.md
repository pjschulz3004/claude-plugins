# Roadmap: Demiurge — Forge-to-GSD Integration Layer

## Overview

Four phases deliver Forge's decomposition discipline as GSD-native files. Phase 1 lays the config and state schema that everything else reads. Phase 2 builds the workflow files — the actual behavioral logic for IGNITE, discipline wrapping, TEMPER, DELIVER, and autonomous loops. Phase 3 adds the GSD command files that wire users into those workflows. Phase 4 validates that all files survive the GSD update/reapply cycle intact.

v2.0 adds three phases: Phase 5 integrates Improve as a GSD-native phase command and workflow. Phase 6 uninstalls the standalone forge and improve plugins locally and marks them deprecated in the GitHub marketplace. Phase 7 finalizes the command reference and migration guide.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Config flag and forge.local.md state file schema (completed 2026-03-27)
- [x] **Phase 2: Workflows** - All nine workflow markdown files implementing Forge discipline (completed 2026-03-27)
- [x] **Phase 3: Commands** - Three GSD command files routing users into Forge workflows (completed 2026-03-27)
- [x] **Phase 4: Update Survival** - Patch registration and survival validation across gsd:update cycle (completed 2026-03-27)
- [x] **Phase 5: Improve Integration** - gsd:improve-phase command and forge-improve-phase.md workflow (completed 2026-03-28)
- [ ] **Phase 6: Plugin Deprecation** - Uninstall standalone plugins locally and mark deprecated on GitHub
- [ ] **Phase 7: Documentation** - Unified command reference and migration guide for standalone plugin users

## Archived Milestones

- **v1.0** — Forge-to-GSD integration (4 phases, 20 requirements, 8 plans). [Full roadmap](milestones/v1.0-ROADMAP.md) | [Requirements](milestones/v1.0-REQUIREMENTS.md)

## Phase Details

### Phase 1: Foundation
**Goal**: Config and state schema exist so all downstream workflows and commands have something to read and write
**Depends on**: Nothing (first phase)
**Requirements**: CFG-01, CFG-02
**Success Criteria** (what must be TRUE):
  1. `.planning/config.json` accepts `forge_discipline: true/false` without validation errors
  2. `forge.local.md` is created when a new Forge project starts and tracks phase, step, gate flags, health checks, and agent XP
  3. A workflow can read `forge.local.md` to determine current pipeline position
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Add forge_discipline config flag and create forge.local.md schema

### Phase 2: Workflows
**Goal**: All Forge behavioral logic is encoded as workflow files accessible to GSD agents
**Depends on**: Phase 1
**Requirements**: WF-01, WF-02, WF-03, WF-04, WF-05, WF-06, WF-07, WF-08, WF-09
**Success Criteria** (what must be TRUE):
  1. `forge-ignite.md` guides a session through SPEAK -> EXPLORE -> SHAPE_DOMAIN -> FIRST_1000_LINES and exits by invoking `gsd:new-project`
  2. `forge-discipline.md` identifies decomposition layers for a given phase, enforces types-first ordering, spawns specialist agents, and runs the 1-shot prompt test between phases
  3. `forge-temper.md` runs security review, performance audit, git diff review, and simplification as a standalone pass
  4. `forge-deliver.md` creates a PR with Forge-specific documentation
  5. `forge-autonomous.md` runs an autonomous loop calling the discipline wrapper for each phase
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Write forge-ignite.md (SPEAK -> EXPLORE -> SHAPE_DOMAIN -> FIRST_1000_LINES with gsd:new-project handoff)
- [x] 02-02-PLAN.md — Write forge-discipline.md (decomposition layer identification, agent routing, 1-shot test)
- [x] 02-03-PLAN.md — Write forge-temper.md (standalone hardening) + forge-deliver.md (PR with Forge docs)
- [x] 02-04-PLAN.md — Write forge-autonomous.md (Forge-native autonomous loop calling discipline wrapper)

### Phase 3: Commands
**Goal**: Users can invoke all Forge capabilities through GSD slash commands
**Depends on**: Phase 2
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05
**Success Criteria** (what must be TRUE):
  1. `/gsd:forge` routes to the correct phase workflow by reading `forge.local.md` state
  2. `/gsd:forge new` triggers the IGNITE workflow and creates `forge.local.md`
  3. `/gsd:forge status` displays a pipeline dashboard showing current phase, gate flags, and health check results
  4. `/gsd:forge-temper` runs the hardening pass without requiring a full pipeline context
  5. `/gsd:forge-autonomous` launches the autonomous discipline loop
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Write forge.md command (routing logic, new/status/reset subcommands)
- [x] 03-02-PLAN.md — Write forge-temper.md and forge-autonomous.md commands (standalone pass-through commands)

### Phase 4: Update Survival
**Goal**: All Demiurge files survive a full `gsd:update` + `gsd:reapply-patches` cycle without loss
**Depends on**: Phase 3
**Requirements**: UPD-01, UPD-02, UPD-03, UPD-04
**Success Criteria** (what must be TRUE):
  1. Running `gsd:update` backs up all files in `commands/gsd/` that belong to Demiurge
  2. Running `gsd:update` backs up all files in `get-shit-done/workflows/` that belong to Demiurge
  3. Running `gsd:reapply-patches` fully restores all Forge command and workflow files after an update
  4. Agent files at `~/.claude/agents/forge-*` remain untouched through the full update cycle
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — Validate file placement and document recovery procedure

### Phase 5: Improve Integration
**Goal**: Users can run an Improve rotation cycle as a GSD phase via a single command
**Depends on**: Phase 4
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. User can invoke `/gsd:improve-phase --duration 30m --category security` and the workflow starts
  2. The workflow produces a VERIFICATION.md that GSD's verifier phase can consume
  3. The `.autopilot` marker and time gate logic behave identically to the standalone `/improve` command
  4. Running `/improve` directly still works after the integration (no regression)
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Write forge-improve-phase.md workflow (rotation logic, time gate, autopilot, VERIFICATION.md output)
- [x] 05-02-PLAN.md — Write gsd:improve-phase command + verify /improve standalone has no regression

### Phase 6: Plugin Deprecation
**Goal**: Standalone forge and improve plugins are removed locally and marked deprecated on GitHub so no one installs outdated versions
**Depends on**: Phase 5
**Requirements**: DEP-01, DEP-02, DEP-03, DEP-04, MKT-01, MKT-02, MKT-03
**Success Criteria** (what must be TRUE):
  1. `claude plugin list` no longer shows forge or improve plugins installed locally
  2. All Forge and Improve capabilities remain accessible via GSD commands after uninstall
  3. No orphaned hooks, settings entries, or stale plugin path references remain in Claude Code config
  4. The pjschulz3004/claude-plugins repo shows deprecation banners on forge and improve with "migrate to Demiurge" instructions
**Plans**: TBD

### Phase 7: Documentation
**Goal**: Any user of standalone forge or improve can find and follow a clear migration path to Demiurge
**Depends on**: Phase 6
**Requirements**: DOC-01, DOC-02
**Success Criteria** (what must be TRUE):
  1. A single command reference page lists every `/gsd:forge*` and `/gsd:improve-phase` command with flags and usage examples
  2. A migration guide tells a standalone forge/improve user exactly what to uninstall, what to install, and what command replaces each old command
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/1 | Complete | 2026-03-27 |
| 2. Workflows | 4/4 | Complete | 2026-03-27 |
| 3. Commands | 2/2 | Complete | 2026-03-27 |
| 4. Update Survival | 1/1 | Complete | 2026-03-27 |
| 5. Improve Integration | 2/2 | Complete   | 2026-03-28 |
| 6. Plugin Deprecation | 0/TBD | Not started | - |
| 7. Documentation | 0/TBD | Not started | - |
