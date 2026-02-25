---
name: setup
description: "Onboard a new project: register group_ids and create kg.local.yaml."
---

# KG Setup

Set up knowledge graph access for the current project.

## Step 1: Check Prerequisites

Verify:
- `~/.kg/` exists with registry.yaml and .env
- Neo4j is reachable (try `kg_status`)

If `kg.local.yaml` already exists in the current directory, show current config and ask if they want to modify it.

## Step 2: Understand the Project

Ask the user (one question at a time):
1. What is this project? (brief description)
2. What knowledge domains does it need? (e.g., "D&D 5e rules + our campaign events")

## Step 3: Design Group IDs

Based on the project description, propose group_ids:
- Use kebab-case: `dnd-5e-rules`, `dnd-cos-campaign-1`
- Explain what each group would contain
- Show existing groups from the registry that could be reused

Use `AskUserQuestion` for the user to confirm or modify.

## Step 4: Register New Groups

For each NEW group_id (not already in registry), add it to `~/.kg/registry.yaml` using the Edit tool:

```yaml
  new-group-id:
    description: "User-provided description"
    created: "YYYY-MM-DD"
    sources: []
```

## Step 5: Create kg.local.yaml

Write `kg.local.yaml` in the current project directory with:
- Project name
- Scopes mapping named scopes to group_id lists
- An "all" scope including every group for this project
- default_write_group
- default_scope

## Step 6: Verify and Next Steps

Tell the user:
- The MCP server needs a restart (new Claude Code session) to pick up kg.local.yaml
- Suggest `/kg ingest` to bulk-load existing knowledge
- Suggest `/kg add` to add individual facts
- Suggest `/kg search` to test queries
