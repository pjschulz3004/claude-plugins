# Jarvis Development Learnings

Collected during the v1.0 build (2026-03-31) and v2.0 growth intelligence milestone (2026-04-01/02).

## Architecture Learnings

### Direct API with OAuth beats CLI subprocess for interactive chat
The `claude -p` CLI works for batch tasks (heartbeat, growth sessions) but is terrible for interactive conversations: cold start per message, no persistent context, no streaming, MCP plugin loading issues. The direct Messages API with the discovered OAuth bearer token + `anthropic-beta: oauth-2025-04-20` header gives real-time streaming, persistent conversation, and the full tool loop. Use CLI for batch, API for interactive.

### The agentic tool loop is essential, not optional
Sending a single API call to Claude and expecting a complete response doesn't work for tool-using tasks. Claude returns `stop_reason: "tool_use"` and expects you to execute the tool and send results back. The loop: send → check stop_reason → if tool_use: execute locally, send result, loop → if end_turn: done. Tool execution costs zero tokens.

### Model fallback chain prevents dead silence
Max subscription rate limits are per-model. When Sonnet is exhausted, Haiku still works. The fallback chain (sonnet→haiku) means the user always gets a response, even if slightly less sophisticated. Never return an error if a cheaper model could answer.

## ImapFlow Learnings

### `fetch()` requires `{ uid: true }` as THIRD argument for UID-based fetch
`client.fetch("1114,1116", { uid: true, envelope: true })` does NOT fetch by UID — the `uid: true` in the second arg means "include UID in results", not "interpret input as UIDs". The correct call: `client.fetch("1114,1116", { uid: true, envelope: true }, { uid: true })`. The third argument controls whether the range is sequence numbers or UIDs. This caused "Invalid messageset" errors for months.

### `search()` returns UIDs when `{ uid: true }` is passed as second arg
This one works as expected: `client.search(criteria, { uid: true })` returns UID numbers.

### `logout()` throws on success — catch and swallow
ImapFlow's logout fires a disconnect event that sometimes throws. Wrapping logout in try/catch is required.

### `since`/`before` accept both Date objects and ISO strings
ImapFlow is lenient here. Both `since: new Date("2026-03-30")` and `since: "2026-03-30"` work.

## Telegram Bot Learnings

### Conversation memory MUST persist to disk
Storing conversation history in a JS `Map` means every daemon restart = amnesia. Conversations must be persisted to SQLite and restored on startup. The user expects Jarvis to remember what was discussed 5 minutes ago, even across deploys.

### Show typing indicators and tool progress
When Claude is using tools (5-15 seconds), the user sees nothing. Send a progress message that updates as tools are called ("Checking your inbox...", "Looking at your calendar..."). Delete it when the final response arrives.

### Healing agent notifications are noise, not signal
When a heartbeat task fails repeatedly, the healing agent tried to diagnose it. When the healing agent also failed, it sent an urgent Telegram notification every hour. The fix: healing triggers exactly once (at 3 consecutive failures, not every subsequent failure), and healing failures are logged silently, not sent to Telegram.

## Plugin Architecture Learnings

### Workspace dependencies break standalone plugin installation
Plugin packages that depend on `@jarvis/shared` (workspace `*` reference) can't be installed outside the monorepo. npm can't resolve `@jarvis/shared@*` from the public registry. The workaround: symlink the monorepo's `node_modules` into the plugin data directory. The proper fix (future): bundle shared code into each plugin or publish `@jarvis/shared` to npm.

### MCP server node_modules don't install via `claude -p`
The plugin SessionStart hook installs node_modules in interactive sessions. `claude -p` doesn't trigger SessionStart hooks. Without node_modules, the MCP server can't start, and all tools are invisible. This was the root cause of ALL heartbeat task failures for 12+ hours.

## E2E Testing Learnings

### LLMs intelligently reuse context — don't punish that
When you ask "check my inbox" followed by "did I miss anything important?", a smart assistant uses the inbox data already in context. Tests that require a fresh tool call for every question are testing the wrong thing. Test for meaningful responses, not mandatory tool calls.

### Non-deterministic responses require flexible assertions
The same prompt produces different responses each run. Test assertions should check: minimum response length, presence of key information (not exact wording), tool usage when truly required (first query of a domain), and error-free execution.

### E2E tests should clear conversation state between runs
Previous test conversations leak into new runs if not explicitly cleared. Call `api.clearConversation(chatId)` at the start of each test run.

## Growth Engine Learnings

### Self-improvement that edits config needs hot-reload
The growth engine modifies `heartbeat.yaml` (prompts, max_turns, etc.) but the scheduler loaded it once at startup. Changes were silently ignored until daemon restart. The fix: check file mtime before each task dispatch, reload if changed.

### Cross-model council prevents self-review blind spots
Having Mistral and OpenAI review Claude's self-improvements catches issues Claude doesn't see. The 3-round deliberation (independent review → cross-critique → final verdict) is more valuable than any single review.

### Regression detection needs a minimum threshold
Correction rate fluctuates naturally. Reverting on ANY increase (delta > 0) causes innocent commits to be reverted on random noise. The fix: require delta > 0.05 (5% increase) before triggering a revert.

## Cost and Rate Limit Learnings

### Max 20x subscription rate limits are per-model-tier
Opus, Sonnet, and Haiku each have independent quota pools. Burning through Sonnet doesn't affect Haiku. This enables the fallback chain.

### Growth sessions burn significant quota
Running 5+ growth rounds (each spawning `claude -p` with Sonnet) in rapid succession exhausts the Sonnet daily pool. Stagger growth rounds with longer pauses during the day. Reserve aggressive growth for the 01:00-05:00 nightly window.

### The OAuth token `sk-ant-oat01-*` works with the Messages API
Despite the public API returning "OAuth authentication not supported" by default, adding `anthropic-beta: oauth-2025-04-20` and using `Authorization: Bearer <token>` (not `x-api-key`) enables full API access on your Max subscription. Discovered by intercepting the Claude CLI's actual HTTP requests.
