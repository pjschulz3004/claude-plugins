# Domain Pitfalls

**Domain:** TypeScript personal assistant (daemon + Claude Code plugin constellation)
**Researched:** 2026-03-31
**Overall confidence:** MEDIUM-HIGH (mix of verified library docs and production experience reports)

## Critical Pitfalls

Mistakes that cause rewrites, production outages, or fundamental architecture problems.

### Pitfall 1: ImapFlow Does Not Auto-Reconnect

**What goes wrong:** ImapFlow fires a `close` event when the connection drops (network blip, server timeout, IMAP session expiry) but does NOT reconnect automatically. If your daemon holds a long-lived client expecting it to stay alive, you silently stop receiving mail events and all operations fail with "Connection not available."

**Why it happens:** ImapFlow is designed as a low-level client, not an auto-healing connection manager. The library author explicitly left reconnection to the consumer.

**Consequences:** Heartbeat tasks silently fail. Email triage stops working. Circuit breaker eventually trips but you lose hours of coverage before detection.

**Prevention:** Use the connection-per-operation pattern already proven in the Python Jarvis. Each backend method creates a fresh ImapFlow client, connects, performs the operation, and disconnects. Never hold a persistent IMAP connection in the daemon.

```typescript
// CORRECT: connection-per-operation
async listUnread(limit?: number): Promise<EmailSummary[]> {
  const client = new ImapFlow(this.config);
  try {
    await client.connect();
    // ... operations
    return results;
  } finally {
    await client.logout().catch(() => {}); // swallow logout errors (see Pitfall 2)
  }
}
```

**Detection:** Monitor for "Connection not available" errors in the task ledger. If email tasks start returning empty results silently, the connection died.

**Phase:** Phase 1 (Foundation). Must be correct from the first email backend implementation.

**Confidence:** HIGH -- verified from ImapFlow GitHub issues #14, #41, #63 and official docs.

---

### Pitfall 2: ImapFlow logout() Throws Even on Success

**What goes wrong:** Calling `client.logout()` throws "Connection not available" or "Connection closed" errors even when all operations completed successfully. This crashes your process if unhandled, or pollutes error logs with noise.

**Why it happens:** Known ImapFlow behavior (GitHub issue #161). The IMAP connection can close before the logout acknowledgment arrives, and ImapFlow treats this as an error.

**Consequences:** Unhandled promise rejection crashes the daemon. Noise in error logs masks real failures.

**Prevention:** Always wrap logout in a catch-and-swallow:

```typescript
await client.logout().catch(() => {});
// Or in a finally block with the same pattern
```

**Detection:** Unhandled promise rejections in Node.js logs. Process crashes with IMAP stack traces despite successful operations.

**Phase:** Phase 1 (Foundation). Built into the backend template from day one.

**Confidence:** HIGH -- documented in ImapFlow issue #161.

---

### Pitfall 3: `claude -p` Rate Limits on Max Subscription

**What goes wrong:** The daemon spawns `claude -p` for every heartbeat task (potentially 10+ per hour during peak). Max subscription has a weekly rolling rate limit, and multiple documented reports show rate limit errors at 16% reported usage. The daemon gets 429 errors, tasks fail, and the assistant goes dark.

**Why it happens:** Max subscription rate limits are opaque and use token bucket algorithm across RPM (requests per minute), TPM (tokens per minute), and a daily/weekly quota. All three are independent limits. The RPM limit is the one most likely to bite a daemon that fires multiple tasks in quick succession. Anthropic's usage dashboard can lag behind actual consumption.

**Consequences:** All heartbeat tasks fail simultaneously. Telegram relay stops working. If the healing agent is also rate-limited, the system cannot self-recover.

**Prevention:**
1. **Stagger heartbeat tasks** -- never fire multiple tasks in the same minute. Add jitter (30-60s random offset) to cron schedules.
2. **Respect `retry-after` header** -- parse it from 429 responses and implement exponential backoff in the dispatcher.
3. **Budget tracking** -- count tokens from `claude -p` JSON output (it includes usage metadata). Log cumulative weekly usage. Alert at 70% estimated capacity.
4. **Graceful degradation** -- when rate-limited, queue non-urgent tasks and only retry urgent ones (calendar reminders, morning briefing). Notify user that capacity is constrained.
5. **Direct tool import for simple queries** -- the spec already allows the daemon to import tool libraries directly for Telegram slash commands. Use this aggressively to avoid `claude -p` for read-only data fetches.

**Detection:** 429 status codes in dispatcher responses. Multiple consecutive task failures in the ledger within the same time window. `claude --account` shows rate limit status.

**Phase:** Phase 1 (Foundation) for backoff/retry. Phase 4 (Telegram) for direct import optimization.

**Confidence:** HIGH -- multiple GitHub issues (#27336, #27913, #28975, #29579, #32286) document this on Max plans.

---

### Pitfall 4: `claude -p` Subprocess Spawn and JSON Parsing Failures

**What goes wrong:** Spawning `claude -p` as a child process can hang if stdin is not explicitly handled. The JSON output can be malformed, truncated, or interspersed with non-JSON diagnostic lines. Naive `JSON.parse(stdout)` fails silently or crashes.

**Why it happens:** Known Claude Code bug where `-p` mode hangs when spawned without explicit stdin management. Additionally, Claude can produce streaming output that includes progress indicators or error messages mixed with the JSON payload. Process exhaustion bugs on macOS (though less relevant on Linux VPS) can also cause child process spawning to fail.

**Consequences:** Hung processes accumulate, consuming memory and PID slots. Failed JSON parses mean task results are lost. The daemon's scheduler backs up if dispatched tasks never complete.

**Prevention:**
1. **Always pipe stdin** -- pass `{ stdio: ['pipe', 'pipe', 'pipe'] }` to `child_process.spawn` and immediately close stdin.
2. **Set a timeout** -- kill the child process after a reasonable duration (60-90s for most tasks, 180s for complex briefings). Use `AbortController` with `execFile`.
3. **Robust JSON extraction** -- don't assume the entire stdout is valid JSON. Find the JSON boundary (first `{` to last `}`) or parse line by line, skipping non-JSON lines.
4. **Capture stderr separately** -- stderr contains diagnostic info. Log it but don't try to parse it as JSON.
5. **PID tracking** -- maintain a set of active child PIDs. On daemon shutdown, kill all outstanding children. On stale PID detection (task running > 5 minutes), force-kill and record failure.

```typescript
// Robust dispatcher pattern
const result = await execFileWithTimeout('claude', ['-p', prompt, '--output-format', 'json'], {
  timeout: 90_000,
  maxBuffer: 10 * 1024 * 1024, // 10MB
});
const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('No JSON in claude -p output');
return JSON.parse(jsonMatch[0]);
```

**Detection:** Tasks that never complete (timeout). JSON parse errors in dispatcher logs. Growing process count on the VPS.

**Phase:** Phase 1 (Foundation). The dispatcher is the single most critical piece of infrastructure.

**Confidence:** HIGH -- documented in Claude Code issues #771, process exhaustion blog post, and subprocess death issue reports.

---

### Pitfall 5: Telegram 409 Conflict from Duplicate Bot Instances

**What goes wrong:** If the old Python Jarvis Telegram bot and the new TypeScript daemon both poll with the same bot token, Telegram returns 409 Conflict: "terminated by other getUpdates request." One or both bots stop receiving updates entirely.

**Why it happens:** Telegram's API enforces a single active polling consumer per bot token. Two instances calling `getUpdates` simultaneously cause the conflict. This also happens during daemon restarts if the old process hasn't fully terminated before the new one starts.

**Consequences:** The bot appears dead to the user. Messages are lost or delivered to the wrong instance. During the migration period (Python and TypeScript running in parallel), this is almost guaranteed to occur.

**Prevention:**
1. **Separate bot tokens for migration** -- create a second Telegram bot for the new TypeScript daemon. Run both during shadow mode. Only switch the "production" token at cutover.
2. **Graceful shutdown in systemd** -- use `bot.stop('SIGTERM')` in the shutdown handler. Set `TimeoutStopSec=10` in the systemd unit to give telegraf time to cleanly disconnect.
3. **Webhook deletion on startup** -- call `telegram.deleteWebhook({ drop_pending_updates: false })` before starting long polling to clear any stale webhook from a previous session.
4. **Single-instance guard** -- write a PID file or use systemd's built-in `Type=notify` to prevent double-starts.

**Detection:** 409 errors in telegraf logs. User reports messages not being received. Two processes with the same bot token visible in `ps aux`.

**Phase:** Phase 4 (Telegram) for implementation. Phase 6 (Cutover) for migration token strategy.

**Confidence:** HIGH -- well-documented across telegram bot libraries (telegraf issue #832, node-telegram-bot-api issue #488).

---

### Pitfall 6: Telegraf Default Error Handler Kills the Process

**What goes wrong:** If any middleware or handler throws an error, telegraf calls `bot.handleError`. The default `handleError` implementation rethrows the error, which closes the update source and terminates the process. In a daemon context, this means a single unhandled error in a message handler kills Jarvis.

**Why it happens:** Telegraf's default behavior is designed for development (fail fast). Production daemons need resilience.

**Consequences:** One bad Telegram message or one failed `claude -p` call in the free-text relay kills the entire daemon. All heartbeat tasks stop. No notifications until systemd restarts it.

**Prevention:**
1. **Custom error handler** -- set `bot.catch((err, ctx) => { logger.error(err); })` that logs but does NOT rethrow.
2. **Per-handler try/catch** -- wrap every command and message handler in try/catch. Send the user an error message ("Something went wrong, I'll look into it") rather than dying.
3. **Isolate telegram from scheduler** -- if the telegram bot crashes, the heartbeat scheduler should continue running. Use process-level isolation or at minimum ensure the scheduler loop is independent of telegraf's event loop.

**Detection:** Daemon restarts visible in `journalctl -u jarvis`. Short uptime periods between restarts.

**Phase:** Phase 4 (Telegram). Must be set up before any user-facing bot deployment.

**Confidence:** HIGH -- documented in telegraf official docs and issue #241.

---

## Moderate Pitfalls

Issues that cause significant rework or debugging time but not full rewrites.

### Pitfall 7: tsdav + mailbox.org 2FA Breaks DAV Access

**What goes wrong:** When mailbox.org 2FA (TOTP) is enabled, the regular account password stops working for CalDAV/CardDAV access. tsdav basic auth fails with 401 Unauthorized. There is no app-specific password mechanism documented for mailbox.org DAV endpoints.

**Why it happens:** mailbox.org's 2FA implementation appears to block non-OAuth external access across the board, unlike providers like Google that offer app-specific passwords. The mailbox.org user forum has reports of DAV syncing breaking after enabling 2FA.

**Prevention:**
1. **Test early** -- verify tsdav can authenticate against mailbox.org CalDAV/CardDAV endpoints before building out the calendar and contacts plugins.
2. **Document the auth flow** -- if basic auth works only with 2FA disabled, document this constraint and accept it (Paul controls his own mailbox.org settings).
3. **Prepare for auth changes** -- the broader industry is moving toward OAuth2 for everything. tsdav supports OAuth2 and custom auth. Design the backend interface so swapping auth methods doesn't require rewriting callers.
4. **Use the correct URLs** -- mailbox.org CalDAV: `https://dav.mailbox.org/caldav/`, CardDAV: `https://dav.mailbox.org/carddav/`. Getting these wrong produces confusing 404s that look like auth failures.

**Detection:** 401 responses from tsdav operations. Intermittent auth failures after mailbox.org account changes.

**Phase:** Phase 2 (Remaining Tools). Block on this verification before building calendar/contacts.

**Confidence:** MEDIUM -- based on mailbox.org user forum reports, not directly verified with tsdav.

---

### Pitfall 8: better-sqlite3 Blocks the Event Loop

**What goes wrong:** better-sqlite3 is deliberately synchronous. Any query that takes more than a few milliseconds blocks the entire Node.js event loop. In a daemon that also runs a Telegram bot and HTTP health endpoint, a slow query freezes everything -- bot stops responding, health checks fail, heartbeat tasks can't fire.

**Why it happens:** SQLite is single-writer, single-reader by design. better-sqlite3 embraces this by providing a synchronous API. This is a feature for simple use cases but a liability in an event-loop-driven daemon.

**Consequences:** Health endpoint returns timeout to Uptime Kuma (false alarm or missed real outage). Telegram messages queue up during the block. Heartbeat tasks fire late.

**Prevention:**
1. **Keep queries fast** -- the task ledger and circuit breaker state are small datasets. With proper indexes, queries should complete in <1ms. This is only a problem if the database grows unbounded.
2. **Prune aggressively** -- delete ledger entries older than 30 days. Keep chat history to last 100 messages per conversation. Don't let SQLite grow beyond a few MB.
3. **WAL mode** -- enable `PRAGMA journal_mode = WAL` for better concurrent read performance.
4. **Avoid complex queries** -- no JOINs across large tables. If you need analytics, export to a separate process.
5. **Don't use worker threads unless you must** -- better-sqlite3 supports one connection per worker thread, but the complexity of worker communication outweighs the benefit for a daemon with tiny datasets. Only reach for workers if you prove the event loop is actually blocked.

**Detection:** Health endpoint response times >100ms. Telegram bot lag. Heartbeat tasks firing later than scheduled.

**Phase:** Phase 1 (Foundation) for WAL mode and pruning. Monitor throughout.

**Confidence:** HIGH -- this is by-design behavior of better-sqlite3, well-documented.

---

### Pitfall 9: Claude Code Plugin File Path Resolution After Installation

**What goes wrong:** When plugins are installed from a marketplace, they are copied to a cache directory (`~/.claude/plugins/`). Any file references that use relative paths outside the plugin directory break because only the plugin directory contents are copied. Skills, agents, and references files that reference each other with `../` paths or expect to be at a specific filesystem location will fail.

**Why it happens:** The plugin installation process copies the plugin directory structure but not the broader repository context. If `jarvis` (orchestrator) references files from `jarvis-email/`, those files won't be in the copied location.

**Consequences:** Orchestrator plugin can't find skill definitions, agent prompts, or voice reference files. Commands fail with file-not-found errors that are hard to diagnose because the plugin works in development but breaks after marketplace installation.

**Prevention:**
1. **Self-contained plugins** -- every plugin must contain all files it references. No cross-plugin file references.
2. **Orchestrator bundles its own references** -- the `jarvis` orchestrator plugin must include its own copies of `jarvis-voice.md`, skill definitions, and agent prompts. Don't reference them from tool plugin directories.
3. **Test after installation** -- always test plugins by installing from the marketplace, not by running from the source directory. The development environment masks path resolution bugs.
4. **Use absolute content, not file paths** -- for agent prompts and skill definitions, embed the content in the command/skill markdown files rather than using file references where possible.

**Detection:** "File not found" errors only appearing after marketplace installation. Plugins that work in development but fail for users.

**Phase:** Phase 1 (Foundation) for establishing the pattern. Phase 3 (Orchestrator) is the highest risk since it's the most file-reference-heavy plugin.

**Confidence:** HIGH -- documented in Claude Code plugin issues and marketplace distribution docs.

---

### Pitfall 10: TypeScript Monorepo Compilation Tangling

**What goes wrong:** With 6+ packages (jarvis-email, jarvis-calendar, jarvis-contacts, jarvis-budget, jarvis-files, jarvis-daemon, jarvis orchestrator) sharing a monorepo, TypeScript project references become a maintenance burden. The `references` array in each `tsconfig.json` must be manually kept in sync with actual import dependencies. Building one package may silently skip building its dependencies, leading to stale `.js` output.

**Why it happens:** TypeScript project references do not inherit through `extends`. Each package must explicitly declare its references. npm workspaces handle runtime resolution, but TypeScript compilation needs its own parallel dependency graph. Path aliases are compile-time only and need a bundler or runtime hook to actually resolve.

**Consequences:** Stale builds cause runtime errors where TypeScript compiled fine. Type checking passes but runtime imports fail. CI builds work but local development breaks (or vice versa) depending on build order.

**Prevention:**
1. **Use `tsc --build` from the root** -- this respects project references and builds in dependency order. Never use plain `tsc` in individual packages.
2. **Set `composite: true` and `declaration: true`** in every package's tsconfig.
3. **Use `moduleResolution: "nodenext"`** -- this matches actual Node.js resolution behavior and catches path alias issues at compile time.
4. **Automate reference generation** -- use `@monorepo-utils/workspaces-to-typescript-project-references` or a simple script that reads `package.json` dependencies and generates the `references` array.
5. **CI builds from clean state** -- always `tsc --build --clean && tsc --build` in CI to catch stale output issues.

**Detection:** "Cannot find module" errors at runtime that don't appear in `tsc` type-checking. Packages importing stale type definitions. Build order surprises in CI.

**Phase:** Phase 1 (Foundation). Get the monorepo structure right before adding packages.

**Confidence:** HIGH -- well-documented across Nx blog, monorepo.tools, and multiple TypeScript monorepo guides.

---

### Pitfall 11: MCP Server Transport Compatibility

**What goes wrong:** The MCP spec has two transport variants: legacy HTTP+SSE (2024-11-05 spec) and Streamable HTTP (2025-03-26 spec). Claude Code plugins use stdio transport for local MCP servers. If you build the MCP server assuming one transport and the consumer expects another, the server silently fails to connect.

**Why it happens:** The MCP ecosystem is in rapid evolution. Different clients support different transports. Claude Code plugins specifically use stdio transport (the server runs as a child process of Claude Code), but if you also want the daemon to consume the same MCP server, you need a different transport.

**Consequences:** MCP tools are invisible to Claude during `claude -p` calls because the server never connected. Tasks produce empty results with no obvious error.

**Prevention:**
1. **For Claude Code plugins: use stdio transport only.** This is what Claude Code expects for local plugin MCP servers.
2. **For daemon consumption: import the tool library directly** rather than going through MCP. The daemon should import `@jarvis/email` as an npm package independently, not attempt to connect to the MCP server.
3. **Don't over-abstract** -- the MCP server layer (`mcp-server.ts`) is a thin wrapper around the backend. The backend is the reusable unit, not the MCP server.

**Detection:** `claude -p` calls that should use tools but produce no tool_calls in the output JSON. MCP server process starts but no tools appear in Claude's tool list.

**Phase:** Phase 1 (Foundation). This is an architecture decision, not something to fix later.

**Confidence:** MEDIUM -- based on MCP roadmap docs and Claude Code plugin documentation. The stdio requirement for Claude Code plugins is well-established, but details of `claude -p` tool availability are less documented.

---

## Minor Pitfalls

Issues that cause debugging time or minor annoyances.

### Pitfall 12: ImapFlow IDLE Only Monitors Selected Folder

**What goes wrong:** If you use ImapFlow's IDLE feature for real-time new mail detection, it only detects changes in the currently selected mailbox (e.g., INBOX). Mail arriving in other folders (or moved between folders by server-side rules) is invisible.

**Prevention:** Not relevant for connection-per-operation pattern (the design already uses scheduled polling, not IDLE). Document this in case anyone later tries to "optimize" with IDLE.

**Phase:** N/A (informational).

**Confidence:** HIGH -- documented in ImapFlow docs.

---

### Pitfall 13: YNAB SDK Rate Limiting

**What goes wrong:** The YNAB API has its own rate limits (200 requests per hour per access token). The budget_check heartbeat task plus Telegram slash commands plus any ad-hoc budget queries can exceed this, especially during the nightly self-improvement cycle that reads transaction history.

**Prevention:** Cache YNAB data locally in SQLite with a 15-minute TTL. Batch reads. Use `last_knowledge_of_server` delta sync parameter instead of fetching full transaction lists.

**Phase:** Phase 2 (Remaining Tools) when building jarvis-budget.

**Confidence:** MEDIUM -- based on YNAB API documentation (not verified against current limits).

---

### Pitfall 14: node-cron vs Real Cron Scheduling Edge Cases

**What goes wrong:** node-cron (the likely scheduler for heartbeat.yaml) runs in-process and is subject to event loop delays. If a blocking operation (see Pitfall 8) delays the event loop by 2 seconds, a task scheduled at exactly `:00` may fire at `:02`. Two tasks scheduled close together may fire simultaneously.

**Prevention:** Add jitter to schedules (already needed for rate limiting -- Pitfall 3). Don't schedule tasks within 30 seconds of each other. Use `node-cron`'s timezone support to match user expectations.

**Phase:** Phase 1 (Foundation) when building the scheduler.

**Confidence:** HIGH -- inherent to in-process cron libraries.

---

### Pitfall 15: Environment Variable Leaks in `claude -p` Prompts

**What goes wrong:** The dispatcher builds prompts that may include error messages or debug context containing environment variable values (API keys, passwords). These get sent to Claude via `claude -p`, potentially logged, and appear in Claude's context window.

**Prevention:** Sanitize all error messages before including them in prompts. Never interpolate raw environment variable values into prompt strings. Use placeholder names like `[IMAP_PASSWORD]` in error context.

**Phase:** Phase 1 (Foundation) when building the dispatcher.

**Confidence:** HIGH -- common security pitfall in LLM-based systems.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | Monorepo structure wrong from start (P10) | Set up tsconfig references, npm workspaces, and build scripts before writing any tool code |
| Phase 1: Foundation | `claude -p` dispatcher fragile (P3, P4) | Build retry/backoff from day one. Test with artificial failures |
| Phase 1: Foundation | Plugin path resolution broken (P9) | Test jarvis-email via marketplace install, not source directory |
| Phase 2: Remaining Tools | mailbox.org 2FA blocks tsdav (P7) | Verify CalDAV/CardDAV auth before building plugins |
| Phase 2: Remaining Tools | YNAB rate limiting (P13) | Implement caching layer in budget backend |
| Phase 3: Orchestrator | Cross-plugin file references break after install (P9) | Bundle all referenced files within the orchestrator plugin |
| Phase 4: Telegram | 409 conflict during migration (P5) | Use separate bot token for new daemon |
| Phase 4: Telegram | Unhandled errors kill daemon (P6) | Custom error handler, per-handler try/catch |
| Phase 5: Intelligence | Rate limit pressure from healing + improve agents (P3) | Budget tokens carefully. Healing and improve agents are low priority -- defer if rate limited |
| Phase 6: Cutover | Dual bot token conflict (P5) | Clean token handoff procedure with webhook cleanup |

## Sources

- [ImapFlow connection management (DeepWiki)](https://deepwiki.com/postalsys/imapflow/3-connection-management)
- [ImapFlow logout error - Issue #161](https://github.com/postalsys/imapflow/issues/161)
- [ImapFlow IDLE stops listening - Issue #14](https://github.com/postalsys/imapflow/issues/14)
- [ImapFlow reconnect - Issue #63](https://github.com/postalsys/imapflow/issues/63)
- [Claude Code rate limit on Max - Issue #29579](https://github.com/anthropics/claude-code/issues/29579)
- [Claude Code rate limit on Max - Issue #27913](https://github.com/anthropics/claude-code/issues/27913)
- [Claude Code subprocess spawn - Issue #771](https://github.com/anthropics/claude-code/issues/771)
- [Claude Code process exhaustion fix](https://shivankaul.com/blog/claude-code-process-exhaustion)
- [Telegraf 409 conflict - Issue #832](https://github.com/telegraf/telegraf/issues/832)
- [Telegraf error handling - Issue #241](https://github.com/telegraf/telegraf/issues/241)
- [mailbox.org CalDAV authentication error (user forum)](https://userforum-en.mailbox.org/topic/3141-carddavcaldav-authentication-error)
- [better-sqlite3 worker threads - Issue #237](https://github.com/JoshuaWise/better-sqlite3/issues/237)
- [better-sqlite3 threads documentation](https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/threads.md)
- [MCP real faults taxonomy (arXiv)](https://arxiv.org/html/2603.05637v1)
- [MCP implementation tips (Nearform)](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- [Claude Code plugin marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [TypeScript project references (Nx blog)](https://nx.dev/blog/typescript-project-references)
- [npm workspaces + TS project references](https://medium.com/@cecylia.borek/setting-up-a-monorepo-using-npm-workspaces-and-typescript-project-references-307841e0ba4a)
- [tsdav GitHub](https://github.com/natelindev/tsdav)
- [YNAB API rate limits](https://api.ynab.com/)
