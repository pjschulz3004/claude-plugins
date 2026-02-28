"""Convert EPUB files to chapter-structured markdown.

Uses Pandoc for EPUB → Markdown conversion, then splits into chapters.

Usage:
    python convert_epub.py --book-id <id> --library-root /path/to/library
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from manifest import load_manifest, save_manifest, mark_converted, mark_failed, book_output_path, resolve_safe
from split_chapters import convert_and_split_text


def epub_to_markdown(epub_path: str) -> str:
    """Convert EPUB to markdown using Pandoc."""
    result = subprocess.run(
        ["pandoc", epub_path, "-t", "markdown", "--wrap=none"],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Pandoc failed: {result.stderr}")
    return result.stdout


def convert_book(book_id: str, library_root: str) -> dict:
    """Convert a downloaded EPUB to chapter markdown files.

    Reads book info from manifest, converts with Pandoc, splits chapters,
    writes to books/{topic}/{title}/, updates manifest.

    Returns dict with status info.
    """
    manifest = load_manifest(library_root)
    root = Path(library_root)

    if book_id not in manifest.books:
        return {"status": "error", "error": f"Book {book_id} not in manifest"}

    book = manifest.books[book_id]

    if book.status not in ("downloaded", "failed"):
        return {
            "status": "skipped",
            "reason": f"Book is {book.status}, expected downloaded",
            "book_id": book_id,
            "title": book.title,
        }

    if book.format != "epub":
        return {
            "status": "error",
            "error": f"Not an EPUB (format: {book.format}). Use convert_pdf.py for PDFs.",
            "book_id": book_id,
        }

    epub_path = resolve_safe(library_root, book.source_file)
    if not epub_path.exists():
        mark_failed(manifest, book_id, f"Source file not found: {book.source_file}")
        save_manifest(manifest)
        return {"status": "failed", "error": "Source file not found"}

    try:
        markdown = epub_to_markdown(str(epub_path))

        output_dir = book_output_path(library_root, book.topics, book.title)

        chapter_files = convert_and_split_text(markdown, output_dir)

        # Update manifest
        rel_output = str(Path(output_dir).relative_to(library_root))
        mark_converted(manifest, book_id, rel_output)
        save_manifest(manifest)

        return {
            "status": "converted",
            "book_id": book_id,
            "title": book.title,
            "output_dir": rel_output,
            "chapters": len(chapter_files),
            "chapter_files": [str(Path(f).name) for f in chapter_files],
        }

    except Exception as e:
        mark_failed(manifest, book_id, str(e))
        save_manifest(manifest)
        return {
            "status": "failed",
            "book_id": book_id,
            "title": book.title,
            "error": str(e),
        }


def main():
    parser = argparse.ArgumentParser(description="Convert EPUB to chapter markdown")
    parser.add_argument("--book-id", required=True, help="Book ID (MD5 hash)")
    parser.add_argument("--library-root", required=True, help="Library data directory")
    args = parser.parse_args()

    output = convert_book(args.book_id, args.library_root)
    print(json.dumps(output, indent=2))

    if output["status"] == "failed":
        sys.exit(1)


if __name__ == "__main__":
    main()
