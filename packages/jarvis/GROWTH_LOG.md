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
