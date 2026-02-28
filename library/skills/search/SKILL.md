---
name: search
description: "Search LibGen for books on a topic."
argument-hint: "<query>"
allowed-tools: ["Read", "Bash", "AskUserQuestion"]
---

# /library search — Find Books

Search for books across available sources.

## Flow

1. Run `search_libgen.py` with the query
2. Apply `--best` to deduplicate (prefer EPUB > PDF > MOBI per title)
3. Present results as a numbered list:
   ```
   1. [EPUB] "Book Title" by Author (2020, 5.2 MB) — LibGen
   2. [PDF]  "Another Book" by Author (2019, 12 MB) — LibGen
   ```
4. Results are ephemeral — user selects from these in `/library download` or `/library acquire`

## Script

```bash
cd ~/.claude/plugins/local/library/scripts
~/.library/venv/bin/python search_libgen.py --query "<query>" --best
```

**Arguments:**
- `--query`, `-q`: Search query (required)
- `--max`, `-m`: Max results (default: 20)
- `--format`, `-f`: Filter by format (e.g. `epub,pdf`)
- `--mirror`: LibGen mirror TLD (default: `li`)
- `--best`: Select best format per unique title

**Output:** JSON array of SearchResult objects to stdout.
