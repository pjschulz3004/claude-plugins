---
phase: 03-orchestrator
plan: 01
subsystem: jarvis-orchestrator
tags: [jarvis, orchestrator, plugin, commands, voice, email-triage, budget]
dependency_graph:
  requires: []
  provides: [jarvis-plugin-manifest, jarvis-commands, jarvis-voice-ref, jarvis-email-rules, jarvis-budget-rules]
  affects: [jarvis-email, jarvis-calendar, jarvis-contacts, jarvis-budget, jarvis-files]
tech_stack:
  added: []
  patterns: [claude-plugin-markdown, mcp-allowed-tools, deterministic-rules-ref]
key_files:
  created:
    - packages/jarvis/.claude-plugin/plugin.json
    - packages/jarvis/commands/status.md
    - packages/jarvis/commands/briefing.md
    - packages/jarvis/commands/ask.md
    - packages/jarvis/references/jarvis-voice.md
    - packages/jarvis/references/email-rules.md
    - packages/jarvis/references/budget-rules.md
  modified: []
decisions:
  - "Jarvis orchestrator plugin has no MCP server declaration — it is pure markdown, referencing tool plugin MCP servers via allowed-tools in commands"
  - "status.md uses Bash + curl against health endpoint; JARVIS_HEALTH_URL env var overrides localhost:3333"
  - "email-rules.md uses deterministic-first pattern with LLM fallback; prefer reference over noise on uncertainty"
metrics:
  duration: 5min
  completed: 2026-03-31T13:46:31Z
  tasks_completed: 2
  files_created: 7
---

# Phase 03 Plan 01: Jarvis Orchestrator Plugin Summary

Jarvis orchestrator plugin skeleton with plugin manifest, three user-facing commands, and three reference files — pure markdown, no compilation, no TypeScript.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Plugin manifest, commands, and directory structure | 9d5e609 | plugin.json, status.md, briefing.md, ask.md |
| 2 | Voice reference and deterministic rules | ce4618c | jarvis-voice.md, email-rules.md, budget-rules.md |

## What Was Built

### Plugin Manifest

`packages/jarvis/.claude-plugin/plugin.json` declares the jarvis orchestrator plugin. No hooks, no userConfig, no MCP server — credentials and servers live in the 5 tool plugins. This plugin is purely a personality and routing layer.

### Commands

- **status.md**: Curls `http://localhost:3333/health` (or `JARVIS_HEALTH_URL` env var), parses the daemon health JSON shape (status, uptime_seconds, breakers, last_runs), formats output in Jarvis voice. Handles unreachable daemon gracefully.
- **briefing.md**: Gathers data from all 5 tool plugin MCP servers (email, calendar, budget, files), synthesises a cross-domain morning briefing. Routes to `skills/brief/SKILL.md` for the detailed synthesis procedure (Plan 02 will create that skill).
- **ask.md**: Free-text routing with full tool access across all 5 domains (19 MCP tool references). Read-only questions answered directly; action requests confirmed before execution.

### References

- **jarvis-voice.md**: Complete personality spec — efficient, polite, dry British humour. Explicit rules for no emoji, no filler, no sycophancy, no apologies. Cross-domain synthesis patterns. What Jarvis does not do.
- **email-rules.md**: 7 categories, deterministic 4-signal chain (sender rules -> List-Unsubscribe -> invoice keywords -> LLM fallback), 6 seeded sender rules from Python system, routing logic, LLM fallback heuristics with uncertainty bias toward reference.
- **budget-rules.md**: Categorisation principles (auto-categorise silently, learn from history), alert thresholds (90% category, 50 EUR uncategorisable), payee rules table placeholder for the improve agent.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `packages/jarvis/commands/briefing.md` routes to `${CLAUDE_PLUGIN_ROOT}/skills/brief/SKILL.md` which does not yet exist. This is intentional — Plan 03-02 creates the briefing skill. The command is functional without it (Claude will synthesise without the procedure), but the skill reference is a forward pointer.
- `packages/jarvis/references/budget-rules.md` payee rules table is empty. Intentional — the improve agent populates it from observed YNAB categorisations. No future plan is required; it is self-populating.

## Self-Check: PASSED

Files verified:

- packages/jarvis/.claude-plugin/plugin.json: FOUND
- packages/jarvis/commands/status.md: FOUND
- packages/jarvis/commands/briefing.md: FOUND
- packages/jarvis/commands/ask.md: FOUND
- packages/jarvis/references/jarvis-voice.md: FOUND
- packages/jarvis/references/email-rules.md: FOUND
- packages/jarvis/references/budget-rules.md: FOUND

Commits verified: 9d5e609 and ce4618c both in git log.
