---
name: download
description: "Download books from LibGen."
argument-hint: "[book IDs or 'pending']"
allowed-tools: ["Read", "Write", "Bash", "AskUserQuestion"]
---

# /library download — Download Books

Download books from LibGen using search results or MD5 hashes.

## Flow

1. Accept either:
   - A SearchResult JSON (from `/library search`)
   - An MD5 hash for direct download
2. Download the file to `downloads/{md5}.{format}`
3. Update manifest: mark as "downloaded", set source_file path and size
4. Report success/failure

## Script

```bash
cd ~/.claude/plugins/local/library/scripts
# From search result JSON:
~/.library/venv/bin/python download_libgen.py \
  --search-json '<json>' \
  --topics "<topic1>,<topic2>" \
  --library-root /home/paul/NAS/Second-Brain/Philia/Resources/Library

# From MD5 hash:
~/.library/venv/bin/python download_libgen.py \
  --md5 <hash> \
  --extension <epub|pdf> \
  --topics "<topic>" \
  --library-root /home/paul/NAS/Second-Brain/Philia/Resources/Library
```

**Output:** JSON with download status, book_id, source_file, size_bytes.
