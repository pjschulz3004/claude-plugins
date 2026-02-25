---
name: search
description: "Search the knowledge graph with scope awareness."
---

# KG Search

Search the knowledge graph for facts, entities, and relationships.

## Step 1: Determine Query and Scope

From the user's argument, extract:
- **query**: The search text (everything after "search")
- **scope**: If the user specifies a scope (e.g., "search canon Armsmaster"), use it. Otherwise use the default scope.

Check if `kg.local.yaml` exists in the current directory. If it does, mention the available scopes to the user.

## Step 2: Run Search

Use the `kg_search` MCP tool:
- **query**: The extracted query
- **scope**: The determined scope
- **limit**: 10 (or user-specified)

## Step 3: Present Results

Format the results clearly:
- Group facts by entity when possible
- Show temporal validity if present (valid_at / expired_at)
- Note which group each fact comes from
- If results are sparse, suggest broadening the scope or rephrasing

If the user wants to add or correct knowledge based on results, suggest `/kg add`.
