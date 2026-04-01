# Growth Log

Nightly record of what Jarvis reflected on, worked on, and achieved. Most recent session first.

## Format

```
## YYYY-MM-DD Night Session

**Window:** HH:MM - HH:MM
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
**Items addressed:** GB-001, GB-002

### Reflection

email_triage failed ~50% of runs today. Two distinct failure modes: `error_max_turns` (Claude hits the 15-turn ceiling before finishing) and `Command failed` process timeouts (~120s, 4 instances). Both share the same root: 10 emails × multiple tool calls per email exceeds both the turn budget and the time budget. The successful runs (52s–115s) confirm the task is feasible with tighter constraints.

memory_consolidation ran once at 100% success. No concerns there.

### Work Done

**heartbeat.yaml — email_triage task:**
- `max_turns`: 15 → 40. The previous limit was simply too low for realistic email volumes. 40 gives generous headroom for 5 emails with tool-call round-trips.
- Batch size: 10 → 5 emails per run. Halves the work per invocation. Faster runs, fewer turns consumed, lower timeout risk.
- Prompt: Rewritten as explicit STEP 1–4 structure with deterministic priority chain (no LLM signal ambiguity), one-action-per-email rule (no combos), and raw JSON output without code fence. Version bumped to 2.
- Note: INVOICE action simplified to flag-only for now (keyword tagging deferred to backlog until action reliability is confirmed).

### Commits
- See git log — committed as "growth(2026-04-01): fix email_triage max_turns and simplify prompt"

### Tomorrow
- Monitor whether error_max_turns failures drop to near-zero with the new config.
- Investigate the ~120s Command failed timeouts — confirm whether timeout_ms is being passed through the scheduler correctly.
- Consider restoring $Invoice keyword tagging once reliability baseline is established.
