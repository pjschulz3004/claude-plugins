---
name: ingest
description: "Ingest converted books into the Knowledge Graph (delta only)."
argument-hint: "[book ID or 'all']"
allowed-tools: ["Read", "Write", "Bash", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /library ingest — KG Ingestion

Ingest converted books into the Knowledge Graph.

## Flow

1. Load manifest from library root
2. Get delta: books with status "converted" (not yet ingested)
3. If specific book ID given, ingest just that book
4. For each book: run `ingest.py` which calls KG batch-ingest.py
5. Report results

## Script

```bash
cd ~/.claude/plugins/local/library/scripts
LIBRARY_ROOT=/home/paul/NAS/Second-Brain/Philia/Resources/Library

# Ingest all delta:
~/.library/venv/bin/python ingest.py --library-root "$LIBRARY_ROOT"

# Ingest single book:
~/.library/venv/bin/python ingest.py --library-root "$LIBRARY_ROOT" --book-id <id>
```

**Output:** JSON array of ingestion results per book.

## Verify

After ingestion, search the KG to confirm:
```
kg search --scope library "<topic>"
```
