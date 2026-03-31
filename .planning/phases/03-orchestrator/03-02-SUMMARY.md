---
phase: 03-orchestrator
plan: 02
subsystem: jarvis-orchestrator
tags: [jarvis, orchestrator, skills, agents, triage, briefing, filing, model-tiering]
dependency_graph:
  requires: [jarvis-plugin-manifest, jarvis-commands, jarvis-voice-ref, jarvis-email-rules, jarvis-budget-rules]
  provides: [jarvis-triage-skill, jarvis-brief-skill, jarvis-filing-skill, jarvis-email-agent, jarvis-budget-agent, jarvis-briefing-agent]
  affects: [jarvis-email, jarvis-calendar, jarvis-budget, jarvis-files]
tech_stack:
  added: []
  patterns: [skill-procedure-markdown, agent-model-tiering, deterministic-first-classification, cross-domain-synthesis]
key_files:
  created:
    - packages/jarvis/skills/triage/SKILL.md
    - packages/jarvis/skills/brief/SKILL.md
    - packages/jarvis/skills/filing/SKILL.md
    - packages/jarvis/agents/email-agent.md
    - packages/jarvis/agents/budget-agent.md
    - packages/jarvis/agents/briefing-agent.md
  modified: []
decisions:
  - "Triage skill implements 4-signal deterministic chain in explicit priority order; LLM fallback only for ambiguous emails, with reason recorded for improve agent learning"
  - "Budget agent uses haiku model (cost-efficient for mechanical categorisation); email and briefing agents use sonnet (judgment-heavy tasks)"
  - "Filing skill gracefully handles unavailable PDF attachment content — flags email for manual download while still providing smart filename convention"
  - "Briefing agent has timing_behaviour section distinguishing morning vs evening vs manual invocation patterns"
  - "All agents reference jarvis-voice.md via ${CLAUDE_PLUGIN_ROOT} path — enforces consistent tone without duplicating rules"
metrics:
  duration: 4min
  completed: 2026-03-31T13:52:36Z
  tasks_completed: 2
  files_created: 6
---

# Phase 03 Plan 02: Skills and Agents Summary

Triage/brief/filing skills and email/budget/briefing agents completing the jarvis orchestrator plugin — pure markdown, no compilation, model tiering applied as specified.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Skills — triage, brief, filing | e016ebd | triage/SKILL.md, brief/SKILL.md, filing/SKILL.md |
| 2 | Agents — email-agent, budget-agent, briefing-agent | fe4a8a3 | email-agent.md, budget-agent.md, briefing-agent.md |

## What Was Built

### Skills

**triage/SKILL.md** — Email triage classification procedure. Six steps: load rules, fetch unread (limit 25), deterministic classification (4 signals: sender match -> List-Unsubscribe -> invoice keywords -> ambiguous), LLM fallback for ambiguous, route (business vs personal, folder move, trash noise, flag action_required), triage summary in jarvis-voice tone. References `email-rules.md` twice (load step and LLM fallback step). Includes example output format.

**brief/SKILL.md** — Cross-domain briefing synthesis. Four steps: load voice reference, gather data from all 5 tools (calendar events, todos, unread email, budget categories, files inbox), cross-reference (find calendar/email attendee matches, invoice/budget category connections, overdue todo opportunities), synthesise priority-ordered plain text briefing. Distinguishes morning vs evening emphasis. Includes concrete output example.

**filing/SKILL.md** — Invoice extraction and filing. Four steps: find invoice emails, extract and smart-name each (YYYY-MM-DD_{Company}_{Amount}.pdf), archive processed emails (mark read, leave in folder), summary. Handles gracefully when PDF attachment content is inaccessible via MCP — flags for manual download, still provides filename convention.

### Agents

**email-agent.md** — model: sonnet. Routes to triage/SKILL.md. Full email MCP tool set (8 tools + Read). Constraints include: noise preference only with deterministic signal, verify folder before move, 10-email trash limit per run. Error handling for MCP unavailability and rate limits.

**budget-agent.md** — model: haiku. Minimal YNAB tool set (4 tools + Read). Silent-when-confident: auto-categorises matching payees and sub-50 EUR recognisable payees without reporting. Surfaces: uncategorisable >50 EUR, overspent categories at 90%+. Specific amounts always.

**briefing-agent.md** — model: sonnet. All 5 domain tools (7 tools + Read). timing_behaviour section distinguishes morning/evening/manual invocation. Cross-domain patterns section with 4 specific connection templates. Explicit empty-inbox handling: "Quiet day. Nothing needs your attention." is a valid briefing.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All 6 files are fully specified. The filing skill gracefully handles the MCP attachment access uncertainty (an acknowledged open question) without stubbing.

## Self-Check: PASSED

Files verified:

- packages/jarvis/skills/triage/SKILL.md: FOUND
- packages/jarvis/skills/brief/SKILL.md: FOUND
- packages/jarvis/skills/filing/SKILL.md: FOUND
- packages/jarvis/agents/email-agent.md: FOUND
- packages/jarvis/agents/budget-agent.md: FOUND
- packages/jarvis/agents/briefing-agent.md: FOUND

Commits verified: e016ebd and fe4a8a3 both in git log.
