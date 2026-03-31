# Phase 1: Foundation + Email - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Prove the entire Jarvis TypeScript pattern end-to-end: npm workspaces monorepo builds, jarvis-shared types package, jarvis-email as a working Claude Code MCP server plugin, and jarvis-daemon skeleton that dispatches heartbeat tasks via `claude -p` and records outcomes.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and research findings to guide decisions.

Key research findings to incorporate:
- Use croner (not node-cron) for scheduling — TypeScript-native, handles DST/timezone
- Use vitest + Biome (not Jest + ESLint) — faster, zero-config TS support
- Use MCP SDK v1.28.0 with Zod ^3.25.0 for tool schemas
- Use Node.js 22 LTS native --env-file (no dotenv dependency)
- ImapFlow connection-per-operation pattern (no persistent connections, no auto-reconnect)
- better-sqlite3 for synchronous SQLite (simpler in daemon context)
- Plugin structure: .claude-plugin/plugin.json with mcpServers declaration
- Daemon dispatches via: claude -p "{prompt}" --output-format json --dangerously-skip-permissions

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing plugin structure in repo: scribe, kg, improve provide patterns for plugin.json, commands/, skills/
- Python Jarvis at ~/dev/tools/jarvis/ provides proven interfaces (EmailBackend, IMAPConfig, etc.) for TypeScript port
- heartbeat.yaml format is preserved from Python version

### Established Patterns
- Plugin manifest: .claude-plugin/plugin.json with name, version, description, mcpServers
- MCP tools named: mcp__{server}__{tool_name}
- Commands as markdown files with YAML frontmatter (allowed-tools, description)
- Credentials via JARVIS_* environment variables

### Integration Points
- Marketplace: pjschulz3004/claude-plugins (this repo)
- VPS deployment: systemd service at /home/paul/dev/tools/jarvis-daemon/ (or similar)
- Claude Code: plugins installed via marketplace, MCP servers auto-loaded

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description, success criteria, and research STACK.md/ARCHITECTURE.md for implementation guidance.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
