# Requirements — Jarvis TypeScript Redesign

## v1 Requirements

### Monorepo Foundation (MONO)

- [ ] **MONO-01**: Developer can build all packages from repo root with single command (`npm run build`)
- [ ] **MONO-02**: TypeScript project references resolve cross-package imports at compile time
- [ ] **MONO-03**: Vitest runs all tests from repo root with single command (`npm test`)
- [ ] **MONO-04**: Biome enforces consistent code style across all packages
- [ ] **MONO-05**: Shared types package (`jarvis-shared`) exports common interfaces (Backend, Config, types)

### Email Tool Plugin (EMAIL)

- [ ] **EMAIL-01**: User can list unread emails via MCP tool `jarvis_email_list_unread`
- [ ] **EMAIL-02**: User can search emails by sender, subject, date range, folder via MCP tool
- [ ] **EMAIL-03**: User can move emails between IMAP folders via MCP tool
- [ ] **EMAIL-04**: User can flag, unflag, trash, archive, mark read/spam emails via MCP tools
- [ ] **EMAIL-05**: User can list all IMAP folders via MCP tool
- [ ] **EMAIL-06**: User can set custom IMAP keywords ($AutoDelete3d, $AutoDelete7d, etc.) via MCP tool
- [ ] **EMAIL-07**: Plugin works standalone as Claude Code plugin without orchestrator or daemon
- [ ] **EMAIL-08**: Plugin exposes `/jarvis-email:inbox` standalone command
- [ ] **EMAIL-09**: ImapFlow backend uses connection-per-operation pattern (no persistent connections)
- [ ] **EMAIL-10**: Backend retries on transient errors (ConnectionError, Timeout) with exponential backoff

### Calendar Tool Plugin (CAL)

- [ ] **CAL-01**: User can list calendar events for a date range via MCP tool
- [ ] **CAL-02**: User can list pending VTODOs via MCP tool
- [ ] **CAL-03**: User can create calendar events via MCP tool (only when explicitly asked)
- [ ] **CAL-04**: User can complete a VTODO via MCP tool
- [ ] **CAL-05**: Plugin works standalone as Claude Code plugin
- [ ] **CAL-06**: Plugin exposes `/jarvis-calendar:today` standalone command
- [ ] **CAL-07**: tsdav backend authenticates against mailbox.org CalDAV

### Contacts Tool Plugin (CONT)

- [ ] **CONT-01**: User can search contacts by name, email, or organization via MCP tool
- [ ] **CONT-02**: User can get full contact details via MCP tool
- [ ] **CONT-03**: User can create and update contacts via MCP tool
- [ ] **CONT-04**: Plugin works standalone as Claude Code plugin
- [ ] **CONT-05**: tsdav backend authenticates against mailbox.org CardDAV

### Budget Tool Plugin (BUD)

- [ ] **BUD-01**: User can view budget categories with balances via MCP tool
- [ ] **BUD-02**: User can view transactions by date range via MCP tool
- [ ] **BUD-03**: User can categorize uncategorized transactions via MCP tool
- [ ] **BUD-04**: User can batch-approve transactions via MCP tool
- [ ] **BUD-05**: Plugin works standalone as Claude Code plugin
- [ ] **BUD-06**: Plugin exposes `/jarvis-budget:summary` standalone command
- [ ] **BUD-07**: YNAB SDK backend handles UUID-to-string conversion (no SQLite binding errors)

### Files Tool Plugin (FILE)

- [ ] **FILE-01**: User can list inbox and outbox files via MCP tool
- [ ] **FILE-02**: User can save files to inbox via MCP tool
- [ ] **FILE-03**: User can move files from inbox to outbox via MCP tool
- [ ] **FILE-04**: User can archive outbox files to archive/YYYY/MM/ via MCP tool
- [ ] **FILE-05**: Plugin works standalone as Claude Code plugin
- [ ] **FILE-06**: rclone sync to mailbox.org WebDAV works from daemon

### Daemon Core (DAEMON)

- [ ] **DAEMON-01**: Daemon starts as systemd service on VPS and stays running
- [ ] **DAEMON-02**: Heartbeat scheduler reads heartbeat.yaml and fires tasks on cron schedule
- [ ] **DAEMON-03**: Dispatcher calls `claude -p` with focused prompts and parses JSON output
- [ ] **DAEMON-04**: Circuit breakers per service (imap, caldav, carddav, ynab) prevent cascading failures
- [ ] **DAEMON-05**: Task ledger records every heartbeat run (task_name, status, duration, error) in SQLite
- [ ] **DAEMON-06**: Health endpoint returns JSON at /health for Uptime Kuma monitoring
- [ ] **DAEMON-07**: Graceful shutdown on SIGTERM (stop scheduler, close DB, close bot)
- [ ] **DAEMON-08**: `claude -p` dispatch uses Max subscription (no ANTHROPIC_API_KEY set)
- [ ] **DAEMON-09**: Dispatcher stagger tasks with jitter to avoid rate limit bursts

### Orchestrator Plugin (ORCH)

- [ ] **ORCH-01**: `/jarvis:status` shows system health (uptime, breakers, last task)
- [ ] **ORCH-02**: `/jarvis:briefing` produces cross-domain synthesis (calendar + email + budget + todos)
- [ ] **ORCH-03**: `/jarvis:ask` routes free-text through Claude with full context (calendar, recent tasks, KG)
- [ ] **ORCH-04**: Voice reference (`jarvis-voice.md`) defines tone: efficient, polite, slight British humour
- [ ] **ORCH-05**: Email triage skill classifies emails deterministically first, LLM fallback for ambiguous
- [ ] **ORCH-06**: Briefing skill synthesizes cross-domain data into natural language
- [ ] **ORCH-07**: Filing skill extracts PDFs from email, smart-names, files to inbox
- [ ] **ORCH-08**: Model tiering: haiku for simple tasks, sonnet for synthesis, per agent config

### Telegram + Notifications (TG)

- [ ] **TG-01**: Telegram bot responds to 7 slash commands (/start, /status, /inbox, /today, /budget, /tasks, /history)
- [ ] **TG-02**: Free-text messages relayed to `claude -p` with conversation history (last 10 messages)
- [ ] **TG-03**: Notifications sent for tasks with autonomy=notify
- [ ] **TG-04**: Quiet hours (23:00-07:00) suppress non-urgent notifications
- [ ] **TG-05**: Auth middleware drops messages from unauthorized chat IDs
- [ ] **TG-06**: Long messages split at paragraph boundaries (4000 char Telegram limit)
- [ ] **TG-07**: Second bot token for shadow mode during migration (avoid 409 Conflict)

### Intelligence (INTEL)

- [ ] **INTEL-01**: Healing agent dispatched when task fails 3+ consecutive times
- [ ] **INTEL-02**: Healing agent diagnoses root cause using MCP tools and escalates if unfixable
- [ ] **INTEL-03**: Nightly self-improvement agent reads ledger, email folder state, YNAB recategorizations
- [ ] **INTEL-04**: Self-improvement agent updates email-rules.md and budget-rules.md with learned patterns
- [ ] **INTEL-05**: Self-improvement produces summary notification of changes made
- [ ] **INTEL-06**: Knowledge graph (Neo4j + Graphiti) stores cross-domain memory
- [ ] **INTEL-07**: Memory consolidation task expires stale edges nightly

### Migration (MIG)

- [ ] **MIG-01**: New daemon can run alongside old Python service in shadow mode
- [ ] **MIG-02**: Shadow mode compares outputs without affecting production
- [ ] **MIG-03**: Clean cutover: stop Python service, start TS daemon, verify via health endpoint
- [ ] **MIG-04**: All plugins published to pjschulz3004/claude-plugins marketplace

## v2 Requirements (Deferred)

- PWA push notification channel
- Web dashboard for monitoring
- Voice message transcription via Claude (replace Voxtral)
- Contact photo support
- Calendar recurring event management (RRULE)
- Budget forecast/projection insights

## Out of Scope

- Email drafting/sending — autonomous email sending is dangerous, read-only only
- Multi-tenant support — single user, not worth the complexity
- Mobile app — Telegram is the mobile interface
- Real-time IMAP IDLE — hourly polling sufficient for personal email
- Custom LLM fine-tuning — evolving markdown rules achieve same goal
- Voice interface — text via Telegram, dictation is separate tool
- n8n-style workflow automation — Jarvis is an assistant, not Zapier
- Proactive task creation — surface action items in briefings, never auto-create

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | Phase 1 | Pending |
| MONO-02 | Phase 1 | Pending |
| MONO-03 | Phase 1 | Pending |
| MONO-04 | Phase 1 | Pending |
| MONO-05 | Phase 1 | Pending |
| EMAIL-01 | Phase 1 | Pending |
| EMAIL-02 | Phase 1 | Pending |
| EMAIL-03 | Phase 1 | Pending |
| EMAIL-04 | Phase 1 | Pending |
| EMAIL-05 | Phase 1 | Pending |
| EMAIL-06 | Phase 1 | Pending |
| EMAIL-07 | Phase 1 | Pending |
| EMAIL-08 | Phase 1 | Pending |
| EMAIL-09 | Phase 1 | Pending |
| EMAIL-10 | Phase 1 | Pending |
| DAEMON-01 | Phase 1 | Pending |
| DAEMON-02 | Phase 1 | Pending |
| DAEMON-03 | Phase 1 | Pending |
| DAEMON-04 | Phase 1 | Pending |
| DAEMON-05 | Phase 1 | Pending |
| DAEMON-06 | Phase 1 | Pending |
| DAEMON-07 | Phase 1 | Pending |
| DAEMON-08 | Phase 1 | Pending |
| DAEMON-09 | Phase 1 | Pending |
| CAL-01 | Phase 2 | Pending |
| CAL-02 | Phase 2 | Pending |
| CAL-03 | Phase 2 | Pending |
| CAL-04 | Phase 2 | Pending |
| CAL-05 | Phase 2 | Pending |
| CAL-06 | Phase 2 | Pending |
| CAL-07 | Phase 2 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| BUD-01 | Phase 2 | Pending |
| BUD-02 | Phase 2 | Pending |
| BUD-03 | Phase 2 | Pending |
| BUD-04 | Phase 2 | Pending |
| BUD-05 | Phase 2 | Pending |
| BUD-06 | Phase 2 | Pending |
| BUD-07 | Phase 2 | Pending |
| FILE-01 | Phase 2 | Pending |
| FILE-02 | Phase 2 | Pending |
| FILE-03 | Phase 2 | Pending |
| FILE-04 | Phase 2 | Pending |
| FILE-05 | Phase 2 | Pending |
| FILE-06 | Phase 2 | Pending |
| ORCH-01 | Phase 3 | Pending |
| ORCH-02 | Phase 3 | Pending |
| ORCH-03 | Phase 3 | Pending |
| ORCH-04 | Phase 3 | Pending |
| ORCH-05 | Phase 3 | Pending |
| ORCH-06 | Phase 3 | Pending |
| ORCH-07 | Phase 3 | Pending |
| ORCH-08 | Phase 3 | Pending |
| TG-01 | Phase 4 | Pending |
| TG-02 | Phase 4 | Pending |
| TG-03 | Phase 4 | Pending |
| TG-04 | Phase 4 | Pending |
| TG-05 | Phase 4 | Pending |
| TG-06 | Phase 4 | Pending |
| TG-07 | Phase 4 | Pending |
| INTEL-01 | Phase 5 | Pending |
| INTEL-02 | Phase 5 | Pending |
| INTEL-03 | Phase 5 | Pending |
| INTEL-04 | Phase 5 | Pending |
| INTEL-05 | Phase 5 | Pending |
| INTEL-06 | Phase 5 | Pending |
| INTEL-07 | Phase 5 | Pending |
| MIG-01 | Phase 6 | Pending |
| MIG-02 | Phase 6 | Pending |
| MIG-03 | Phase 6 | Pending |
| MIG-04 | Phase 6 | Pending |

**Coverage: 75/75 v1 requirements mapped**
