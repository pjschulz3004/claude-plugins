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
