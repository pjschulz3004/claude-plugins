# Phase 2: Remaining Tools - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — follows proven pattern from Phase 1)

<domain>
## Phase Boundary

Build 4 tool plugins (calendar, contacts, budget, files) following the exact pattern proven in Phase 1 with jarvis-email: Backend interface + real implementation + MCP server + plugin manifest + standalone command.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Follow the jarvis-email pattern exactly:
- types.ts -> backend.ts -> mcp-server.ts -> index.ts
- .claude-plugin/plugin.json with mcpServers and userConfig
- .mcp.json with ${CLAUDE_PLUGIN_ROOT} variables
- commands/{name}.md with allowed-tools frontmatter
- Connection-per-operation pattern for all backends
- Retry on transient errors with exponential backoff
- TDD: write tests first

### Libraries (from research)
- Calendar + Contacts: tsdav (handles both CalDAV and CardDAV)
- Budget: ynab (official YNAB JS SDK v4.0.0)
- Files: node:fs + node:child_process (rclone for sync)

### Key learnings from Phase 1 to apply
- Use local textResult() helper in MCP server (not shared toolResult) for SDK type compatibility
- Accept testability params in constructors (like retryDelayMs in ImapFlowBackend)
- Root tsconfig only references packages that exist and compile

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- packages/jarvis-email/ — complete reference implementation of the tool plugin pattern
- packages/jarvis-shared/ — types, credentials, circuit breaker
- packages/jarvis-daemon/ — will import these new packages

### Established Patterns
- Backend interface + real implementation class
- MCP server wraps backend methods as tools with Zod schemas
- Plugin manifest with SessionStart hook for npm install
- Standalone command markdown with allowed-tools

### Integration Points
- Root tsconfig.json needs references for each new package
- Root package.json workspaces array needs each new package
- Daemon will import backends from these packages

</code_context>

<specifics>
## Specific Ideas

- mailbox.org uses standard CalDAV/CardDAV (research confirmed no EWS/JMAP)
- tsdav handles both calendar and contacts — verify auth against mailbox.org in Phase 2
- YNAB SDK returns UUID objects for IDs — must str() convert (learned from Python bug fix)
- Files plugin is pure filesystem + rclone subprocess — no external API

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
