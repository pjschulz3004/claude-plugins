"""Core data types for the Library pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class BookEntry:
    """A single book tracked through the pipeline."""

    id: str  # MD5 hash (LibGen) or magnet hash (torrent)
    title: str
    authors: list[str]
    language: str
    format: str  # "pdf", "epub", "djvu", "mobi"
    size_bytes: int
    source: str  # "libgen", "torrent", "manual"
    source_query: str  # search term that found this
    topics: list[str]  # user-assigned topics

    # Pipeline state
    status: str = "pending"  # pending | downloaded | converting | converted | ingested | failed
    downloaded_at: str | None = None
    converted_at: str | None = None
    ingested_at: str | None = None
    error: str | None = None

    # Paths (relative to library root)
    source_file: str | None = None  # "downloads/filename.pdf"
    output_dir: str | None = None  # "books/psychology/book-title/"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BookEntry:
        return cls(**data)


@dataclass
class SearchResult:
    """A search result from LibGen or torrent search."""

    title: str
    authors: list[str]
    year: str | None
    language: str
    format: str
    size: str  # human-readable, e.g. "5.2 MB"
    source: str  # "libgen" | "torrent"
    download_id: str  # MD5 for libgen, magnet hash for torrent
    download_url: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SearchResult:
        return cls(**data)


@dataclass
class ConversionConfig:
    """Per-format conversion settings."""

    converter: str  # "marker", "docling", "pandoc", "calibre"
    use_ocr: bool = False
    use_llm: bool = False  # marker's LLM mode for complex layouts
    chapter_split: str = "headings"  # "headings" | "toc" | "llm" | "none"


@dataclass
class LibraryManifest:
    """The persistent state of the library."""

    version: int = 1
    kg_group: str = "library"
    library_root: str = ""  # absolute path to library data directory
    books: dict[str, BookEntry] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "kg_group": self.kg_group,
            "library_root": self.library_root,
            "books": {k: v.to_dict() for k, v in self.books.items()},
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> LibraryManifest:
        books = {k: BookEntry.from_dict(v) for k, v in data.get("books", {}).items()}
        return cls(
            version=data.get("version", 1),
            kg_group=data.get("kg_group", "library"),
            library_root=data.get("library_root", ""),
            books=books,
        )
