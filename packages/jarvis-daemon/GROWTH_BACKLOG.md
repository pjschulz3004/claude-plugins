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

- [ ] P1/expand: INVOICE action only flags — does not set $Invoice keyword. Add jarvis_email_set_keyword back once action reliability is confirmed (discovered during GB-001/GB-002 prompt review 2026-04-01)
- [ ] P2/tune: Email triage processes 5 oldest not 5 newest — may miss urgent recent mail. Evaluate whether "oldest" or "newest" is the right selection strategy after 1 week of data (discovered during GB-001 review 2026-04-01)
- [ ] P2/research: Investigate whether the ~120s `Command failed` timeouts are from the claude CLI internal limit or from execFile timeout misconfiguration — check if task.timeout_ms is being passed through correctly in all scheduler paths (discovered during root cause analysis 2026-04-01)

## Completed

### GB-001 Fix email_triage intermittent failures
**Priority:** P0
**Type:** fix
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

email_triage failed ~50% of the time with error_max_turns or timeout. Root cause: max_turns: 15 was too low for 10-email batches. Fixed by raising max_turns to 40 and cutting batch to 5 emails per run. Combined with GB-002 prompt simplification.

### GB-002 Tune email triage prompt for reliability
**Priority:** P0
**Type:** tune
**Status:** done
**Added:** 2026-04-01
**Completed:** 2026-04-01

Rewrote the prompt with explicit STEP structure, deterministic priority chain, one-action-per-email rule, and raw JSON output (no code fence). Version bumped to 2. Combined with GB-001 config fix.

## Filed as GitHub Issues

(None yet)
