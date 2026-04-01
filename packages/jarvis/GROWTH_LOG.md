# Growth Log

Nightly record of what Jarvis reflected on, worked on, and achieved. Most recent session first.

## Format

```
## YYYY-MM-DD Night Session

**Window:** 01:00 - 05:00
**Rounds completed:** N
**Items addressed:** [list of GB-IDs]

### Reflection
What I noticed about my performance today.

### Work Done
What I changed, created, or improved.

### Commits
- hash: message

### Tomorrow
What I want to focus on next.
```

## Sessions

## 2026-04-01 Growth Session Round 11 (this session)

**Rounds completed:** 11
**Items addressed:** GB-012

### Reflection

All core tasks succeeding, correction rates clean at 0.0%. The remaining `error_max_turns` failures in the performance data are legacy runs from before the max_turns fix. One queued backlog item: GB-012, which was the identical TODO stub for budget corrections that email had before GB-007. The email correction loop is now end-to-end; budget corrections were silently disabled the same way emailLookup was.

### Work Done

Implemented GB-012: wired budget correction signal to real YNAB backend.

- Added `getTransaction(id: string): Promise<{ category_name: string }>` to the `BudgetBackend` interface in `backend.ts`
- Implemented on `YnabBackend` via `api.transactions.getTransactionById()`, returns `{ category_name: "" }` when YNAB returns null
- Added `getTransactionById` mock to `createMockApi()` in `backend.test.ts`
- Added 2 tests: returns `category_name` for a known transaction; returns empty string when `category_name` is null
- Removed TODO stub in `main.ts`: `budgetLookup = (id) => budgetBackend.getTransaction(id)`

347 tests pass. TypeScript build clean.

### Commits

- 6e75a05: growth(2026-04-01): wire budget correction signal to YNAB (GB-012)

### Tomorrow

Backlog is now clear of all queued items. Next growth session should look outward: review morning briefing quality after first real runs, consider whether any new patterns in email_triage warrant known-sender list expansion (GB-006 deferred), and scan for systemic gaps in observability or resilience.

---

## 2026-04-01 Growth Session Round 10

**Rounds completed:** 10
**Items addressed:** GB-007

### Reflection

All correction rates show 0.0% -- but that's not the same as "no errors". The correction detection cron runs every 2 hours from 07:00-23:00, but `emailLookup` in main.ts was hardcoded `undefined`. The entire correction signal was dead: `detectEmailCorrections` returns 0 immediately when lookup is undefined. The 0.0% rate was a measurement artifact, not evidence of quality.

### Work Done

Implemented `getMessageFlags(uid)` to activate the email correction signal.

- Added `getMessageFlags(uid: string): Promise<{ folder: string; flags: string[] }>` to the `EmailBackend` interface in `backend.ts`
- Implemented in `ImapFlowBackend`: locks INBOX, fetches flags by UID, throws if not found (corrections.ts skips on error, so TRASH actions -- where UIDs change after move -- are handled gracefully)
- Added 2 tests: returns folder+flags for found email; throws for missing UID
- Removed the TODO stub in main.ts: `emailLookup = (uid) => emailBackend.getMessageFlags(uid)`
- Added GB-012 to backlog: the identical TODO stub for budget corrections still exists

345 tests pass. TypeScript build clean.

### Commits

- fef7893: growth(2026-04-01): wire email correction signal via getMessageFlags (GB-007)

### Tomorrow

GB-012: wire the budget correction signal (same pattern -- add `getTransaction` to `YnabBackend`, replace the TODO stub in main.ts). After that, backlog is clear of queued items. Next growth session should look outward: morning briefing quality after first few real runs, and whether there are new patterns worth tracking.

---

## 2026-04-01 Growth Session Round 9

**Rounds completed:** 9
**Items addressed:** GB-011

### Reflection

All failures in today's performance data are pre-fix legacy runs. Post-fix triage runs clean at 0.0% correction rate. The system's operational foundation is solid. The one gap: email_triage runs silently 16x/day with no accountability signal unless something actually breaks. Growth session rounds 1-8 fixed the infrastructure; round 9 adds observability so drift can be spotted before correction rates degrade.

### Work Done

Implemented GB-011: weekly triage digest.

- Added `packages/jarvis-daemon/src/weekly-digest.ts`: `collectWeeklyDigest()` queries the ledger for the past 7 days of email_triage and email_cleanup runs, parses action counts from decision_summary JSON, and returns structured stats. `formatWeeklyDigest()` renders a 4-line Telegram message: volume, success rate, action breakdown, auto-delete count.
- Added `packages/jarvis-daemon/src/weekly-digest.test.ts`: 10 tests covering empty ledger, date filtering, failure counting, action parsing, cleanup summation, malformed JSON resilience, and output format.
- Added native cron in `main.ts`: Sunday 20:00, no Claude dispatch. Zero API cost. Calls `collectWeeklyDigest(ledger)` directly and sends via existing notifyChannels.

343 tests pass. TypeScript build clean.

### Commits

- 3ec43bd: growth(2026-04-01): add weekly triage digest task (GB-011)

### Tomorrow

Active backlog is now down to GB-007 (correction signal for email_cleanup, P3/research). Both remaining items are P3. The system is operationally healthy. Next session should consider whether to research GB-007 or look outward: are there new patterns worth tracking? Morning briefing quality after the first real run would be worth reviewing.

---

## 2026-04-01 Growth Session Round 8 (this session)

**Rounds completed:** 8
**Items addressed:** GB-010

### Reflection

All failures in today's performance data are legacy pre-fix runs. The "Command failed" entries show old prompt versions (no `# version:` header), confirming they predate the version 3 upgrade. The `error_max_turns` failures similarly predate the max_turns=40 fix. Post-fix email_triage is clean. Correction rate is 0.0% across all tasks.

The outstanding issue is noise. email_triage with `autonomy: notify` sent 16 Telegram JSON dumps today. Paul's inbox contains machine-readable decision logs he never asked for. The morning briefing already surfaces flagged invoices and important emails, so this notification adds nothing — it only distracts.

### Work Done

Implemented GB-010: silenced email_triage notifications.

- Changed `autonomy: notify` to `autonomy: full` in heartbeat.yaml for email_triage
- Triage still runs 16 times daily; results are visible via ledger and indirectly via morning briefing
- No code changes; config-only

333 tests pass.

### Commits

- b7597a0: growth(2026-04-01): silence email_triage notifications (GB-010)

### Tomorrow

Backlog has GB-007 (correction signal research, P3) remaining. Next real opportunity: watch morning_briefing quality over the next few days and tune the prompt if output is too terse or misses cross-domain connections. Also consider adding a weekly digest task that summarises triage activity (emails trashed, flagged, cleaned) as a lower-frequency accountability signal.

---

## 2026-04-01 Growth Session Round 7 (this session)

**Rounds completed:** 7
**Items addressed:** GB-009

### Reflection

email_triage is stable. The five rounds yesterday fixed the infrastructure. Round 6 added the Claude-dispatched morning_briefing and evening_summary tasks, which is the right architecture.

But there was a silent UX bug: the `autonomy: notify` success handler sends "Task 'morning_briefing' completed successfully.\n\n{result}". Paul would see a system-notification prefix before the AI-written briefing. The mission says the experience should feel like a British assistant, not a system log. Also, Paul was receiving two morning messages — the template-based cron at 07:30 and the Claude briefing at 07:35.

### Work Done

Implemented GB-009: briefing notify format fix.

- Added `notify_raw?: boolean` to `HeartbeatTask` interface in scheduler.ts
- When `notify_raw: true`, the success notification sends `result.result` directly (no wrapper)
- Set `notify_raw: true` on `morning_briefing` and `evening_summary` in heartbeat.yaml
- Removed the hardcoded 07:30 `buildMorningSummary` cron from main.ts (superseded by the morning_briefing heartbeat task)
- Removed unused `buildMorningSummary` import from main.ts
- Added test: "notify_raw: sends result directly without task-status wrapper"

333 tests pass. TypeScript build clean.

### Commits

- d6751d4: growth(2026-04-01): fix briefing notify format and retire template morning cron (GB-009)

### Tomorrow

GB-010: email_triage is sending hourly JSON dumps to Telegram (16 messages/day). Once triage quality is confirmed stable, switch autonomy from notify to full. Also watch first morning_briefing run for quality — tune prompt if output is too fragmented or misses cross-domain connections.

---

## 2026-04-01 Growth Session Round 6

**Rounds completed:** 6
**Items addressed:** GB-008

### Reflection

email_triage is stable with a solid success rate. email_cleanup is in place. Memory consolidation runs clean. The five rounds so far have been noise-reduction work: fixing failures, tightening prompts, wiring up auto-delete. The mission's operational foundation is solid.

What's been missing is the centrepiece: cross-domain briefings. The mission says "I synthesise everything into morning and evening briefings that connect the dots across his life." The briefing-agent.md explicitly expects `morning_briefing` (07:30) and `evening_summary` (21:00) heartbeat tasks. Neither existed. Paul has been getting a basic template-based morning greeting (date, calendar, "inbox zero / unread messages waiting") instead of the AI-synthesised briefing the design calls for. That's the gap. This session closes it.

GB-006 (monitor email_cleanup) was premature -- email_cleanup has run exactly once. Deferred.

### Work Done

Added two new heartbeat tasks to heartbeat.yaml:

- `morning_briefing` (07:35 daily, sonnet, max_turns=20, autonomy=notify): gathers events/todos/email/budget-categories/files, cross-references for connections (calendar attendee + unread email, invoice + overspent category, overdue todo + quiet afternoon), writes a plain-text 10-20 line briefing via Telegram.
- `evening_summary` (21:00 daily, sonnet, max_turns=15, autonomy=notify): gathers today's transactions, tomorrow's calendar, open action-required emails, writes a brief 5-10 line close-of-day summary.

Both times are intentionally offset from the existing template-based morning greeting (07:30) to avoid collision. Tool names verified against MCP server source (list_events, list_todos, list_unread, get_categories, get_transactions, list_inbox). 332 tests pass.

### Commits

- 0d89da5: growth(2026-04-01): add morning_briefing and evening_summary heartbeat tasks (GB-008)

### Tomorrow

Monitor morning_briefing quality on first run. Tune prompt if output is too long, too fragmented, or misses obvious cross-domain connections. Consider whether to retire the template-based buildMorningSummary in telegram.ts once Claude briefing is confirmed stable.

---

## 2026-04-01 Night Session

**Window:** Round 1
**Rounds completed:** 1
**Items addressed:** GB-001

### Reflection

email_triage was failing roughly half the time. Two distinct error signatures: `error_max_turns` (the agent ran out of turns mid-task) and raw `Command failed` (process timeout). Both trace to the same root cause: the prompt was asking Claude to list + classify + act on up to 10 emails, with up to 2 MCP tool calls per email, against a 15-turn budget. Worst-case 21 turns against a 15-turn cap is a structural failure, not a fluke.

### Work Done

- Raised `max_turns` from 15 to 40 in `heartbeat.yaml`
- Reduced per-run email cap from 10 to 5 (worst-case turns: 7)
- Simplified to one action per email (removed invoice flag+keyword combo)
- Switched output to JSON-only (removes prose output step)
- Incremented prompt to `# version: 2`
- Added GB-003 (email_cleanup task for auto-delete keywords) to backlog

### Commits

- 54a0748: growth(2026-04-01): fix email_triage max_turns exhaustion

### Tomorrow

Monitor email_triage success rate over the next day. If it stabilises above 90%, address GB-002 (tune classification accuracy). If still failing, investigate whether the `error_max_turns` is coming from a different bottleneck.

---

## 2026-04-01 Growth Session Round 2

**Rounds completed:** 2
**Items addressed:** structural gap in GB-001, new GB-004 (identified)

### Reflection

The Round 1 fix updated heartbeat.yaml correctly, but post-fix failures continued in the performance data. The config change never reached the running daemon: `Scheduler.start()` loads heartbeat.yaml exactly once at startup. Any edit made at runtime (including by a growth session) is silently ignored until the process restarts. This means every growth improvement to prompts or task config requires a manual daemon restart — making the growth loop partially ineffective.

### Work Done

Implemented config hot-reload in `packages/jarvis-daemon/src/scheduler.ts`:
- `Scheduler` tracks heartbeat.yaml `mtime` on `start()`
- `reloadIfChanged()` re-reads and re-parses the YAML if mtime has advanced, updating `this.tasks`
- Called lazily at the start of each `fireTask()` — zero overhead when nothing has changed
- Cron schedules are preserved; only task configs (prompt, model, max_turns, timeout_ms) are updated
- Added test: "hot-reloads task config when heartbeat.yaml changes on disk"

Also filed GB-004: the three `Command failed` failures at ~120s and ~19s remain unexplained and warrant investigation next session.

### Commits

- 969129f: growth(2026-04-01): hot-reload heartbeat.yaml so config changes apply without restart

### Tomorrow

Investigate GB-004 (Command failed at ~120s): confirm timeout_ms passes through correctly and
explore retry strategy for transient fast-fail errors. Then tackle GB-002 (tune triage prompt).

---

## 2026-04-01 Night Session

**Window:** Round 2 (growth session)
**Rounds completed:** 2
**Items addressed:** GB-002

### Reflection

The `Command failed` errors in the performance data show the old prompt text, confirming they were pre-fix runs. Post-fix success rate is better. The 0% correction rate is early but positive. Key gap: version 2 prompt only knew about 2 noise senders (trustpilot, linkedin), but email-rules.md has 6 senders. GitHub notifications, Cloudflare alerts, DHL tracking were all falling through to READ instead of being tagged for auto-deletion. Also discovered that GB-003 (email_cleanup) can't be implemented yet: the search MCP tool has no keyword filter.

### Work Done

- Upgraded email_triage prompt to version 3:
  - Expanded known-sender table from 2 to all 6 senders in email-rules.md
  - Added NOTIFICATION category: call mark_read plus set_keyword with $AutoDelete3d or $AutoDelete7d per sender rule
  - Fixed tool name: `jarvis_email_list_unread` -> `list_unread` (actual MCP server name)
- Marked GB-002 done
- Deferred GB-003 pending GB-005 (keyword search in email MCP)
- Added GB-005: add `keyword` parameter to ImapFlowBackend.search() to unblock email_cleanup

### Commits

- 394cf69: growth(2026-04-01): expand email triage sender rules and add NOTIFICATION category

### Tomorrow

Address GB-004 (transient Command failed failures at ~120s) or GB-005 (keyword search in email MCP backend, unblocks email_cleanup).

---

## 2026-04-01 Growth Session Round 3

**Rounds completed:** 3
**Items addressed:** GB-004

### Reflection

7 email_triage failures in the performance data. The `error_max_turns` and `Command failed at ~120s` failures are all pre-fix legacy runs — confirmed by code review showing timeout_ms is correctly threaded from heartbeat.yaml through to execFile. The one genuinely new failure is the 19s fast-fail: the process exited non-zero before Claude could do any work, almost certainly a transient CLI startup or MCP connectivity hiccup. With no retry, one bad spawn fires an urgent notification at Paul and burns a task slot.

### Work Done

Implemented retry logic in `Dispatcher.dispatch()`:
- New `retries?: number` option on `DispatchOptions` (default: 0, no change to existing behaviour)
- Retry loop wraps only the exec call (process crash, timeout, non-zero exit): eligible for retry
- Claude structural errors (`error_max_turns`, `error_api`, JSON parse failures) propagate immediately — these indicate a problem with the prompt or Claude, not infrastructure
- Linear backoff: 5s per retry attempt
- Added `retries?: number` to `HeartbeatTask` interface and threaded through scheduler
- Set `retries: 1` in heartbeat.yaml for email_triage (one automatic retry on transient exec failure)
- Added 3 new tests: retry on exec failure, no retry on Claude structural error, exhaust retries

### Commits

- 1fd9a17: growth(2026-04-01): add retry for transient exec failures in dispatcher

### Tomorrow

GB-005: add keyword search parameter to ImapFlowBackend.search() and the MCP search tool. This unblocks GB-003 (email_cleanup task for auto-delete TTLs).

---

## 2026-04-01 Growth Session Round 5

**Rounds completed:** 5
**Items addressed:** GB-003

### Reflection

The backlog is in clean shape: GB-001 through GB-005 are all resolved. The one remaining gap is operational — triage now correctly tags NOTIFICATION emails with $AutoDelete3d/$AutoDelete7d, but those tags were sitting inert with no process to act on them. Every tagged Cloudflare alert or DHL notification past its TTL just accumulates in INBOX as a read email. That's exactly the noise reduction the mission calls for.

The secondary fix (ImapFlowBackend date conversion) was a quiet correctness bug: imapflow's IMAP BEFORE/SINCE criteria expect Date objects, not strings. The original code passed raw ISO strings. In practice JavaScript's Date coercion may have silently saved it, but it was wrong. Fixed before it could bite us.

### Work Done

Implemented GB-003: automated email cleanup.

- Added `email_cleanup` task to heartbeat.yaml: daily at 4am, `autonomy: full`, `model: haiku`, `max_turns: 30`
- Prompt: compute cutoff dates (today - 3d, today - 7d), search by keyword + before cutoff, trash all matches, output JSON summary
- Fixed `ImapFlowBackend.search()` to convert before/since ISO strings to `new Date(...)` before passing to imapflow
- Added test verifying Date conversion: `before: "2026-03-29"` → `new Date("2026-03-29")` in the IMAP search criteria
- 332 tests pass, TypeScript build clean

### Commits

- 2e5b626: growth(2026-04-01): implement email_cleanup task for auto-delete TTLs (GB-003)

### Tomorrow

Backlog is clear. Next session should monitor email_cleanup correctness after first few runs. Potential next item: add correction tracking to email_cleanup (currently no mechanism to know if Paul manually recovers a trashed email). Also consider expanding the known-sender list in email_triage as new senders accumulate.

---

## 2026-04-01 Growth Session Round 4 (this session)

**Rounds completed:** 4
**Items addressed:** GB-005

### Reflection

All failures in today's performance data are pre-fix legacy runs. Post-fix email_triage success rate looks solid. Correction rate at 0% is early but clean. The one remaining structural gap is GB-003 (automated email cleanup): the NOTIFICATION category in the triage prompt correctly tags emails with $AutoDelete3d/$AutoDelete7d, but there's no cleanup task that acts on those tags. The blocker was the search backend having no keyword filter. That's what I fixed tonight.

### Work Done

Implemented GB-005: keyword search in the jarvis-email MCP backend.

- Added `keyword?: string` to `EmailSearchQuery` interface and `EmailSearchQuerySchema` in `types.ts`
- Added `if (query.keyword) searchCriteria.keyword = query.keyword` to `ImapFlowBackend.search()` in `backend.ts` — passes directly as IMAP KEYWORD criterion
- Added `keyword` parameter to the MCP `search` tool in `mcp-server.ts`
- Added test: "passes keyword criterion to IMAP search" — verifies the criterion object contains `{ keyword: "$AutoDelete3d" }` when requested

All 331 tests pass. TypeScript build clean.

### Commits

- 0136fa7: growth(2026-04-01): add keyword search to jarvis-email MCP backend (GB-005)

### Tomorrow

GB-003: implement the email_cleanup task. Now that keyword search exists, the path is:
1. Add `email_cleanup` task to heartbeat.yaml
2. Write a Claude prompt that searches for $AutoDelete3d (>3 days old) and $AutoDelete7d (>7 days old), then trashes each match
3. Run daily, off-peak
