# Phase 7: Stabilise + Instrument - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Fix email triage reliability (>90% success rate), polish Telegram UX (formatted responses, reliable free-text relay, friendly errors, morning greeting), and build the telemetry foundation (structured action logging, correction capture, rolling correction rates).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices at Claude's discretion. Key points from research and current issues:

**Email triage fix:**
- Root cause: plugins weren't loading via --plugin-dir. Now installed globally. Prompt was also too ambitious.
- The updated heartbeat.yaml prompt already references installed MCP tools directly
- Need to verify the fix works and add per-email decision logging

**Telegram UX:**
- Slash commands currently return raw data — format as human-readable text
- Free-text relay hits OAuth expiry — ensure daemon handles auth errors gracefully
- Error messages expose stack traces — catch and present user-friendly messages
- Morning greeting: daily status message at 07:30 (calendar + summary of what Jarvis did overnight)

**Telemetry:**
- New SQLite table: correction_events (task_name, original_decision, corrected_decision, timestamp)
- Existing task_runs table gets additional columns: decision_summary (text), features (JSON)
- Email correction detection: compare current folder to triage action log
- Budget correction detection: compare current YNAB category to auto-categorise action log
- Rolling correction rate: COUNT(corrections) / COUNT(decisions) over 7-day and 30-day windows

### Key research patterns to apply
- BMO lesson: "Without telemetry, reflections are qualitative and inconsistent"
- ACE lesson: Structured delta updates, not over-summarised
- SCOPE lesson: Separate tactical corrections from strategic patterns

</decisions>

<code_context>
## Existing Code Insights

### Files to modify
- packages/jarvis-daemon/src/state/ledger.ts — add correction_events table, add columns to task_runs
- packages/jarvis-daemon/src/telegram.ts — format slash command responses, improve error handling
- packages/jarvis-daemon/src/scheduler.ts — add telemetry logging after task completion
- packages/jarvis-daemon/heartbeat.yaml — verify email_triage prompt works with installed plugins

### Files to create
- packages/jarvis-daemon/src/state/telemetry.ts — correction capture and rolling rate computation
- packages/jarvis-daemon/src/state/telemetry.test.ts — tests for correction detection

</code_context>

<specifics>
## Specific Ideas

None beyond requirements.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
