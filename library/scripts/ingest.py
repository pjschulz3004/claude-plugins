"""Ingest converted books into the Knowledge Graph.

Calls the KG plugin's batch-ingest.py for each book's chapter directory.

Usage:
    python ingest.py --library-root /path/to/library [--book-id <id>]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from manifest import load_manifest, save_manifest, mark_ingested, mark_failed, get_delta, resolve_safe

KG_VENV_PYTHON = Path.home() / ".kg" / "venv" / "bin" / "python"
BATCH_INGEST_SCRIPT = (
    Path.home() / ".claude" / "plugins" / "local" / "kg" / "scripts" / "batch-ingest.py"
)
KG_GROUP = "library"


def ingest_book(book_id: str, library_root: str) -> dict:
    """Ingest a single converted book into the KG.

    Returns dict with status info.
    """
    manifest = load_manifest(library_root)
    root = Path(library_root)

    if book_id not in manifest.books:
        return {"status": "error", "error": f"Book {book_id} not in manifest"}

    book = manifest.books[book_id]

    if book.status != "converted":
        return {
            "status": "skipped",
            "reason": f"Book is {book.status}, expected converted",
            "book_id": book_id,
            "title": book.title,
        }

    if not book.output_dir:
        return {"status": "error", "error": "No output_dir set", "book_id": book_id}

    chapter_dir = resolve_safe(library_root, book.output_dir)
    if not chapter_dir.exists():
        mark_failed(manifest, book_id, f"Output dir not found: {book.output_dir}")
        save_manifest(manifest)
        return {"status": "failed", "error": "Output directory not found"}

    md_files = list(chapter_dir.glob("*.md"))
    if not md_files:
        mark_failed(manifest, book_id, "No markdown files in output directory")
        save_manifest(manifest)
        return {"status": "failed", "error": "No markdown files found"}

    try:
        result = subprocess.run(
            [
                str(KG_VENV_PYTHON),
                str(BATCH_INGEST_SCRIPT),
                "--group", KG_GROUP,
                "--dir", str(chapter_dir),
            ],
            capture_output=True,
            text=True,
            timeout=3600,
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            mark_failed(manifest, book_id, f"batch-ingest failed: {error_msg}")
            save_manifest(manifest)
            return {
                "status": "failed",
                "book_id": book_id,
                "title": book.title,
                "error": error_msg,
            }

        mark_ingested(manifest, book_id)
        save_manifest(manifest)

        return {
            "status": "ingested",
            "book_id": book_id,
            "title": book.title,
            "output_dir": book.output_dir,
            "chapters": len(md_files),
        }

    except subprocess.TimeoutExpired:
        mark_failed(manifest, book_id, "Ingestion timed out (3600s)")
        save_manifest(manifest)
        return {"status": "failed", "book_id": book_id, "error": "timeout"}
    except Exception as e:
        mark_failed(manifest, book_id, str(e))
        save_manifest(manifest)
        return {"status": "failed", "book_id": book_id, "error": str(e)}


def ingest_all(library_root: str) -> list[dict]:
    """Ingest all converted-but-not-ingested books."""
    manifest = load_manifest(library_root)
    delta = get_delta(manifest)

    if not delta:
        return [{"status": "nothing_to_do", "message": "No books need ingestion"}]

    results = []
    for book in delta:
        result = ingest_book(book.id, library_root)
        results.append(result)

    return results


def main():
    parser = argparse.ArgumentParser(description="Ingest books into Knowledge Graph")
    parser.add_argument("--library-root", required=True, help="Library data directory")
    parser.add_argument("--book-id", help="Ingest a single book (by ID)")
    args = parser.parse_args()

    if args.book_id:
        results = [ingest_book(args.book_id, args.library_root)]
    else:
        results = ingest_all(args.library_root)

    print(json.dumps(results, indent=2))

    if any(r.get("status") == "failed" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
