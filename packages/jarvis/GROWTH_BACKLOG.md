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

### GB-001 Fix email_triage intermittent failures
**Priority:** P0
**Type:** fix
**Status:** queued
**Added:** 2026-04-01

email_triage fails ~50% of the time with error_max_turns or timeout. The prompt tries to do too much in one shot (list + classify + move + flag + mark read). Need to either simplify the prompt, increase max_turns, or split into multiple focused tasks.

### GB-002 Tune email triage prompt for reliability
**Priority:** P0
**Type:** tune
**Status:** queued
**Added:** 2026-04-01

Current prompt is too ambitious. Should focus on classification first, actions second. Consider splitting into email_triage (classify + report) and email_act (execute the classifications). Or simplify to fewer actions per run.

## Completed

(None yet — first growth session pending)

## Filed as GitHub Issues

(None yet)
