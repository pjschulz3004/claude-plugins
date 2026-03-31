# Phase 3: Orchestrator - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (pure markdown phase — commands, skills, agents, references)

<domain>
## Phase Boundary

Build the jarvis orchestrator plugin: unified assistant commands (/jarvis:status, /jarvis:briefing, /jarvis:ask), skills (triage, brief, filing), agents (email-agent, budget-agent, briefing-agent), voice reference, and model tiering configuration.

This is a Claude Code plugin with NO compiled code. Everything is markdown with YAML frontmatter. The plugin declares dependencies on the tool plugins (jarvis-email, jarvis-calendar, etc.) via allowed-tools in commands.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Follow existing plugin patterns (scribe, kg) for structure.

Key design points from the spec:
- Voice reference defines tone: efficient, polite, slight British dry humour, no emoji, no markdown in notifications
- Model tiering per agent: haiku for simple, sonnet for synthesis
- Triage skill: deterministic rules first (email-rules.md), LLM fallback for ambiguous
- Briefing skill: cross-domain synthesis (calendar + email + budget + todos)
- Filing skill: extract PDFs from email, smart-name, file to inbox

### Pattern from existing plugins
- scribe has: commands/, skills/, agents/, references/ — same structure
- Commands use YAML frontmatter with allowed-tools listing MCP tools
- Skills contain step-by-step procedures
- Agents have model, tools, description in frontmatter

</decisions>

<code_context>
## Existing Code Insights

### Available MCP Tools (from Phase 1+2 plugins)
- jarvis-email: list_unread, search, move, flag, unflag, trash, archive, list_folders, set_keyword, mark_read
- jarvis-calendar: list_events, list_todos, create_event, complete_todo
- jarvis-contacts: search_contacts, get_contact, create_contact, update_contact
- jarvis-budget: get_categories, get_transactions, categorize_transaction, approve_transactions
- jarvis-files: list_inbox, list_outbox, save_to_inbox, move_to_outbox, archive_file, sync_webdav

### Reference plugins
- /home/paul/dev/claude/plugins/scribe/ — complex plugin with commands, skills, agents, references
- /home/paul/dev/claude/plugins/kg/ — MCP-integrated plugin

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the design spec.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
