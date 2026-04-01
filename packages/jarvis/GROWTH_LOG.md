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
