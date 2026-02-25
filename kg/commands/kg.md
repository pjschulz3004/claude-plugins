---
name: "kg:help"
description: "Universal Knowledge Graph operations. Search, add knowledge, ingest files, check status, or set up a new project."
argument-hint: "<search|add|ingest|status|setup> [args]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "mcp__kg__kg_search", "mcp__kg__kg_add_episode", "mcp__kg__kg_status"]
---

# /kg — Universal Knowledge Graph

Route to the appropriate skill based on the first argument:

| Command | Skill | Purpose |
|---------|-------|---------|
| `/kg search <query>` | `search` | Semantic search across knowledge groups |
| `/kg add <text>` | `add` | Add knowledge to a group |
| `/kg ingest [dir] [--group G]` | `ingest` | Batch ingest markdown files |
| `/kg status` | `status` | Show registry, project config, stats |
| `/kg setup` | `setup` | Onboard a new project with KG scopes |

If no argument or unrecognized argument, show this help table and ask what the user wants to do.
