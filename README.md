# Paul's Claude Code Plugins

Personal plugin marketplace for Claude Code.

## Active Marketplace Plugins

| Plugin | Description |
|--------|-------------|
| **autopilot** | Toggle auto-approve for all tool calls in a project directory |
| **kg** | Knowledge Graph integration (Graphiti + Neo4j) with search, ingest, and status tools |
| **library** | Research library pipeline (search → download → convert → ingest into KG) |
| **scribe** | Creative writing studio (planning → drafting → 5-stage editing → knowledge base) |
| **union-writer** | Union (Worm fanfiction) output style: DFW-influenced prose, Taylor's voice, hard craft rules |

## GSD Extensions (not marketplace plugins)

These live in `~/.claude/` and are installed directly, not through the marketplace:

| Extension | Description |
|-----------|-------------|
| **forge** | Development pipeline with 5-layer decomposition discipline (`~/.claude/skills/forge/`) |
| **improve-phase** | Time-gated improvement cycle as GSD phase (`~/.claude/skills/improve-phase/`) |

The `forge/` and `improve/` directories in this repo are archived (kept for reference, not publishable or installable).

## KG Infrastructure Requirements

The Knowledge Graph plugin requires:
- **Neo4j** running in Docker (default: `bolt://localhost:7687`)
- **Python** with Graphiti installed for the embedding/ingestion pipeline
- **~/.kg/** directory for local configuration and group registry

## Installation

```bash
# Add this marketplace
claude plugin marketplace add https://github.com/pjschulz3004/claude-plugins

# Install a plugin
claude plugin install autopilot@pjschulz-plugins
claude plugin install kg@pjschulz-plugins
claude plugin install library@pjschulz-plugins
claude plugin install scribe@pjschulz-plugins
claude plugin install union-writer@pjschulz-plugins
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
