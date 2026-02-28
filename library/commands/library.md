---
name: library
description: "Research library pipeline. Search, download, convert, and ingest books into the Knowledge Graph."
argument-hint: "<acquire|search|download|convert|ingest|status> [args]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "mcp__kg__kg_search", "mcp__kg__kg_add_episode", "mcp__kg__kg_status"]
---

# /library — Research Library Pipeline

Route to the appropriate skill based on the first argument:

| Command | Skill | Purpose |
|---------|-------|---------|
| `/library acquire <topic>` | `acquire` | Full pipeline: search, select, download, convert, ingest |
| `/library search <query>` | `search` | Search LibGen + torrents for books |
| `/library download` | `download` | Download selected books from search results |
| `/library convert` | `convert` | Convert downloaded files to chapter markdown |
| `/library ingest` | `ingest` | Ingest converted books into KG (delta only) |
| `/library status` | `status` | Show library stats by pipeline status |

If no argument or unrecognized argument, show this help table and ask what the user wants to do.
