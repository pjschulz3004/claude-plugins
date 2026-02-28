---
name: convert
description: "Convert downloaded books to chapter-structured markdown."
argument-hint: "[book ID or 'all']"
allowed-tools: ["Read", "Write", "Bash", "AskUserQuestion"]
---

# /library convert — Convert to Markdown

Convert downloaded books to chapter-structured markdown files.

## Flow

1. Load manifest from library root
2. Get books with status "downloaded" (or specific book ID)
3. For each book:
   - Detect format from manifest
   - EPUB → `convert_epub.py` (Pandoc + chapter splitting)
   - PDF → `convert_pdf.py` (Marker GPU + chapter splitting)
4. Report conversion results

## Scripts

```bash
cd ~/.claude/plugins/local/library/scripts
LIBRARY_ROOT=/home/paul/NAS/Second-Brain/Philia/Resources/Library

# Convert EPUB:
~/.library/venv/bin/python convert_epub.py \
  --book-id <id> \
  --library-root "$LIBRARY_ROOT"

# Convert PDF (uses Marker venv internally):
~/.library/venv/bin/python convert_pdf.py \
  --book-id <id> \
  --library-root "$LIBRARY_ROOT"
```

**Output:** JSON with conversion status, output_dir, chapter count and file names.

## Output Structure

```
books/{topic}/{slugified-title}/
  01-chapter-name.md
  02-another-chapter.md
  ...
```
