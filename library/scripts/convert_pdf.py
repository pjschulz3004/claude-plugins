"""Convert PDF files to chapter-structured markdown using Marker (CUDA GPU).

Marker runs in its own Python 3.13 venv (~/.library/marker-venv/) because
the ML stack (torch, surya-ocr, etc.) doesn't yet support Python 3.14.

Usage:
    python convert_pdf.py --book-id <id> --library-root /path/to/library
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from manifest import load_manifest, save_manifest, mark_converted, mark_failed, book_output_path, resolve_safe
from split_chapters import convert_and_split_text

MARKER_VENV = Path.home() / ".library" / "marker-venv"
MARKER_BIN = MARKER_VENV / "bin" / "marker"


def pdf_to_markdown_marker(pdf_path: str) -> str:
    """Convert PDF to markdown using Marker from the marker-venv."""
    if not MARKER_BIN.exists():
        raise RuntimeError(
            f"Marker not found at {MARKER_BIN}. "
            "Install: ~/.library/marker-venv/bin/pip install marker-pdf"
        )

    with tempfile.TemporaryDirectory() as indir, tempfile.TemporaryDirectory() as outdir:
        # Marker takes a folder, not a single file — symlink PDF into temp input dir
        link = Path(indir) / Path(pdf_path).name
        link.symlink_to(Path(pdf_path).resolve())

        result = subprocess.run(
            [str(MARKER_BIN), indir, "--output_dir", outdir],
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Marker failed: {result.stderr}")

        md_files = sorted(Path(outdir).rglob("*.md"))
        if not md_files:
            raise RuntimeError("Marker produced no markdown output")

        return "\n\n".join(f.read_text() for f in md_files)


def convert_book(book_id: str, library_root: str) -> dict:
    """Convert a downloaded PDF to chapter markdown files.

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

    if book.format != "pdf":
        return {
            "status": "error",
            "error": f"Not a PDF (format: {book.format}). Use convert_epub.py for EPUBs.",
            "book_id": book_id,
        }

    pdf_path = resolve_safe(library_root, book.source_file)
    if not pdf_path.exists():
        mark_failed(manifest, book_id, f"Source file not found: {book.source_file}")
        save_manifest(manifest)
        return {"status": "failed", "error": "Source file not found"}

    try:
        markdown = pdf_to_markdown_marker(str(pdf_path))

        output_dir = book_output_path(library_root, book.topics, book.title)

        chapter_files = convert_and_split_text(markdown, output_dir, clean=False)

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
    parser = argparse.ArgumentParser(description="Convert PDF to chapter markdown")
    parser.add_argument("--book-id", required=True, help="Book ID (MD5 hash)")
    parser.add_argument("--library-root", required=True, help="Library data directory")
    args = parser.parse_args()

    output = convert_book(args.book_id, args.library_root)
    print(json.dumps(output, indent=2))

    if output["status"] == "failed":
        sys.exit(1)


if __name__ == "__main__":
    main()
