# Requirements — Jarvis TypeScript Redesign

## v1 Requirements

### Monorepo Foundation (MONO)

- [x] **MONO-01**: Developer can build all packages from repo root with single command (`npm run build`)
- [x] **MONO-02**: TypeScript project references resolve cross-package imports at compile time
- [x] **MONO-03**: Vitest runs all tests from repo root with single command (`npm test`)
- [x] **MONO-04**: Biome enforces consistent code style across all packages
- [x] **MONO-05**: Shared types package (`jarvis-shared`) exports common interfaces (Backend, Config, types)

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

- [x] **CAL-01**: User can list calendar events for a date range via MCP tool
- [x] **CAL-02**: User can list pending VTODOs via MCP tool
- [x] **CAL-03**: User can create calendar events via MCP tool (only when explicitly asked)
- [x] **CAL-04**: User can complete a VTODO via MCP tool
- [x] **CAL-05**: Plugin works standalone as Claude Code plugin
- [x] **CAL-06**: Plugin exposes `/jarvis-calendar:today` standalone command
- [x] **CAL-07**: tsdav backend authenticates against mailbox.org CalDAV

### Contacts Tool Plugin (CONT)

- [x] **CONT-01**: User can search contacts by name, email, or organization via MCP tool
- [x] **CONT-02**: User can get full contact details via MCP tool
- [x] **CONT-03**: User can create and update contacts via MCP tool
- [x] **CONT-04**: Plugin works standalone as Claude Code plugin
- [x] **CONT-05**: tsdav backend authenticates against mailbox.org CardDAV

### Budget Tool Plugin (BUD)

- [x] **BUD-01**: User can view budget categories with balances via MCP tool
- [x] **BUD-02**: User can view transactions by date range via MCP tool
- [x] **BUD-03**: User can categorize uncategorized transactions via MCP tool
- [x] **BUD-04**: User can batch-approve transactions via MCP tool
- [x] **BUD-05**: Plugin works standalone as Claude Code plugin
- [x] **BUD-06**: Plugin exposes `/jarvis-budget:summary` standalone command
- [x] **BUD-07**: YNAB SDK backend handles UUID-to-string conversion (no SQLite binding errors)

### Files Tool Plugin (FILE)

- [x] **FILE-01**: User can list inbox and outbox files via MCP tool
- [x] **FILE-02**: User can save files to inbox via MCP tool
- [x] **FILE-03**: User can move files from inbox to outbox via MCP tool
- [x] **FILE-04**: User can archive outbox files to archive/YYYY/MM/ via MCP tool
- [x] **FILE-05**: Plugin works standalone as Claude Code plugin
- [x] **FILE-06**: rclone sync to mailbox.org WebDAV works from daemon

### Daemon Core (DAEMON)

- [x] **DAEMON-01**: Daemon starts as systemd service on VPS and stays running
- [x] **DAEMON-02**: Heartbeat scheduler reads heartbeat.yaml and fires tasks on cron schedule
- [x] **DAEMON-03**: Dispatcher calls `claude -p` with focused prompts and parses JSON output
- [x] **DAEMON-04**: Circuit breakers per service (imap, caldav, carddav, ynab) prevent cascading failures
- [x] **DAEMON-05**: Task ledger records every heartbeat run (task_name, status, duration, error) in SQLite
- [x] **DAEMON-06**: Health endpoint returns JSON at /health for Uptime Kuma monitoring
- [x] **DAEMON-07**: Graceful shutdown on SIGTERM (stop scheduler, close DB, close bot)
- [x] **DAEMON-08**: `claude -p` dispatch uses Max subscription (no ANTHROPIC_API_KEY set)
- [x] **DAEMON-09**: Dispatcher stagger tasks with jitter to avoid rate limit bursts

### Orchestrator Plugin (ORCH)

- [x] **ORCH-01**: `/jarvis:status` shows system health (uptime, breakers, last task)
- [x] **ORCH-02**: `/jarvis:briefing` produces cross-domain synthesis (calendar + email + budget + todos)
- [x] **ORCH-03**: `/jarvis:ask` routes free-text through Claude with full context (calendar, recent tasks, KG)
- [x] **ORCH-04**: Voice reference (`jarvis-voice.md`) defines tone: efficient, polite, slight British humour
- [x] **ORCH-05**: Email triage skill classifies emails deterministically first, LLM fallback for ambiguous
- [x] **ORCH-06**: Briefing skill synthesizes cross-domain data into natural language
- [x] **ORCH-07**: Filing skill extracts PDFs from email, smart-names, files to inbox
- [x] **ORCH-08**: Model tiering: haiku for simple tasks, sonnet for synthesis, per agent config

### Telegram + Notifications (TG)

- [ ] **TG-01**: Telegram bot responds to 7 slash commands (/start, /status, /inbox, /today, /budget, /tasks, /history)
- [ ] **TG-02**: Free-text messages relayed to `claude -p` with conversation history (last 10 messages)
- [x] **TG-03**: Notifications sent for tasks with autonomy=notify
- [x] **TG-04**: Quiet hours (23:00-07:00) suppress non-urgent notifications
- [ ] **TG-05**: Auth middleware drops messages from unauthorized chat IDs
- [ ] **TG-06**: Long messages split at paragraph boundaries (4000 char Telegram limit)
- [ ] **TG-07**: Second bot token for shadow mode during migration (avoid 409 Conflict)

### Intelligence (INTEL)

- [x] **INTEL-01**: Healing agent dispatched when task fails 3+ consecutive times
- [x] **INTEL-02**: Healing agent diagnoses root cause using MCP tools and escalates if unfixable
- [x] **INTEL-03**: Nightly self-improvement agent reads ledger, email folder state, YNAB recategorizations
- [x] **INTEL-04**: Self-improvement agent updates email-rules.md and budget-rules.md with learned patterns
- [x] **INTEL-05**: Self-improvement produces summary notification of changes made
- [x] **INTEL-06**: Knowledge graph (Neo4j + Graphiti) stores cross-domain memory
- [x] **INTEL-07**: Memory consolidation task expires stale edges nightly

### Migration (MIG)

- [x] **MIG-01**: New daemon can run alongside old Python service in shadow mode
- [x] **MIG-02**: Shadow mode compares outputs without affecting production
- [x] **MIG-03**: Clean cutover: stop Python service, start TS daemon, verify via health endpoint
- [x] **MIG-04**: All plugins published to pjschulz3004/claude-plugins marketplace

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
| MONO-01 | Phase 1 | Complete |
| MONO-02 | Phase 1 | Complete |
| MONO-03 | Phase 1 | Complete |
| MONO-04 | Phase 1 | Complete |
| MONO-05 | Phase 1 | Complete |
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
| DAEMON-01 | Phase 1 | Complete |
| DAEMON-02 | Phase 1 | Complete |
| DAEMON-03 | Phase 1 | Complete |
| DAEMON-04 | Phase 1 | Complete |
| DAEMON-05 | Phase 1 | Complete |
| DAEMON-06 | Phase 1 | Complete |
| DAEMON-07 | Phase 1 | Complete |
| DAEMON-08 | Phase 1 | Complete |
| DAEMON-09 | Phase 1 | Complete |
| CAL-01 | Phase 2 | Complete |
| CAL-02 | Phase 2 | Complete |
| CAL-03 | Phase 2 | Complete |
| CAL-04 | Phase 2 | Complete |
| CAL-05 | Phase 2 | Complete |
| CAL-06 | Phase 2 | Complete |
| CAL-07 | Phase 2 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-05 | Phase 2 | Complete |
| BUD-01 | Phase 2 | Complete |
| BUD-02 | Phase 2 | Complete |
| BUD-03 | Phase 2 | Complete |
| BUD-04 | Phase 2 | Complete |
| BUD-05 | Phase 2 | Complete |
| BUD-06 | Phase 2 | Complete |
| BUD-07 | Phase 2 | Complete |
| FILE-01 | Phase 2 | Complete |
| FILE-02 | Phase 2 | Complete |
| FILE-03 | Phase 2 | Complete |
| FILE-04 | Phase 2 | Complete |
| FILE-05 | Phase 2 | Complete |
| FILE-06 | Phase 2 | Complete |
| ORCH-01 | Phase 3 | Complete |
| ORCH-02 | Phase 3 | Complete |
| ORCH-03 | Phase 3 | Complete |
| ORCH-04 | Phase 3 | Complete |
| ORCH-05 | Phase 3 | Complete |
| ORCH-06 | Phase 3 | Complete |
| ORCH-07 | Phase 3 | Complete |
| ORCH-08 | Phase 3 | Complete |
| TG-01 | Phase 4 | Pending |
| TG-02 | Phase 4 | Pending |
| TG-03 | Phase 4 | Complete |
| TG-04 | Phase 4 | Complete |
| TG-05 | Phase 4 | Pending |
| TG-06 | Phase 4 | Pending |
| TG-07 | Phase 4 | Pending |
| INTEL-01 | Phase 5 | Complete |
| INTEL-02 | Phase 5 | Complete |
| INTEL-03 | Phase 5 | Complete |
| INTEL-04 | Phase 5 | Complete |
| INTEL-05 | Phase 5 | Complete |
| INTEL-06 | Phase 5 | Complete |
| INTEL-07 | Phase 5 | Complete |
| MIG-01 | Phase 6 | Complete |
| MIG-02 | Phase 6 | Complete |
| MIG-03 | Phase 6 | Complete |
| MIG-04 | Phase 6 | Complete |

**Coverage: 75/75 v1 requirements mapped**
