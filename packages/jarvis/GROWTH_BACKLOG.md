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
**Status:** queued
**Added:** 2026-04-01

GB-001 raised max_turns and simplified the prompt to 5 emails + 1 action per email. Next improvement: track correction rate over a week to see if the simplified classification (4 signals) produces accurate results, then tune the LLM fallback instructions for ambiguous emails.

### GB-003 Add email_cleanup task for auto-delete keywords
**Priority:** P2
**Type:** new-tool
**Status:** queued
**Added:** 2026-04-01

email-rules.md references $AutoDelete3d and $AutoDelete7d keywords for automated cleanup. No email_cleanup heartbeat task exists yet. Add a nightly task that searches for emails with these keywords and trashes ones past their TTL.

## Completed

### GB-001 Fix email_triage intermittent failures
**Priority:** P0
**Type:** fix
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Root cause: max_turns=15 was too low. Worst-case with 10 emails × 2 actions = 21 turns. Fixed by raising max_turns to 40 and reducing per-run email cap from 10 to 5 (worst case now 7 turns). Also simplified to one action per email and JSON-only output. Commit: 54a0748.

## Filed as GitHub Issues

(None yet)
