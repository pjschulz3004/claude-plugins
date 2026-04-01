# Phase 10: Prompt Optimisation — Context

## Decisions

- **D-01**: Prompt versions are tracked via a `# version: N` comment in heartbeat.yaml per task prompt (not a separate file)
- **D-02**: Per-version metrics stored in SQLite `prompt_versions` table alongside the existing task_runs table
- **D-03**: Growth engine proposes mutations using OPRO pattern (failure analysis -> propose improved prompt)
- **D-04**: A/B testing alternates between current and candidate version on consecutive scheduler runs
- **D-05**: After N runs (configurable, default 10), compare metrics and promote winner or revert loser

## Deferred Ideas

- DSPy/SIMBA full prompt compilation pipeline (deferred to v3+)
- Embedding-based classifier (deferred to v3+)

## Claude's Discretion

- Table schema design for prompt_versions
- How many runs before A/B comparison (default 10)
- Metric weighting for win/loss decision (success rate weighted highest, then tokens, then duration)

## Key Context

- `heartbeat.yaml` has 2 tasks: `email_triage` and `memory_consolidation`
- `scheduler.ts` reads heartbeat.yaml, creates cron jobs, dispatches via `Dispatcher`
- `ledger.ts` already tracks task_name, status, duration_ms, cost_usd, tokens per run
- `growth.ts` has the nightly loop that can modify heartbeat.yaml prompts (GROW-05)
- The growth prompt already instructs claude -p to edit heartbeat.yaml prompts
