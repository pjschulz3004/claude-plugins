# Phase 3: Commands - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Create 3 GSD command files in ~/.claude/commands/gsd/ that wire users into the Forge workflows built in Phase 2. Commands: forge.md (main entry with new/status/reset), forge-temper.md (standalone hardening), forge-autonomous.md (discipline-wrapped autonomous loop).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints:

- **forge.md**: Main entry point. Routes based on forge.local.md state: no file = offer `new`, has file = read phase and route to appropriate workflow. Subcommands: `new` (create forge.local.md, invoke forge-ignite workflow), `status` (display pipeline dashboard from forge.local.md), `reset` (clear forge state with confirmation). Reference: ~/dev/claude/plugins/forge/commands/forge.md for routing logic.

- **forge-temper.md**: Standalone command invoking forge-temper workflow. No forge.local.md requirement (can be run on any project). Frontmatter with allowed-tools.

- **forge-autonomous.md**: Command invoking forge-autonomous workflow. Accepts `--from N` flag. Frontmatter with allowed-tools including Task for agent spawning.

GSD command format: YAML frontmatter (name, description, allowed-tools) + markdown body with execution_context references to workflow files.

</decisions>

<code_context>
## Existing Code Insights

- Phase 2 delivered all 5 workflow files to ~/.claude/get-shit-done/workflows/forge-*.md
- forge.local.md schema defined in Phase 1 at project root
- forge_discipline config flag in .planning/config.json
- GSD command format reference: any file in ~/.claude/commands/gsd/*.md
- Forge's original command: ~/dev/claude/plugins/forge/commands/forge.md

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
