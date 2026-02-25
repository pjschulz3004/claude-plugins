---
name: add
description: "Add knowledge to the graph with group validation."
---

# KG Add

Add new knowledge to the knowledge graph. Graphiti automatically extracts entities and relationships.

## Step 1: Determine Content and Group

From the user's argument, extract the knowledge to add. If the user provides text directly after "add", use that. Otherwise, ask what they want to add.

Determine the target group:
- If `kg.local.yaml` exists, use `default_write_group`
- If the user specifies a group, use that
- If neither, ask which registered group to write to (use `kg_status` to list options)

## Step 2: Confirm Before Writing

Present to the user:
- **Content**: The text that will be ingested
- **Group**: The target group
- **Source**: The source tag (default: "user-input")

Ask for confirmation.

## Step 3: Add Episode

Use the `kg_add_episode` MCP tool:
- **content**: The knowledge text
- **group**: The validated group
- **source**: "user-input" (or "research" if from a research workflow)

## Step 4: Report Results

Show how many nodes and edges were extracted. If the user wants to verify, suggest `/kg search` with a relevant query.
