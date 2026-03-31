# Feature Landscape

**Domain:** Personal AI assistant (email, calendar, contacts, budget, files, autonomous operation)
**Researched:** 2026-03-31
**Confidence:** HIGH (based on production Python Jarvis + market research + existing design spec)

## Table Stakes

Features users expect. Missing = the assistant feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email listing and search | Cannot triage what you cannot see | Low | IMAP SEARCH, folder listing, flag/move/trash |
| Email triage with rules | Core value proposition of any email assistant; 25%+ of business inboxes use AI triage in 2026 | Medium | Deterministic rules first (sender/subject pattern matching), LLM fallback for ambiguous. Proven in Python Jarvis |
| Calendar event listing | "What's on my schedule?" is the first thing anyone asks an assistant | Low | CalDAV VEVENT fetch, time-range filtering |
| Calendar reminders | Users expect to be notified before events without asking | Low | 15-minute polling, push notification on upcoming events |
| Contact lookup | Cross-referencing sender identity to email/calendar actions | Low | CardDAV search by name, email, org |
| Budget overview | "How much have I spent?" is table stakes for budget tool | Low | YNAB API: category balances, month summary |
| Transaction categorization | YNAB users expect auto-categorization; payee-to-category mapping | Medium | Deterministic payee rules first, LLM for unknowns. Bulk processing for catch-up |
| Notification delivery | Assistant must be able to reach user asynchronously | Low | Telegram bot with text messages. Quiet hours respected |
| Conversational interface | Free-text questions with tool access, not just slash commands | Medium | Telegram free-text relay through `claude -p` with chat history context |
| Heartbeat scheduler | Autonomous operation on a cron schedule is the core "works when you're not looking" promise | Medium | node-cron reading heartbeat.yaml, dispatching tasks |
| Circuit breakers | Without them, a single service outage cascades into repeated failures and notification spam | Medium | Per-service (IMAP, CalDAV, CardDAV, YNAB). 3 failures opens, 60s cooldown. Proven pattern |
| Task ledger / observability | Must know what ran, when, whether it succeeded | Low | SQLite table: task_name, status, duration, error, timestamp |
| Health endpoint | Uptime monitoring (Uptime Kuma integration) | Low | /health JSON endpoint returning service status |
| Credential management via env vars | Standard pattern, already established | Low | .env file, documented per-plugin |

## Differentiators

Features that set this system apart. Not expected by default, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-domain morning briefing | Synthesizes calendar + email + budget + todos into one coherent message. Most assistants are single-domain. Market leaders like Read AI and Lindy are building toward this but few personal assistants do it well | Medium | Morning (07:30) and evening (21:00) variants. Cross-tool data fetch is the easy part; the synthesis prompt is what makes it good or bad |
| Self-healing agent | When a task fails 3+ times, Claude diagnoses the root cause and either fixes it or escalates. Most personal assistants just retry or alert. Python Jarvis has two-tier healing (deterministic + LLM) with 17K lines of code. TS version simplifies to breaker + healing agent dispatch | High | Simplified architecture: daemon detects repeated failures, dispatches healing agent via `claude -p`. Agent checks tool health, reads error logs, attempts fix or escalates |
| Nightly self-improvement cycle | Learns from corrections: emails moved after triage (wrong classification), transactions recategorized in YNAB, recurring Telegram questions. Updates rule files. This is genuinely rare in personal assistant space | High | Reads ledger + tool state, spots patterns, updates email-rules.md and budget-rules.md. Produces summary notification. The feedback loop (detect correction signals from user behavior) is the hard part |
| Deterministic-before-LLM classification | Most AI email tools send everything to the LLM. Using pattern matching first (sender rules, subject keywords) is faster, cheaper, more predictable. LLM only handles the genuinely ambiguous cases | Medium | Proven in Python Jarvis. email-rules.md evolves over time via self-improvement cycle |
| Plugin independence (each tool works standalone) | Each tool plugin is useful without the orchestrator. Install jarvis-email in any Claude Code session and use it directly. Not locked into the Jarvis ecosystem | Medium | MCP server per tool, standalone slash commands. Dual deployment: plugin + daemon import |
| Invoice extraction and smart filing | Scans business email for PDFs, extracts metadata (vendor, amount, date), smart-names files, archives to structured directory | Medium | Weekly heartbeat task. Cross-tool: email (fetch attachments) + files (archive). LLM extracts structured data from PDF content |
| Knowledge graph memory | Neo4j + Graphiti for cross-domain memory consolidation. Enables "who was that person I emailed about the budget thing?" type queries | High | Carried forward from Python Jarvis. Nightly consolidation task. Real value for long-term context across domains |
| Auto-delete lifecycle keywords | Emails tagged $AutoDelete3d or $AutoDelete7d are auto-cleaned. Simple but eliminates manual cleanup of ephemeral notifications | Low | Proven in Python Jarvis. Cleanup task runs daily at 02:00 |
| Evolving rule files | email-rules.md and budget-rules.md are living documents that the assistant updates based on observed patterns. Rules are human-readable markdown, not opaque model weights | Medium | Transparency advantage: user can read, edit, override rules. Self-improvement agent proposes changes; changes are tracked in git |
| Quiet hours | Notifications suppressed 23:00-07:00. Simple but shows respect for user context | Low | Notification layer checks time before sending. Urgent messages can override |
| Model tiering | Different tasks use different model sizes (Haiku for simple classification, Sonnet for synthesis, Opus for complex reasoning). Optimizes latency and cost | Low | Configured per agent in design. Since using Max subscription via `claude -p`, cost is fixed, but latency matters |
| File sync to cloud | rclone sync to mailbox.org WebDAV. Offsite backup of filed documents | Low | Daily heartbeat task. Pure infrastructure, no LLM needed |

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for this system.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email drafting/sending | Sending email autonomously is dangerous. One wrong auto-reply damages relationships. Even commercial tools (alfred_, Superhuman) gate this heavily | Read-only email operations. Triage, classify, move, flag. Never compose or send. User composes in their email client |
| Calendar event creation (autonomous) | Creating events without explicit user request causes calendar pollution. Especially dangerous with recurring events | List events, remind about events. Only create events when explicitly asked via conversational interface, never autonomously in heartbeat tasks |
| Multi-tenant support | Single user (Paul). Multi-tenancy adds auth, isolation, billing complexity for zero current value | Hardcode single-user. If ever needed, it's a ground-up redesign, not a feature toggle |
| Mobile app | Telegram IS the mobile interface. Building a native app is months of work for marginal improvement | Telegram bot handles all mobile interaction. Consider PWA push notifications later as a notification channel, not a full app |
| Web dashboard (V1) | Premature. Get the core working first. Dashboard is a distraction from assistant intelligence | Telegram + Claude Code slash commands for interaction. Dashboard is a future consideration after the core is proven |
| Real-time email push (IDLE) | IMAP IDLE is fragile, connection-hungry, and adds complexity. Hourly polling is sufficient for personal email | Poll hourly during waking hours (7-23). The 0-60 minute delay is acceptable for personal use |
| Custom LLM fine-tuning | Evolving rule files (markdown) achieve the same goal of improving over time, without the infrastructure overhead of fine-tuning | Deterministic rules + prompt engineering + self-improvement cycle. Human-readable, debuggable, versionable |
| Voice interface | Voice-to-text exists (Groq Whisper on Elysium). Adding voice I/O to the assistant adds latency, complexity, and ambient listening concerns | Text via Telegram. Voice transcription is a separate tool (dictation.py on Elysium), not an assistant feature |
| Expense receipt OCR | Overlaps with invoice filing but for personal expenses. YNAB handles categorization; OCR adds complexity for marginal value | Use YNAB's own import + auto-categorization rules. Invoice filing covers business documents |
| Proactive task creation | Auto-creating todos from email content is error-prone and creates noise. Users resent phantom tasks | Surface action items in briefings. Let user decide what becomes a task. Never auto-create |
| Complex workflow automation (n8n-style) | Building a general automation engine is a different product. Jarvis is a personal assistant, not Zapier | Heartbeat.yaml covers scheduled tasks. For one-off complex workflows, use Claude Code directly |

## Feature Dependencies

```
Credential management → ALL tool plugins (nothing works without auth)
Email backend (imapflow) → Email triage → Email cleanup → Invoice filing
Calendar backend (tsdav) → Calendar reminders → Morning briefing
Contacts backend (tsdav) → Cross-referencing in email triage (sender lookup)
Budget backend (ynab) → Transaction categorization → Budget alerts → Evening summary
File backend (fs + rclone) → Invoice filing → File archive → File sync
Notification layer (Telegram) → ALL heartbeat tasks with autonomy=notify
Heartbeat scheduler → ALL autonomous tasks
Circuit breakers → ALL heartbeat tasks (prevents cascading failures)
Task ledger → Self-healing (needs failure history)
Task ledger → Self-improvement (needs outcome data)
Self-healing → Self-improvement (healing fixes acute issues; improvement learns from patterns)
Email triage + Budget categorization → Self-improvement (needs correction signals)
Morning briefing → Email + Calendar + Budget + Todos (cross-domain data fetch)
Knowledge graph (Neo4j) → Memory consolidation (independent of other tools)
```

## MVP Recommendation

Prioritize (in order):

1. **Email backend + triage** - Highest daily value. Email is checked hourly, produces the most user-visible results. Proves the plugin pattern (MCP server + daemon import). Includes deterministic rules + LLM fallback
2. **Notification layer (Telegram)** - Required for any autonomous output to reach the user. Simple slash commands (/inbox, /status) provide immediate value even before heartbeat tasks work
3. **Heartbeat scheduler + task ledger + circuit breakers** - The autonomous backbone. Without this, it's just a set of tools, not an assistant
4. **Calendar backend + reminders** - Second most frequently used tool (every 15 minutes). Low complexity, high daily visibility
5. **Budget backend + categorization** - Daily check, weekly value. Lower frequency than email/calendar but important for financial awareness
6. **Morning/evening briefing** - The cross-domain synthesis differentiator. Only possible after email + calendar + budget backends exist
7. **Contacts backend** - Supports email triage (sender lookup) but not critical for MVP
8. **File backend + invoice filing** - Weekly task, lower urgency. Useful but not daily-driver

Defer:
- **Self-healing**: Until the system has been running long enough to have real failure patterns. Build the ledger first, add healing after a few weeks of production data
- **Self-improvement**: Until triage and categorization rules are stable enough that correction signals are meaningful. Needs weeks of baseline operation
- **Knowledge graph**: Carry forward from Python Jarvis if possible, but not a blocker for the TS system to be useful. Wire in after core tools work
- **File sync (rclone)**: Pure infrastructure. Add when invoice filing works

## Sources

- [Reclaim AI - 16 Best AI Assistant Apps for 2026](https://reclaim.ai/blog/ai-assistant-apps)
- [alfred_ - 7 Best AI Email Triage Tools in 2026](https://get-alfred.ai/blog/best-ai-email-triage-tools)
- [Saner.AI - Proactive AI Assistant: Best 3 On The Market](https://www.saner.ai/blogs/best-proactive-ai-assistants)
- [Zapier - 9 Best AI Personal Assistant Apps in 2026](https://zapier.com/blog/ai-personal-assistant/)
- [OpenAI Cookbook - Self-Evolving Agents](https://developers.openai.com/cookbook/examples/partners/self_evolving_agents/autonomous_agent_retraining)
- [Jotform - How to Master Email Triage in 2026](https://www.jotform.com/ai/agents/email-triage/)
- [YNAB MCP Server - AI Budgeting Assistant](https://skywork.ai/skypage/en/ynab-ai-budgeting-assistant/1979042735669420032)
- [Beam.ai - Top 5 AI Agents 2026](https://beam.ai/agentic-insights/top-5-ai-agents-in-2026-the-ones-that-actually-work-in-production)
- Production Python Jarvis codebase at `/home/paul/dev/tools/jarvis/` (586 tests, 5+ days production)
- Design spec at `/home/paul/dev/claude/plugins/docs/specs/2026-03-31-jarvis-ts-redesign.md`
