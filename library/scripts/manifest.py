"""Manifest management — load, save, query, update."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from models import BookEntry, LibraryManifest, SearchResult


MANIFEST_FILENAME = "manifest.json"
VALID_MD5 = re.compile(r"^[a-f0-9]{32}$", re.IGNORECASE)
VALID_FORMATS = {"epub", "pdf", "mobi", "djvu", "azw3"}
_SLUG_NONWORD = re.compile(r"[^\w\s-]")
_SLUG_SPACE = re.compile(r"[\s_]+")
_SLUG_DASH = re.compile(r"-+")


def load_manifest(library_root: str) -> LibraryManifest:
    """Load manifest from library root, or create a new one."""
    path = Path(library_root) / MANIFEST_FILENAME
    if path.exists():
        data = json.loads(path.read_text())
        manifest = LibraryManifest.from_dict(data)
        manifest.library_root = library_root
        return manifest
    return LibraryManifest(library_root=library_root)


def save_manifest(manifest: LibraryManifest) -> None:
    """Persist manifest to disk atomically."""
    path = Path(manifest.library_root) / MANIFEST_FILENAME
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest.to_dict(), indent=2, ensure_ascii=False))
    tmp.replace(path)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_book(manifest: LibraryManifest, result: SearchResult, topics: list[str]) -> BookEntry:
    """Add a search result to the manifest as a pending book. Returns the new entry."""
    entry = BookEntry(
        id=result.download_id,
        title=result.title,
        authors=result.authors,
        language=result.language,
        format=result.format,
        size_bytes=0,  # populated after download
        source=result.source,
        source_query="",
        topics=topics,
        status="pending",
    )
    manifest.books[entry.id] = entry
    return entry


def mark_downloaded(manifest: LibraryManifest, book_id: str, source_file: str, size_bytes: int) -> None:
    """Mark a book as downloaded."""
    book = manifest.books[book_id]
    book.status = "downloaded"
    book.downloaded_at = now_iso()
    book.source_file = source_file
    book.size_bytes = size_bytes


def mark_converted(manifest: LibraryManifest, book_id: str, output_dir: str) -> None:
    """Mark a book as converted."""
    book = manifest.books[book_id]
    book.status = "converted"
    book.converted_at = now_iso()
    book.output_dir = output_dir


def mark_ingested(manifest: LibraryManifest, book_id: str) -> None:
    """Mark a book as ingested into the KG."""
    book = manifest.books[book_id]
    book.status = "ingested"
    book.ingested_at = now_iso()


def mark_failed(manifest: LibraryManifest, book_id: str, error: str) -> None:
    """Mark a book as failed with an error message."""
    book = manifest.books[book_id]
    book.status = "failed"
    book.error = error


def get_by_status(manifest: LibraryManifest, status: str) -> list[BookEntry]:
    """Get all books with a given status."""
    return [b for b in manifest.books.values() if b.status == status]


def get_delta(manifest: LibraryManifest) -> list[BookEntry]:
    """Get books that are converted but not yet ingested."""
    return get_by_status(manifest, "converted")


def get_stats(manifest: LibraryManifest) -> dict[str, int]:
    """Count books by status."""
    stats: dict[str, int] = {}
    for book in manifest.books.values():
        stats[book.status] = stats.get(book.status, 0) + 1
    return stats


def slugify(text: str) -> str:
    """Convert text to a filesystem-safe directory name."""
    slug = text.lower().strip()
    slug = _SLUG_NONWORD.sub("", slug)
    slug = _SLUG_SPACE.sub("-", slug)
    slug = _SLUG_DASH.sub("-", slug)
    result = slug.strip("-")[:80]
    return result if result else "untitled"


def resolve_safe(library_root: str, relative_path: str) -> Path:
    """Resolve a relative path within library_root, preventing traversal."""
    root = Path(library_root).resolve()
    target = (root / relative_path).resolve()
    if not str(target).startswith(str(root)):
        raise ValueError(f"Path escapes library root: {relative_path}")
    return target


def book_output_path(library_root: str, topics: list[str], title: str) -> str:
    """Generate output path: books/{primary-topic}/{slugified-title}/"""
    topic = slugify(topics[0]) if topics else "uncategorized"
    return str(Path(library_root) / "books" / topic / slugify(title))
