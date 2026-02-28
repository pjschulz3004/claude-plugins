---
name: status
description: "Show library statistics — books by status, topic, and format."
argument-hint: ""
allowed-tools: ["Read", "Bash"]
---

# /library status — Library Stats

Show the current state of the library.

## Flow

1. Run the stats script to get manifest summary
2. Display results in a readable format

## Script

```bash
cd ~/.claude/plugins/local/library/scripts
~/.library/venv/bin/python -c "
import json
from manifest import load_manifest, get_stats, get_by_status
m = load_manifest('/home/paul/NAS/Second-Brain/Philia/Resources/Library')
stats = get_stats(m)
books = []
for b in m.books.values():
    books.append({
        'id': b.id[:12],
        'title': b.title,
        'authors': b.authors,
        'format': b.format,
        'status': b.status,
        'topics': b.topics,
        'error': b.error,
    })
print(json.dumps({'stats': stats, 'total': len(m.books), 'books': books}, indent=2))
"
```

## Display Format

```
Library Status
==============
Total: N books

By Status:
  pending:    X
  downloaded: X
  converted:  X
  ingested:   X
  failed:     X

Books:
  [EPUB] "Title" by Author — status (topic)
  [PDF]  "Title" by Author — status (topic)

Failed:
  "Title" — error message
```

Also show disk usage:
```bash
du -sh /home/paul/NAS/Second-Brain/Philia/Resources/Library/downloads/ 2>/dev/null
du -sh /home/paul/NAS/Second-Brain/Philia/Resources/Library/books/ 2>/dev/null
```
