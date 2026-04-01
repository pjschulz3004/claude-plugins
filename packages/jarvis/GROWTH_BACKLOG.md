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

### GB-014 Scheduler date injection for briefing prompts
**Priority:** P3
**Type:** tune
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Added `substituteTemplateVars()` private method to `Scheduler`. Replaces `{{date}}` with today's ISO date and `{{tomorrow}}` with tomorrow's before every dispatch call. Updated morning_briefing (v2) and evening_summary (v3) prompts to use template vars instead of prose descriptions. Test pins clock to 2026-04-15 and asserts exact substitution. Commit: 1dce8ce.

### GB-013 Tune evening_summary prompt for cross-domain synthesis
**Priority:** P2
**Type:** tune
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

The v1 prompt listed data linearly without connecting it. Added `get_categories` call so budget limits are available for comparison, added Step 2 cross-reference instructions (calendar attendee who emailed, category over budget, INVOICE email matching a transaction), and changed "tomorrow's first event" to all tomorrow's events. Raised max_turns from 15 to 20 for the extra tool call. Prompt structure now matches morning_briefing's gather→cross-reference→write pattern. Commit: 04f4433.

### GB-009 Fix briefing task notify format
**Priority:** P1
**Type:** fix
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

`autonomy: notify` success handler was wrapping every result in "Task X completed successfully.\n\n{result}". For briefing tasks (morning_briefing, evening_summary) this destroyed the experience — Paul would see a system-notification prefix before the AI-written briefing text.

Added `notify_raw: boolean` field to HeartbeatTask. When true, sends result.result directly without wrapper. Set on morning_briefing and evening_summary in heartbeat.yaml.

Also removed the hardcoded 07:30 buildMorningSummary cron from main.ts — it was sending a low-quality template briefing 5 minutes before the Claude-dispatched morning_briefing, creating duplicate messages. Commit: d6751d4.

### GB-010 Reduce email_triage notification noise
**Priority:** P2
**Type:** tune
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Switched email_triage from `autonomy: notify` to `autonomy: full`. Triage quality confirmed at 0.0% correction rate. Morning briefing already surfaces inbox state (flagged invoices, important emails) so the hourly JSON dumps were pure noise. Triage continues to run silently 16 times/day; results visible via ledger. Commit: b7597a0.

### GB-011 Weekly triage digest
**Priority:** P3
**Type:** new-tool
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Native Sunday 20:00 cron in main.ts. Queries ledger directly (no Claude dispatch, zero API cost). Sends a 4-line Telegram summary: volume, success rate, action breakdown (trash/flag/read), and auto-delete count from email_cleanup. Commit: 3ec43bd.

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
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Added `email_cleanup` task to heartbeat.yaml (runs 4am daily, autonomy: full, model: haiku).
Prompt searches for $AutoDelete3d emails older than 3 days and $AutoDelete7d emails older than
7 days, then trashes all matches. Also fixed ImapFlowBackend.search() to convert before/since
ISO strings to Date objects (imapflow expects Date, not string). Commit: 2e5b626.

### GB-005 Add keyword search to jarvis-email MCP backend
**Priority:** P2
**Type:** expand
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Added `keyword?: string` to `EmailSearchQuery` interface and Zod schema, threaded it through `ImapFlowBackend.search()` as an IMAP KEYWORD criterion, exposed it as an optional parameter on the MCP `search` tool, and added a test verifying the criterion passes through correctly. Commit: 0136fa7.

### GB-004 Investigate Command failed at ~120s in email_triage
**Priority:** P1
**Type:** fix
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Code review confirmed timeout_ms is correctly threaded through (heartbeat.yaml → HeartbeatTask
→ DispatchOptions → execFile). The 120s failures were legacy runs before hot-reload was
working. The 19s fast-fail was a transient exec issue.

Fixed: implemented retry loop in Dispatcher.dispatch(). Retries wrap only the exec call
(process crash / CLI startup failure); Claude structural errors (error_max_turns, error_api)
propagate immediately without retry. Added retries: 1 to email_triage so a transient MCP
blip gets one automatic retry with 5s backoff. Commit: 1fd9a17.

### GB-015 Inject {{date}} into email_cleanup cutoff arithmetic
**Priority:** P3
**Type:** tune
**Status:** queued
**Added:** 2026-04-01

email_cleanup asks Claude to compute cutoff_3d and cutoff_7d from "today's date (UTC)". Now that the scheduler injects {{date}}, the prompt can receive the base date explicitly and just subtract days — removing another date-inference dependency. Low priority: Claude arithmetic is reliable here, but the pattern is now inconsistent with the briefing prompts.

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

### GB-008 Add morning_briefing and evening_summary heartbeat tasks
**Priority:** P1
**Type:** new-tool
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Added two Claude-dispatched briefing tasks to heartbeat.yaml:
- `morning_briefing` at 07:35: gathers calendar, todos, email, budget categories, and files; synthesises cross-domain connections; delivers plain-text briefing via Telegram notify.
- `evening_summary` at 21:00: gathers today's transactions, tomorrow's calendar, open action-required emails; brief 5-10 line close-of-day summary.
Both use sonnet model, autonomy: notify. Completes the mission's core promise of cross-domain briefings. Commit: 0d89da5.

### GB-006 Monitor email_cleanup and expand known-sender list
**Priority:** P2
**Type:** tune
**Status:** deferred
**Added:** 2026-04-01

After email_cleanup has run for a few days: review ledger for errors or unexpected trashing. Expand the known-sender table in the email_triage prompt as new automated senders accumulate. No code change required -- just observation and a heartbeat.yaml edit. Deferred: email_cleanup only ran for the first time today, insufficient data.

### GB-007 Correction signal for email_cleanup
**Priority:** P3
**Type:** research
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Research found the correction detection cron was already wired in main.ts (every 2h, 07-23), but `emailLookup` was hardcoded `undefined` pending `getMessageFlags` on ImapFlowBackend. Implemented `getMessageFlags(uid)` on both the `EmailBackend` interface and `ImapFlowBackend`: fetches flags for a UID in INBOX, throws if not found. Wired the email lookup in main.ts, removing the TODO stub.

Scope note: correction detection works for in-place mutations (IMPORTANT/INVOICE flag checks, NEWSLETTER mark_read). TRASH actions are not detectable via UID (IMAP UIDs change on folder move) -- correction.ts skips emails that throw from lookup, so this is handled gracefully. Commit: fef7893.

### GB-012 Wire budget correction signal
**Priority:** P3
**Type:** expand
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Added `getTransaction(id)` to `BudgetBackend` interface and `YnabBackend` (calls `getTransactionById`, returns `{ category_name }` with empty-string fallback for null). Removed TODO stub in `main.ts` and wired the real lookup. Commit: 6e75a05.

## Filed as GitHub Issues

(None yet)
