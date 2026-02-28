---
name: acquire
description: "Full pipeline: search for books on a topic, select, download, convert to chapter markdown, and ingest into KG."
argument-hint: "<topic or description>"
allowed-tools: ["Read", "Write", "Edit", "Bash", "AskUserQuestion", "mcp__kg__kg_search"]
---

# /library acquire — Full Pipeline

Orchestrates the complete book acquisition pipeline for a given topic.

## Constants

```
SCRIPTS=~/.claude/plugins/local/library/scripts
VENV=~/.library/venv/bin/python
LIBRARY_ROOT=/home/paul/NAS/Second-Brain/Philia/Resources/Library
```

## Flow

### 1. Parse Intent

Extract the search query and topics from the user's input. The input may be conversational or voice-dictated.

- `query`: what to search for (e.g. "stoic philosophy", "game design RPG")
- `topics`: list of topic tags for organization (e.g. ["stoicism"], ["game-design", "rpg"])

### 2. Search

```bash
cd $SCRIPTS
$VENV search_libgen.py --query "<query>" --best
```

Parse the JSON output into a list of results.

### 3. Present Results

Show a numbered list to the user:

```
Found N books for "<query>":

1. [EPUB] "Book Title" by Author1, Author2 (5.2 MB)
2. [PDF]  "Another Book" by Author (12 MB)
3. [EPUB] "Third Book" by Author (3.1 MB)
```

### 4. Select

Ask the user which books to download using AskUserQuestion:
- Options: numbered selection, "all", or "none"
- If user says a number range like "1-3" or "1,3,5", parse accordingly

### 5. Download

For each selected book, run:

```bash
cd $SCRIPTS
$VENV download_libgen.py \
  --search-json '<result_json>' \
  --topics "<topics>" \
  --library-root "$LIBRARY_ROOT"
```

Report each download result. Continue on failure.

### 6. Convert

For each downloaded book, detect format and run appropriate converter:

```bash
cd $SCRIPTS
# For EPUB:
$VENV convert_epub.py --book-id <id> --library-root "$LIBRARY_ROOT"

# For PDF:
$VENV convert_pdf.py --book-id <id> --library-root "$LIBRARY_ROOT"
```

Report each conversion result. Continue on failure.

### 7. Ingest

Run ingestion for all newly converted books:

```bash
cd $SCRIPTS
$VENV ingest.py --library-root "$LIBRARY_ROOT"
```

### 8. Report

Show a summary:

```
Acquisition complete:
  Searched: "<query>"
  Downloaded: X books
  Converted: X books (Y chapters total)
  Ingested: X books into KG group "library"
  Failed: X books (see errors below)

You can now search this knowledge:
  /kg search "your question" --scope library
```

## Important

- Update manifest.json after each step (scripts do this automatically)
- If a book fails at any step, log the error and continue with the rest
- Prefer EPUB over PDF when both available (--best flag handles this)
- The library root is always: `/home/paul/NAS/Second-Brain/Philia/Resources/Library`
