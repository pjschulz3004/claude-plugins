# Phase 6: Cutover - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Prepare the TS Jarvis daemon for production deployment alongside the existing Python service. Create systemd service file, .env template, shadow mode documentation, marketplace publishing checklist, and cutover runbook.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Systemd service file for jarvis-daemon (similar to existing jarvis.service)
- .env.example documenting all required env vars
- Shadow mode: second Telegram bot token to avoid 409 Conflict
- Publishing: each plugin needs to be installable from pjschulz3004/claude-plugins marketplace
- Cutover runbook: step-by-step procedure for stopping Python, starting TS, verifying

### What NOT to do
- Do NOT stop the Python Jarvis service
- Do NOT modify the Python codebase
- Do NOT publish to marketplace yet (that's a manual step for Paul)
- Shadow mode is documentation + config, not automated comparison

</decisions>

<code_context>
## Existing Code Insights

### Python Jarvis service
- Service file: /etc/systemd/system/jarvis.service
- Working dir: /home/paul/dev/tools/jarvis/
- Env file: /home/paul/dev/tools/jarvis/.env
- Health: http://localhost:8085/health

### TS daemon location
- packages/jarvis-daemon/ in this repo
- Will be deployed somewhere on VPS (e.g., ~/dev/claude/plugins/packages/jarvis-daemon/)
- Uses different health port to avoid conflict

</code_context>

<specifics>
## Specific Ideas

None beyond requirements.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
