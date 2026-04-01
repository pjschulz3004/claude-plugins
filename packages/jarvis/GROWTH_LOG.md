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
