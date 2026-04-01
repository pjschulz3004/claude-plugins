# Jarvis TypeScript Redesign

## What This Is

A ground-up redesign of Jarvis as a TypeScript system built on the Claude Code plugin architecture. Jarvis becomes a constellation of plugins published through Paul's GitHub marketplace (`pjschulz3004/claude-plugins`), plus a lean daemon on the VPS for autonomous operation.

## Core Value

A personal assistant that works when you're not looking (daemon) and when you are (plugin), with every tool independently reusable across any Claude Code instance.

## Architecture: Daemon + Plugin Library

Two deployment targets share the same tool libraries:

```
                  pjschulz3004/claude-plugins marketplace
                  ┌─────────────────────────────────────┐
                  │  jarvis          (orchestrator)      │
                  │  jarvis-email    (IMAP MCP server)   │
                  │  jarvis-calendar (CalDAV MCP server)  │
                  │  jarvis-contacts (CardDAV MCP server)  │
                  │  jarvis-budget   (YNAB MCP server)    │
                  │  jarvis-files    (storage MCP server)  │
                  └─────────────────────────────────────┘
                       ▲ install as plugins    ▲ import as npm packages
                       │                       │
              ┌────────┴────────┐    ┌─────────┴──────────┐
              │  Claude Code    │    │  jarvis-daemon      │
              │  (any machine)  │    │  (VPS systemd)      │
              │                 │    │                      │
              │  /jarvis:status │    │  scheduler           │
              │  /jarvis:inbox  │    │  telegram bot         │
              │  free-text chat │    │  circuit breakers     │
              │  tool access    │    │  task ledger          │
              └─────────────────┘    │  notification layer   │
                                     │  calls claude -p      │
                                     └──────────────────────┘
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Primary target for Claude SDKs, plugin ecosystem is TS-native, better library maturity |
| LLM billing | Max subscription via `claude -p` | No API billing. Daemon calls CLI, plugins run in Claude Code sessions |
| Mistral | Dropped (except Voxtral STT if needed) | Claude handles all reasoning. One LLM, not two |
| State management | SQLite (better-sqlite3) + filesystem | Proven in current system. Ledger, breaker state, chat history |
| Knowledge graph | Neo4j + Graphiti (keep) | Real value for cross-domain memory. Neo4j already running on VPS |
| Notification | Abstraction layer. Telegram first, PWA push later | Pluggable interface, don't lock in |
| Self-healing | Plugin skill, not daemon logic | Daemon records errors. Claude diagnoses via healing agent |
| Self-improvement | Nightly heartbeat task | Reads ledger + tool state, spots patterns, updates rules |

## Tool Plugins

Each tool plugin is both an installable Claude Code plugin (MCP server) and an npm package the daemon can import.

### Structure (each tool follows this pattern)

```
jarvis-tools/{name}/
  .claude-plugin/
    plugin.json              # MCP server declaration
  commands/
    {name}.md                # standalone commands (e.g., /jarvis-email:inbox)
  src/
    types.ts                 # data types (interfaces, zod schemas)
    backend.ts               # Backend interface + real implementation
    mcp-server.ts            # wraps backend methods as MCP tools
    index.ts                 # exports for npm consumption
  package.json               # "@jarvis/{name}"
  tsconfig.json
```

### Tool Inventory

| Plugin | Library | MCP Tools | Standalone Command |
|--------|---------|-----------|-------------------|
| jarvis-email | `imapflow` | list_unread, search, move, flag, trash, archive, list_folders, set_keyword, mark_read, mark_spam | /jarvis-email:inbox |
| jarvis-calendar | `tsdav` | list_events, list_todos, create_event, complete_todo, create_todo | /jarvis-calendar:today |
| jarvis-contacts | `tsdav` | search, search_by_email, get, create, update, delete | /jarvis-contacts:find |
| jarvis-budget | `ynab` | get_categories, get_transactions, categorize, batch_approve | /jarvis-budget:summary |
| jarvis-files | `node:fs` + rclone | list_inbox, list_outbox, save_to_inbox, archive, sync | /jarvis-files:inbox |

### Backend Interface Pattern

```typescript
// Every tool follows this contract
interface EmailBackend {
  listUnread(limit?: number): Promise<EmailSummary[]>
  moveEmail(uid: string, folder: string): Promise<void>
  // ...
}

// Real implementation
class ImapFlowBackend implements EmailBackend {
  constructor(config: IMAPConfig) { ... }
  // connection-per-operation pattern (proven reliable in Python version)
}

// MCP server wraps the interface
const server = createMcpServer("jarvis-email", [
  tool("list_unread", schema, (args) => backend.listUnread(args.limit)),
  // ...
])
```

### Credentials

Environment variables, same pattern as current system:
- `JARVIS_MAILBOX_EMAIL`, `JARVIS_MAILBOX_PASSWORD`, `JARVIS_MAILBOX_IMAP_HOST`
- `JARVIS_CALDAV_URL`, `JARVIS_CALDAV_EMAIL`, `JARVIS_CALDAV_PASSWORD`
- `JARVIS_CARDDAV_URL`, `JARVIS_CARDDAV_EMAIL`, `JARVIS_CARDDAV_PASSWORD`
- `JARVIS_YNAB_API_KEY`, `JARVIS_YNAB_BUDGET_ID`

Plugin `plugin.json` documents required env vars. Daemon loads from `.env` file.

## Jarvis Orchestrator Plugin

The assistant experience layer. Makes tool plugins feel like a unified assistant.

```
jarvis/
  .claude-plugin/
    plugin.json              # depends on tool plugins
  commands/
    status.md                # /jarvis:status
    briefing.md              # /jarvis:briefing
    ask.md                   # /jarvis:ask (free-text with full context)
  skills/
    triage/SKILL.md          # email classification (deterministic + LLM fallback)
    brief/SKILL.md           # cross-domain briefing synthesis
    filing/SKILL.md          # invoice extraction and smart naming
    healing/SKILL.md         # error diagnosis and recovery
    improve/SKILL.md         # nightly self-improvement cycle
  agents/
    email-agent.md           # focused email triage
    budget-agent.md          # budget check + categorization
    briefing-agent.md        # morning/evening briefing synthesis
    healing-agent.md         # diagnose repeated failures
    improve-agent.md         # nightly learning and rule evolution
  references/
    jarvis-voice.md          # personality, tone, response formatting rules
    email-rules.md           # triage rules, sender classifications (evolves over time)
    budget-rules.md          # categorization rules (evolves over time)
  jarvis.local.md            # per-installation state, learned preferences
```

### Model Tiering

| Agent | Model | Reasoning |
|-------|-------|-----------|
| email-agent | sonnet | Classification is pattern matching |
| budget-agent | haiku | Deterministic with LLM edge cases |
| briefing-agent | sonnet | Cross-domain synthesis |
| filing-agent | haiku | Simple structured output |
| healing-agent | sonnet | Error diagnosis needs reasoning |
| improve-agent | sonnet | Pattern analysis across domains |
| free-text (ask) | sonnet | Conversational with tool use |

### Voice Reference

All user-facing output follows `references/jarvis-voice.md`:
- Efficient, polite, slight dry British humour
- Plain text, no markdown in notifications
- Lead with the most important thing
- Connect related items across domains
- Be specific with numbers, amounts, names, times
- No sycophancy, no emoji, no filler

### Self-Healing

The daemon records all task outcomes in the ledger. When a task fails 3+ times consecutively, the daemon dispatches the healing agent via `claude -p`:

```
claude -p "Task email_triage has failed 3 times. Errors: [...]
Diagnose the root cause and fix it if possible.
Available tools: jarvis-email MCP tools.
If you cannot fix it, explain what manual intervention is needed."
```

The healing agent reads the error log, checks tool health (e.g., can IMAP connect?), and either fixes the problem or escalates to the user via notification.

### Nightly Self-Improvement

A heartbeat task (`self_improve`, runs at 03:00 nightly) dispatches the improve-agent. The agent:

1. Reads the task ledger: which tasks failed, which were slow, which produced empty results
2. Reads email triage outcomes: checks if emails were later moved to different folders (correction signal)
3. Reads budget state: checks if auto-categorized transactions were recategorized in YNAB
4. Reads Telegram chat history: spots recurring questions that could become proactive tasks
5. Updates `references/email-rules.md` with new sender classifications
6. Updates `references/budget-rules.md` with new payee-to-category mappings
7. Updates `jarvis.local.md` with performance metrics and learned preferences
8. Produces a brief summary notification: "Nightly review: learned 3 new email rules, adjusted 2 budget categories, flagged 1 recurring question for proactive task."

Full design of the improve cycle will be specced separately when we build it.

## Jarvis Daemon

Lean TypeScript service on VPS. Scheduling, dispatch, notifications. ~800 lines.

```
jarvis-daemon/
  src/
    main.ts                  # startup sequence, graceful shutdown
    scheduler.ts             # node-cron, reads heartbeat.yaml
    dispatcher.ts            # builds prompts, calls claude -p, parses JSON
    telegram.ts              # telegraf bot (slash commands + free-text relay)
    notify.ts                # NotifyChannel abstraction
    health.ts                # /health endpoint (JSON, for uptime kuma)
    state/
      ledger.ts              # task run recording (better-sqlite3)
      breakers.ts            # per-service circuit breaker
      history.ts             # telegram chat history (better-sqlite3)
  heartbeat.yaml             # declarative task schedule
  package.json
  tsconfig.json
  .env                       # all credentials
```

### Dispatch Flow

```
scheduler fires task
  → breaker check (is service circuit open? skip if yes)
  → build focused prompt from heartbeat.yaml instruction
  → spawn: claude -p "{prompt}" --output-format json --dangerously-skip-permissions
  → parse JSON result (content, cost, model, tool_calls)
  → record in ledger (task_name, status, duration, error)
  → if autonomy=notify: send via NotifyChannel
  → if failed: increment breaker failure count
  → if failed 3+ consecutive: dispatch healing agent
  → breaker update on success: reset failure count
```

### Telegram Relay

```
user sends message
  → store in chat history
  → load recent 10 messages for context
  → build prompt with conversation history
  → spawn: claude -p "{prompt}" --output-format json --dangerously-skip-permissions
  → parse response
  → store assistant message in chat history
  → send response to user via Telegram
```

### Notification Abstraction

```typescript
interface NotifyChannel {
  send(text: string, opts?: { urgent?: boolean }): Promise<void>
}

class TelegramChannel implements NotifyChannel {
  constructor(private bot: Telegraf, private chatId: string) {}
  async send(text: string, opts?) { ... }
}

// Future
class PWAPushChannel implements NotifyChannel { ... }
```

### What the Daemon Does NOT Do

- No triage logic, briefing synthesis, filing, or any domain intelligence (Claude does this via plugins)
- No LLM calls (Claude is the LLM, called via CLI)
- No knowledge graph operations

### What the Daemon MAY Import Directly

For simple Telegram slash commands (/inbox, /status, /budget), the daemon can import tool libraries directly to avoid a full `claude -p` round-trip for simple queries. These are read-only data fetches, not intelligence. The line: if it requires judgment, Claude handles it. If it's a database query or API fetch, the daemon can do it directly.

### Circuit Breakers

Same proven pattern from current Python system:
- Per-service (imap, caldav, carddav, ynab)
- 3 consecutive failures opens the breaker
- 60 second cooldown before half-open probe
- Network errors and 5xx trip the breaker; 4xx and auth errors do not
- State change triggers notification

### Heartbeat Tasks (preserved from current system)

| Task | Schedule | Autonomy | What Claude Does |
|------|----------|----------|-----------------|
| email_triage | hourly 7-23 | full | Classify, move, flag, trash emails using triage skill |
| email_cleanup | daily 2am | full | Delete expired auto-delete emails, archive read |
| calendar_reminder | every 15m 7-22 | notify | Check upcoming events, notify user |
| budget_check | daily 20:00 | notify | Spending summary, auto-categorize, budget alerts |
| invoice_filing | Monday 9am | notify | Extract PDFs from email, smart-name, file |
| file_archive | hourly 7-23 | full | Move outbox to archive/YYYY/MM/ |
| file_sync | daily 4am | notify | rclone sync to mailbox.org cloud |
| morning_briefing | daily 7:30 | notify | Cross-domain synthesis: calendar + email + budget + todos |
| evening_summary | daily 21:00 | notify | Today's spending + tomorrow's calendar |
| memory_consolidation | daily 3am | full | Expire stale KG edges, consolidate |
| self_improve | daily 3:30 | notify | Nightly learning cycle |

## Migration Strategy

### Phase 1: Foundation
- Set up monorepo structure in `pjschulz3004/claude-plugins`
- Build `jarvis-email` tool plugin (most complex, proves the pattern)
- Build daemon skeleton (scheduler, dispatcher, health endpoint)
- Verify `claude -p` dispatch works with email plugin on VPS

### Phase 2: Remaining Tools
- Build jarvis-calendar, jarvis-contacts, jarvis-budget, jarvis-files
- Each follows the proven pattern from Phase 1

### Phase 3: Orchestrator
- Build jarvis orchestrator plugin (commands, skills, agents)
- Voice reference, triage skill, briefing skill
- Wire into daemon heartbeat tasks

### Phase 4: Telegram + Notifications
- Add Telegram bot to daemon
- Wire free-text relay through `claude -p`
- Notification abstraction with Telegram implementation

### Phase 5: Intelligence
- Healing agent and skill
- Nightly self-improvement cycle
- Knowledge graph integration (Neo4j, carried forward)

### Phase 6: Cutover
- Run new daemon alongside old Python service (shadow mode)
- Compare outputs, verify parity
- Switch over, decommission Python version

## Constraints

- **No API billing.** All Claude usage through Max subscription via `claude -p` CLI
- **No Mistral.** Claude handles all reasoning. One LLM
- **Plugins must work standalone.** Each tool plugin is useful without the orchestrator
- **Daemon is dumb.** It schedules and dispatches. Claude thinks
- **VPS is the deployment target.** Hetzner, systemd, same as today
- **Credentials via env vars.** Same pattern, same variable names where possible

## What Gets Dropped

- Python codebase (replaced entirely)
- Mistral provider (classification, naming, transcription all via Claude)
- Agent SDK direct usage (replaced by `claude -p` CLI calls)
- Two-tier self-healing with error fingerprinting (replaced by simpler breaker + healing agent)
- In-process MCP server with monkey-patched SDK internals (replaced by proper plugin MCP servers)
- Fire-and-forget KG extraction in orchestrator (moved to plugin skill)

## What Gets Preserved

- Heartbeat.yaml format and task list
- Circuit breaker pattern (proven, simple, effective)
- Task ledger for observability
- Connection-per-operation backend pattern
- Quiet hours for notifications
- Credential env var naming convention
- Neo4j knowledge graph on VPS
- Explicit dependency injection (no global state)
- Deterministic-before-LLM classification strategy
