# Growth Backlog

Items Jarvis has identified for self-improvement. Ordered by priority. Each night's growth session picks from the top of this list.

## Format

```
### [ID] Title
**Priority:** P0 (tonight) | P1 (this week) | P2 (when time allows)
**Type:** fix | tune | expand | new-tool | research
**Status:** queued | in-progress | done | deferred | filed-as-issue
**Added:** YYYY-MM-DD
**Completed:** YYYY-MM-DD (if done)

Description of what to do and why it matters.
```

## Active Backlog

### GB-002 Tune email triage prompt for reliability
**Priority:** P1
**Type:** tune
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Upgraded prompt to version 3: expanded known-sender list from 2 to 6 (matching email-rules.md), added NOTIFICATION category with auto-delete keyword tagging ($AutoDelete3d/$AutoDelete7d), fixed tool name (jarvis_email_list_unread -> list_unread). Commit: 394cf69.

### GB-003 Add email_cleanup task for auto-delete keywords
**Priority:** P2
**Type:** new-tool
**Status:** deferred
**Added:** 2026-04-01

email-rules.md references $AutoDelete3d and $AutoDelete7d keywords for automated cleanup. Blocked by GB-005: the jarvis-email search tool has no keyword/flag filter. Cannot implement cleanup without that backend capability first. Unblock after GB-005 is done.

### GB-005 Add keyword search to jarvis-email MCP backend
**Priority:** P2
**Type:** expand
**Status:** queued
**Added:** 2026-04-01

The email MCP search tool filters by: from, subject, since, before, folder, flagged, seen. It has no way to search by custom IMAP keyword ($AutoDelete3d, $AutoDelete7d). This blocks GB-003. Add a `keyword` parameter to ImapFlowBackend.search() and the MCP search tool. Verify ImapFlow supports KEYWORD search criteria.

### GB-004 Investigate Command failed at ~120s in email_triage
**Priority:** P1
**Type:** fix
**Status:** queued
**Added:** 2026-04-01

3 email_triage failures show `Command failed: claude -p ...` at ~120s (2 failures) and ~19s
(1 failure). The 120s failures are suspiciously close to the dispatcher's 120_000ms default
timeout, suggesting timeout_ms may not have been set in those runs. The 19s failure is a
fast-fail suggesting transient MCP connectivity or CLI startup issues.

Next: confirm timeout_ms is reliably passed through, and consider a retry strategy for
transient fast-fails (exit within <30s with non-zero code).

## Completed

### GB-001 Fix email_triage intermittent failures
**Priority:** P0
**Type:** fix
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Root cause: max_turns=15 was too low. Worst-case with 10 emails × 2 actions = 21 turns. Fixed by raising max_turns to 40 and reducing per-run email cap from 10 to 5 (worst case now 7 turns). Also simplified to one action per email and JSON-only output. Commit: 54a0748.

Structural gap: scheduler didn't hot-reload heartbeat.yaml, so config changes required daemon
restart to take effect — addressed in Round 1 growth session (commit 969129f).

## Filed as GitHub Issues

(None yet)
