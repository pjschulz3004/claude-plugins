# Phase 5: Improve Integration - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Create a GSD command (`gsd:improve-phase`) and workflow (`forge-improve-phase.md`) that wraps Improve's rotation cycle for use within GSD roadmaps. The standalone `/improve` command must continue working independently.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Source material: `~/.claude/commands/improve.md` (the standalone Improve command already in safe zone).

Key design constraints:
- **gsd:improve-phase command**: Thin wrapper in `~/.claude/commands/gsd/improve-phase.md`. Accepts `--duration`, `--category` flags. References the workflow file.
- **forge-improve-phase.md workflow**: Adapts Improve's rotation logic for GSD context. Key differences from standalone `/improve`:
  - Scoped to specific categories (not full 8-category rotation)
  - Produces GSD-compatible VERIFICATION.md (not `.improve-log.md`)
  - Reads phase context from GSD's `.planning/` directory
  - Respects `.autopilot` marker and hard time gates
  - Does NOT create `.improve-log.md` or `.improve-research.md` (those are for standalone mode)
- **No regression**: The standalone `/improve` command at `~/.claude/commands/improve.md` must not be modified
- **VERIFICATION.md format**: Must include frontmatter with `status: passed|gaps_found`, findings list, and requirement coverage

</decisions>

<code_context>
## Existing Code Insights

- Standalone improve command: `~/.claude/commands/improve.md` (safe zone, untouched)
- Improve scripts: `~/.claude/scripts/improve-auto-approve.sh`, `~/.claude/scripts/improve-autonomous.sh`
- GSD command format: YAML frontmatter + execution_context references (see existing forge*.md commands)
- GSD workflow format: XML-structured markdown with purpose/process/success_criteria
- Phase 1 config.json has `forge_discipline` flag — improve-phase does not need a config flag (always available)

</code_context>

<specifics>
## Specific Ideas

- The workflow should support `--category security,quality` to run only specific categories
- Default behavior (no flags): run security + quality cycles (the two highest-priority categories)
- Duration default: 30m for phase context (shorter than standalone's 1h default)

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
