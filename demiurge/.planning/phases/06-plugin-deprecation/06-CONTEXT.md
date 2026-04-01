# Phase 6: Plugin Deprecation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (operational phase)

<domain>
## Phase Boundary

Remove standalone forge and improve plugins from local Claude Code install. Mark them deprecated in the pjschulz3004/claude-plugins GitHub repo with migration notices pointing to Demiurge.

</domain>

<decisions>
## Implementation Decisions

### Local Uninstall
- Uninstall `forge@pjschulz-plugins` via `claude plugin uninstall`
- Uninstall `improve@pjschulz-plugins` via `claude plugin uninstall`
- After uninstall, verify: all GSD forge/improve commands still work, agents still in safe zone, scripts still present, no orphaned hooks or settings references
- The development source at ~/dev/claude/plugins/forge/ and ~/dev/claude/plugins/improve/ stays (it's the source repo, not the install)

### GitHub Marketplace
- In pjschulz3004/claude-plugins repo, update forge and improve plugin.json or README with deprecation notice
- Add migration instructions: "This plugin has been superseded by Demiurge. Install Demiurge instead: [instructions]"
- Do NOT delete the plugins from the repo — just mark deprecated so existing users see the notice

### Claude's Discretion
Exact format of deprecation notices and which files to modify in the GitHub repo.

</decisions>

<code_context>
## Existing Code Insights

- Installed plugins listed in ~/.claude/plugins/installed_plugins.json
- Plugin uninstall command: `claude plugin uninstall "forge@pjschulz-plugins"`
- GitHub repo: pjschulz3004/claude-plugins (accessible via gh CLI or MCP)
- Safe zone files that must survive: ~/.claude/agents/forge-*.md, ~/.claude/scripts/*, ~/.claude/commands/improve.md
- Patch zone files that must survive: ~/.claude/commands/gsd/forge*.md, ~/.claude/commands/gsd/improve-phase.md, ~/.claude/get-shit-done/workflows/forge-*.md

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
