# Phase 2: Workflows - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Create 5 workflow markdown files in ~/.claude/get-shit-done/workflows/ that encode Forge's behavioral logic for GSD consumption. These are: forge-ignite.md, forge-discipline.md, forge-temper.md, forge-deliver.md, and forge-autonomous.md.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Source material for each workflow:

- **forge-ignite.md**: Adapt from ~/dev/claude/plugins/forge/skills/forge-ignite/SKILL.md. Key change: at completion, invoke gsd:new-project instead of managing state independently. Preserve SPEAK -> EXPLORE -> SHAPE_DOMAIN -> FIRST_1000_LINES flow with Point & Call gates.

- **forge-discipline.md**: NEW file. Wraps GSD execute-phase with decomposition layer identification, types-first task ordering, specialist agent spawning (forge-backend for L1-3, forge-frontend + forge-designer for L4, forge-tester for L5), and 1-shot prompt test between phases. Reads forge_discipline flag from config.json. Only active when flag is true.

- **forge-temper.md**: Adapt from ~/dev/claude/plugins/forge/skills/forge-temper/SKILL.md. Make standalone (not dependent on forge.local.md phase tracking). Runs: security review (forge-reviewer), performance audit (forge-reviewer), git diff review (mandatory), code simplification, final test suite (forge-tester).

- **forge-deliver.md**: Adapt from ~/dev/claude/plugins/forge/skills/forge-deliver/SKILL.md. Integrate with gsd:ship for PR creation. Add Forge-specific documentation (decomposition layers, hardening findings, agent XP log).

- **forge-autonomous.md**: NEW file (Option A). Reimplements GSD autonomous loop but calls forge-discipline wrapper before/after each phase. Does NOT patch GSD's autonomous.md. Reads forge.local.md for state, uses gsd-tools.cjs for phase discovery and state management.

</decisions>

<code_context>
## Existing Code Insights

- forge.local.md schema created in Phase 1 (tracks phase, step, gates, health_checks, decomposition, agent_xp)
- forge_discipline config flag in .planning/config.json (Phase 1)
- Forge agents already in ~/.claude/agents/forge-*.md (6 agents: researcher, backend, frontend, designer, reviewer, tester)
- Decomposition template at ~/.claude/get-shit-done/templates/forge-decomposition.md
- GSD workflow format: XML-structured markdown with <purpose>, <process>, <success_criteria> sections
- GSD autonomous workflow at ~/.claude/get-shit-done/workflows/autonomous.md for reference

</code_context>

<specifics>
## Specific Ideas

- All workflows should follow GSD's existing markdown workflow format for consistency
- forge-discipline.md should be callable by forge-autonomous.md but also usable standalone
- forge-autonomous.md must use Skill() invocations (not Task()) for GSD commands to stay flat

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
