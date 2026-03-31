# Architecture Patterns

**Domain:** TypeScript monorepo -- Claude Code plugin constellation + daemon
**Researched:** 2026-03-31

## Recommended Architecture

The system is a monorepo containing 5 tool plugins, 1 orchestrator plugin, and 1 daemon. Each tool plugin is both a Claude Code plugin (MCP server over stdio) and an importable npm package. The daemon is a standalone Node.js service that imports tool libraries directly for simple queries and shells out to `claude -p` for reasoning tasks.

```
pjschulz3004/claude-plugins (existing git repo)
|
|-- packages/
|   |-- jarvis-email/         # Tool plugin: IMAP via imapflow
|   |-- jarvis-calendar/      # Tool plugin: CalDAV via tsdav
|   |-- jarvis-contacts/      # Tool plugin: CardDAV via tsdav
|   |-- jarvis-budget/        # Tool plugin: YNAB via official SDK
|   |-- jarvis-files/         # Tool plugin: filesystem + rclone
|   |-- jarvis-shared/        # Shared types, credential loading, circuit breaker
|   |-- jarvis-daemon/        # VPS daemon (scheduler, dispatcher, telegram, health)
|
|-- jarvis/                   # Orchestrator plugin (commands, skills, agents, refs)
|
|-- forge/                    # Existing plugin (unchanged)
|-- scribe/                   # Existing plugin (unchanged)
|-- kg/                       # Existing plugin (unchanged)
|-- ...                       # Other existing plugins
```

### Why This Layout

The existing repo (`pjschulz3004/claude-plugins`) already contains plugins at the root level. Jarvis tool packages go in `packages/` because they are npm-publishable libraries with `package.json`, `tsconfig.json`, and build steps -- fundamentally different from pure-markdown plugins like scribe or forge. The orchestrator plugin (`jarvis/`) stays at root level because it is a standard Claude Code plugin (markdown commands, skills, agents) with no build step.

This avoids restructuring existing plugins while keeping the Jarvis TypeScript packages cleanly separated in a workspace.

## Component Boundaries

### Layer 1: jarvis-shared (foundation)

Shared code that every tool and the daemon imports. No external service dependencies.

| Export | Purpose |
|--------|---------|
| `loadCredentials(prefix)` | Read env vars with `JARVIS_` prefix, validate required keys |
| `CircuitBreaker` class | Per-service breaker (3 failures, 60s cooldown) |
| `TaskLedger` class | SQLite-backed run recording (better-sqlite3) |
| Common types | `ToolResult`, `CredentialConfig`, `BreakerState`, `LedgerEntry` |
| Zod schemas | Shared validation schemas for tool inputs/outputs |

**Boundary rule:** No network calls. No service-specific logic. Pure utilities and types.

### Layer 2: Tool Plugins (5 independent packages)

Each tool plugin follows an identical internal structure:

```
jarvis-{name}/
  .claude-plugin/
    plugin.json              # MCP server declaration, required env vars
  .mcp.json                  # MCP server config (command: node, args: dist/mcp-server.js)
  commands/
    {name}.md                # Standalone slash command (e.g., /jarvis-email:inbox)
  src/
    types.ts                 # Domain types (EmailSummary, CalendarEvent, etc.)
    backend.ts               # Interface + real implementation (connection-per-operation)
    mcp-server.ts            # McpServer from @modelcontextprotocol/sdk, registers tools
    index.ts                 # Re-exports for npm consumption by daemon
  package.json               # name: "@jarvis/{name}", main: dist/index.js
  tsconfig.json              # References jarvis-shared
```

**Boundary rules:**
- Each plugin depends only on `jarvis-shared` and its specific service library (imapflow, tsdav, ynab, node:fs).
- Tool plugins never import each other.
- The `mcp-server.ts` is the entry point when Claude Code spawns the plugin as an MCP server (stdio transport).
- The `index.ts` is the entry point when the daemon imports the package as a library.
- Backend classes use connection-per-operation: open connection, do work, close. No persistent connections.

**MCP server pattern (each tool):**

```typescript
// src/mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ImapFlowBackend } from "./backend.js";
import { loadCredentials } from "@jarvis/shared";

const creds = loadCredentials("MAILBOX");
const backend = new ImapFlowBackend(creds);
const server = new McpServer({ name: "jarvis-email", version: "1.0.0" });

server.registerTool("list_unread", {
  description: "List unread emails",
  inputSchema: z.object({ limit: z.number().optional().default(20) }),
}, async ({ limit }) => {
  const emails = await backend.listUnread(limit);
  return { content: [{ type: "text", text: JSON.stringify(emails) }] };
});

// ... more tools ...

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Plugin .mcp.json:**

```json
{
  "mcpServers": {
    "jarvis-email": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/mcp-server.js"],
      "env": {
        "NODE_PATH": "${CLAUDE_PLUGIN_DATA}/node_modules"
      }
    }
  }
}
```

**plugin.json:**

```json
{
  "name": "jarvis-email",
  "version": "1.0.0",
  "description": "IMAP email tools for Jarvis",
  "author": { "name": "Paul", "email": "paul@jschulz.org" },
  "license": "MIT",
  "keywords": ["email", "imap", "jarvis"],
  "userConfig": {
    "mailbox_email": { "description": "Mailbox email address", "sensitive": false },
    "mailbox_password": { "description": "Mailbox password", "sensitive": true },
    "mailbox_imap_host": { "description": "IMAP host", "sensitive": false }
  }
}
```

### Layer 3: Orchestrator Plugin (jarvis/)

A standard Claude Code plugin with no build step. Pure markdown. Provides the unified assistant experience.

```
jarvis/
  .claude-plugin/
    plugin.json              # Declares dependency on tool plugins (docs only)
  commands/
    status.md                # /jarvis:status
    briefing.md              # /jarvis:briefing
    ask.md                   # /jarvis:ask (free-text with full tool context)
  skills/
    triage/SKILL.md          # Email classification logic
    brief/SKILL.md           # Cross-domain briefing synthesis
    filing/SKILL.md          # Invoice extraction and filing
    healing/SKILL.md         # Error diagnosis
    improve/SKILL.md         # Nightly self-improvement
  agents/
    email-agent.md           # Focused email triage (model: sonnet)
    budget-agent.md          # Budget categorization (model: haiku)
    briefing-agent.md        # Morning/evening synthesis (model: sonnet)
    healing-agent.md         # Error diagnosis (model: sonnet)
    improve-agent.md         # Nightly learning (model: sonnet)
  references/
    jarvis-voice.md          # Personality and tone rules
    email-rules.md           # Evolving triage rules
    budget-rules.md          # Evolving categorization rules
  jarvis.local.md            # Per-installation learned state
```

**Boundary rules:**
- The orchestrator never contains TypeScript code. It is pure markdown.
- It assumes tool plugins are installed and their MCP tools are available.
- Commands and skills reference MCP tool names (e.g., `jarvis-email:list_unread`) but do not import code.
- Agent frontmatter specifies model tier and tool restrictions.

### Layer 4: Daemon (jarvis-daemon/)

Lean TypeScript service. Scheduling, dispatch, notifications. Imports tool libraries directly for simple reads. Shells out to `claude -p` for reasoning.

```
jarvis-daemon/
  src/
    main.ts                  # Startup, graceful shutdown (SIGTERM handler)
    scheduler.ts             # node-cron, reads heartbeat.yaml
    dispatcher.ts            # Builds prompts, spawns claude -p, parses JSON
    telegram.ts              # Telegraf bot (commands + free-text relay)
    notify.ts                # NotifyChannel abstraction
    health.ts                # HTTP /health endpoint for Uptime Kuma
    state/
      ledger.ts              # Task run recording (better-sqlite3)
      breakers.ts            # Per-service circuit breakers
      history.ts             # Telegram chat history (better-sqlite3)
  heartbeat.yaml             # Declarative task schedule
  package.json               # Depends on @jarvis/* packages
  tsconfig.json
  .env                       # All credentials
```

**Boundary rules:**
- The daemon has no LLM logic. Claude is the LLM, invoked via CLI.
- For simple Telegram commands (/inbox, /status, /budget): import `@jarvis/email`, `@jarvis/budget` directly, call backend methods, return plain data. No `claude -p` round-trip.
- For reasoning tasks (triage, briefing, filing): build a prompt, spawn `claude -p --output-format json --dangerously-skip-permissions --model sonnet`, parse JSON result.
- The daemon records all outcomes in the task ledger.
- Circuit breakers are checked before dispatch and updated after.

## Data Flow

### Flow 1: Claude Code User Invokes Tool (interactive)

```
User types /jarvis-email:inbox
  --> Claude Code loads jarvis-email plugin
  --> Plugin's MCP server starts (node dist/mcp-server.js, stdio transport)
  --> Claude calls list_unread MCP tool
  --> ImapFlowBackend opens IMAP connection, fetches mail, closes connection
  --> Returns JSON via MCP protocol
  --> Claude formats response using jarvis-voice.md reference
  --> User sees formatted email summary
```

### Flow 2: Daemon Heartbeat Task (autonomous)

```
node-cron fires "email_triage" task (hourly 7-23)
  --> scheduler.ts checks circuit breaker for "imap" service
  --> If open: skip, log to ledger, exit
  --> If closed: dispatcher.ts builds triage prompt
      - Loads heartbeat.yaml instruction for email_triage
      - Includes references/email-rules.md content
  --> Spawns: claude -p "{prompt}" --output-format json
                        --dangerously-skip-permissions
                        --model sonnet
                        --plugin-dir /path/to/jarvis-email
                        --plugin-dir /path/to/jarvis
  --> Claude uses jarvis-email MCP tools + triage skill
  --> Returns JSON: { type: "result", subtype: "success", result: "..." }
  --> dispatcher.ts parses result
  --> Records in ledger: task_name, status, duration, cost
  --> If autonomy=notify: sends summary via TelegramChannel
  --> If failed: increments breaker failure count
  --> If 3+ consecutive failures: dispatches healing-agent
```

### Flow 3: Telegram Free-Text Relay

```
User sends Telegram message "What's on my calendar today?"
  --> telegraf handler receives message
  --> Stores in chat history (SQLite)
  --> Loads last 10 messages for context
  --> Spawns: claude -p "{conversation}" --output-format json
                        --dangerously-skip-permissions
                        --model sonnet
                        --plugin-dir /path/to/jarvis-calendar
                        --plugin-dir /path/to/jarvis
  --> Claude uses jarvis-calendar MCP tools
  --> Returns structured response
  --> Stores assistant message in history
  --> Sends response to user via Telegram
```

### Flow 4: Daemon Simple Query (no LLM)

```
User sends /inbox Telegram command
  --> telegraf handler matches "/inbox"
  --> Directly imports @jarvis/email backend
  --> Calls backend.listUnread(5)
  --> Formats plain text summary
  --> Sends to user via Telegram
  --> No claude -p invocation (saves latency + tokens)
```

## claude -p Dispatch Pattern

The daemon spawns `claude -p` as a child process. This is the critical integration point.

```typescript
// src/dispatcher.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ClaudeResult {
  type: "result";
  subtype: "success" | "error_max_turns" | "error_api";
  result: string;
  session_id: string;
  total_cost_usd: number;
  duration_ms: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
  };
}

async function dispatch(
  prompt: string,
  opts: {
    model?: string;
    pluginDirs?: string[];
    maxTurns?: number;
    timeoutMs?: number;
  } = {}
): Promise<ClaudeResult> {
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--dangerously-skip-permissions",
  ];
  if (opts.model) args.push("--model", opts.model);
  if (opts.maxTurns) args.push("--max-turns", String(opts.maxTurns));
  for (const dir of opts.pluginDirs ?? []) {
    args.push("--plugin-dir", dir);
  }

  const { stdout } = await execFileAsync("claude", args, {
    timeout: opts.timeoutMs ?? 120_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
  });

  const result: ClaudeResult = JSON.parse(stdout);
  if (result.subtype !== "success") {
    throw new Error(`Claude dispatch failed: ${result.subtype} - ${result.result}`);
  }
  return result;
}
```

**Key flags:**
- `--output-format json`: Returns structured JSON with cost, usage, session_id
- `--dangerously-skip-permissions`: Required for unattended daemon operation
- `--plugin-dir`: Loads tool plugins for the session (can be repeated)
- `--model`: Selects model tier (sonnet for reasoning, haiku for simple tasks)
- `--max-turns`: Prevents runaway agent loops
- `--json-schema`: Can enforce structured output for specific tasks (e.g., triage classification)

**JSON response shape (HIGH confidence -- from official docs):**

```json
{
  "type": "result",
  "subtype": "success",
  "result": "Response text here",
  "session_id": "uuid",
  "total_cost_usd": 0.001234,
  "duration_ms": 2500,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 50,
    "cache_read_input_tokens": 1000
  }
}
```

## Monorepo Build Configuration

### npm Workspaces

The root `package.json` declares workspaces for all Jarvis TypeScript packages:

```json
{
  "private": true,
  "workspaces": [
    "packages/jarvis-shared",
    "packages/jarvis-email",
    "packages/jarvis-calendar",
    "packages/jarvis-contacts",
    "packages/jarvis-budget",
    "packages/jarvis-files",
    "packages/jarvis-daemon"
  ]
}
```

### TypeScript Project References

Each package has its own `tsconfig.json` that references its dependencies:

```json
// packages/jarvis-email/tsconfig.json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2022",
    "strict": true
  },
  "references": [
    { "path": "../jarvis-shared" }
  ]
}
```

A root `tsconfig.json` references all packages for `tsc --build`:

```json
// tsconfig.json (root)
{
  "references": [
    { "path": "packages/jarvis-shared" },
    { "path": "packages/jarvis-email" },
    { "path": "packages/jarvis-calendar" },
    { "path": "packages/jarvis-contacts" },
    { "path": "packages/jarvis-budget" },
    { "path": "packages/jarvis-files" },
    { "path": "packages/jarvis-daemon" }
  ]
}
```

**Build command:** `tsc --build` from root builds everything in dependency order.

### Plugin Distribution

Tool plugins need their `dist/` directory and `.claude-plugin/` to be present in the marketplace. The marketplace entry points to the package directory, and the `SessionStart` hook installs npm dependencies into `${CLAUDE_PLUGIN_DATA}/node_modules`:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install --omit=dev) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
      }]
    }]
  }
}
```

## Suggested Build Order

The build order follows dependency chains. Each layer depends only on the previous.

### Phase 1: Foundation

1. **jarvis-shared** -- Zero external deps. Types, credential loader, circuit breaker, ledger.
2. **jarvis-email** -- Proves the tool plugin pattern end-to-end.
3. **jarvis-daemon skeleton** -- Scheduler, dispatcher (dispatch function above), health endpoint. Wire to email plugin. Verify `claude -p` dispatch works on VPS.

**Phase 1 validates:** npm workspace builds, MCP server works as Claude Code plugin, `claude -p` dispatch works, daemon can import tool library directly.

### Phase 2: Remaining Tools

4. **jarvis-calendar** -- tsdav for CalDAV
5. **jarvis-contacts** -- tsdav for CardDAV (shares tsdav dependency with calendar)
6. **jarvis-budget** -- YNAB official SDK
7. **jarvis-files** -- node:fs + rclone CLI

Each follows the identical pattern proven in Phase 1. Can be built in parallel.

### Phase 3: Orchestrator

8. **jarvis/ orchestrator plugin** -- Commands, skills, agents, voice reference. No build step. Depends on tool plugins being installed (they provide MCP tools).

### Phase 4: Daemon Completion

9. **Telegram bot** -- telegraf, chat history, free-text relay
10. **Notification abstraction** -- TelegramChannel implementation
11. **Wire heartbeat tasks** -- Connect all tools to scheduler

### Phase 5: Intelligence

12. **Healing agent + skill**
13. **Self-improvement cycle**
14. **Knowledge graph** (Neo4j + Graphiti, carried forward)

### Phase 6: Cutover

15. **Shadow mode** -- Run alongside Python Jarvis, compare outputs
16. **Switch over** -- Decommission Python version

### Dependency Graph

```
jarvis-shared
  |
  +---> jarvis-email --------+
  +---> jarvis-calendar -----+
  +---> jarvis-contacts -----+--> jarvis-daemon
  +---> jarvis-budget -------+       |
  +---> jarvis-files --------+       v
                                 heartbeat.yaml
                                 telegram bot
                                 notification layer

  jarvis/ (orchestrator)
    No code deps -- references MCP tool names only
    Must be installed alongside tool plugins
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tool Plugins Importing Each Other
**What:** jarvis-calendar importing jarvis-contacts to resolve attendee names.
**Why bad:** Creates circular dependency risk, breaks independent installability.
**Instead:** Cross-domain correlation is Claude's job. The orchestrator skill tells Claude to use both tools. The tool plugins stay independent.

### Anti-Pattern 2: Daemon Contains Domain Logic
**What:** Putting email triage rules, budget categorization, or briefing synthesis in daemon code.
**Why bad:** Duplicates logic, can't evolve via self-improvement cycle, breaks the "daemon is dumb" principle.
**Instead:** Daemon dispatches to Claude with the right plugins loaded. Claude uses skills and references.

### Anti-Pattern 3: Persistent Backend Connections
**What:** Keeping IMAP/CalDAV connections alive between requests.
**Why bad:** Connections go stale, cause mysterious failures, require health-check logic.
**Instead:** Connection-per-operation. Open, work, close. Proven reliable in the Python version.

### Anti-Pattern 4: Building the Orchestrator as TypeScript
**What:** Writing the orchestrator plugin in TypeScript with a build step.
**Why bad:** Unnecessary complexity. The orchestrator is markdown commands, skills, agents, and reference docs. Claude interprets them directly.
**Instead:** Pure markdown. The existing plugins (forge, scribe, kg) prove this pattern works.

### Anti-Pattern 5: Using Agent SDK Instead of claude -p
**What:** Importing `@anthropic-ai/agent-sdk` in the daemon for programmatic LLM access.
**Why bad:** Requires API billing. Max subscription only works through the CLI.
**Instead:** `claude -p --output-format json` gives structured output with cost tracking, and uses the Max subscription.

## Scalability Considerations

| Concern | At 1 user (now) | At scale (if ever) |
|---------|-----------------|-------------------|
| Concurrent tasks | Sequential via node-cron | Parallel dispatch with semaphore |
| Plugin startup | ~1-2s per `claude -p` call | Acceptable for hourly tasks |
| SQLite contention | No issue, single writer | WAL mode already handles reads |
| MCP server lifecycle | Spawned per Claude Code session | No change needed |
| Credential management | Env vars | Same (single user, single VPS) |

## Sources

- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, MCP server config, directory structure (HIGH confidence)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference) -- `-p` flag, `--output-format json`, `--plugin-dir`, `--json-schema` (HIGH confidence)
- [MCP TypeScript SDK server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) -- McpServer, registerTool, StdioServerTransport (HIGH confidence)
- [Using Claude Code Programmatically (Gist)](https://gist.github.com/JacobFV/2c4a75bc6a835d2c1f6c863cfcbdfa5a) -- Node.js spawn patterns, JSON response shape, error handling (MEDIUM confidence)
- [npm Workspaces + TypeScript Project References](https://2ality.com/2021/07/simple-monorepos.html) -- Monorepo build patterns (HIGH confidence)
- [Claude Code Plugin SessionStart Hook Pattern](https://code.claude.com/docs/en/plugins-reference) -- `${CLAUDE_PLUGIN_DATA}` npm install pattern (HIGH confidence)
