# kg — Universal Knowledge Graph Plugin for Claude Code

A Claude Code plugin that provides universal knowledge graph operations via Graphiti + Neo4j. Per-project scoping, centralized group registry, semantic search.

## Prerequisites

- Neo4j 5 Community Edition (Docker)
- Python 3.10+
- OpenAI API key (gpt-4.1-mini + text-embedding-3-small)

## Setup

1. Clone to your plugins directory:
   ```bash
   git clone https://github.com/pjschulz3004/kg-plugin.git ~/.claude/plugins/local/kg
   ```

2. Create the central hub:
   ```bash
   mkdir -p ~/.kg
   # Copy docker-compose.yml, create .env with credentials, create registry.yaml
   # Set up Python venv with graphiti-core, mcp, pyyaml
   ```

3. Register the MCP server:
   ```bash
   claude mcp add kg -- ~/.kg/venv/bin/python ~/.kg/mcp-server.py
   ```

4. In any project, run `/kg setup` to create a `kg.local.yaml` with project-specific scopes.

## Commands

| Command | Purpose |
|---------|---------|
| `/kg search <query>` | Semantic + graph search with scope filtering |
| `/kg add <knowledge>` | Add knowledge to a registered group |
| `/kg ingest` | Batch ingest markdown files into a group |
| `/kg status` | Show registry, project config, and stats |
| `/kg setup` | Onboard a new project with group registration |

## Architecture

- **Central hub** (`~/.kg/`): Neo4j config, Python venv, group registry, MCP server
- **Plugin** (`~/.claude/plugins/local/kg/`): Commands, skills, utility scripts
- **Per-project config** (`kg.local.yaml`): Named scopes mapping to group_id lists
- **Single Neo4j database**: Projects isolated by `group_id` namespacing via Graphiti
