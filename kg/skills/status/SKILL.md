---
name: status
description: "Show knowledge graph registry, project config, and stats."
---

# KG Status

Show the current state of the knowledge graph.

## Step 1: Get Status

Use the `kg_status` MCP tool to retrieve:
- Registered groups (from ~/.kg/registry.yaml)
- Current project config (from kg.local.yaml if present)
- Active scopes and defaults

## Step 2: Present Status

Format clearly:

### Registry
List each registered group with description and sources.

### Project Config
If `kg.local.yaml` exists, show:
- Project name
- Defined scopes (with group mappings)
- Default write group
- Default search scope

If no project config, note that raw group names are used as scopes.

### Quick Actions
- No project config? Suggest `/kg setup`
- Want to add knowledge? Suggest `/kg add`
- Want to search? Suggest `/kg search`
