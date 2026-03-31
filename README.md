# Paul's Claude Code Plugins

Personal plugin marketplace for Claude Code.

## Plugins

| Plugin | Description |
|--------|-------------|
| **forge** | Development pipeline orchestrator (IGNITE → SHAPE → TEMPER → DELIVER) |
| **scribe** | Creative writing studio (planning → drafting → 5-stage editing → knowledge base) |
| **kg** | Knowledge Graph integration (Graphiti + Neo4j) with search, ingest, and status tools |
| **library** | Research library pipeline (search → download → convert → ingest into KG) |
| **improve** | Autonomous codebase improvement engine (security, quality, performance, testing cycles) |
| **union-writer** | Union (Worm fanfiction) output style: DFW-influenced prose, Taylor's voice, hard craft rules |
| **autopilot** | Toggle auto-approve for all tool calls in a project directory |

## Installation

```bash
# Add this marketplace
claude plugin marketplace add https://github.com/pjschulz3004/claude-plugins

# Install a plugin
claude plugin install forge@pjschulz-plugins
claude plugin install scribe@pjschulz-plugins
claude plugin install kg@pjschulz-plugins
claude plugin install library@pjschulz-plugins
claude plugin install improve@pjschulz-plugins
claude plugin install union-writer@pjschulz-plugins
claude plugin install autopilot@pjschulz-plugins
```

---

## Jarvis -- Personal AI Assistant

TypeScript plugin constellation for personal assistant functionality. Each plugin works standalone in Claude Code. The daemon runs on the VPS as a systemd service for scheduled tasks and Telegram interaction.

| Package | Type | Description |
|---------|------|-------------|
| jarvis-shared | Library | Common types, interfaces, credentials helper |
| jarvis-email | Plugin | IMAP email tools (list, search, move, flag) |
| jarvis-calendar | Plugin | CalDAV calendar and VTODO tools |
| jarvis-contacts | Plugin | CardDAV contact search and management |
| jarvis-budget | Plugin | YNAB budget categories and transactions |
| jarvis-files | Plugin | File inbox/outbox/archive management |
| jarvis-kg | Plugin | Neo4j knowledge graph integration |
| jarvis | Plugin | Orchestrator (status, briefing, ask commands) |
| jarvis-daemon | Service | Heartbeat scheduler, Telegram bot, health endpoint |

```bash
# Install Jarvis plugins
claude plugin install jarvis-email@pjschulz-plugins
claude plugin install jarvis-calendar@pjschulz-plugins
claude plugin install jarvis-contacts@pjschulz-plugins
claude plugin install jarvis-budget@pjschulz-plugins
claude plugin install jarvis-files@pjschulz-plugins
claude plugin install jarvis-kg@pjschulz-plugins
claude plugin install jarvis@pjschulz-plugins
```
