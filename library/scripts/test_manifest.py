"""Tests for manifest management."""

import json
import tempfile
from pathlib import Path

from models import BookEntry, LibraryManifest, SearchResult, ConversionConfig
from manifest import (
    load_manifest,
    save_manifest,
    add_book,
    mark_downloaded,
    mark_converted,
    mark_ingested,
    mark_failed,
    get_by_status,
    get_delta,
    get_stats,
    slugify,
    book_output_path,
)


def test_models_roundtrip():
    """BookEntry and LibraryManifest survive serialization."""
    entry = BookEntry(
        id="abc123",
        title="Test Book",
        authors=["Author One", "Author Two"],
        language="en",
        format="pdf",
        size_bytes=1024,
        source="libgen",
        source_query="test",
        topics=["psychology"],
        status="downloaded",
        downloaded_at="2026-01-01T00:00:00+00:00",
    )
    manifest = LibraryManifest(kg_group="library", library_root="/tmp/test", books={"abc123": entry})

    data = manifest.to_dict()
    restored = LibraryManifest.from_dict(data)

    assert restored.books["abc123"].title == "Test Book"
    assert restored.books["abc123"].authors == ["Author One", "Author Two"]
    assert restored.books["abc123"].status == "downloaded"
    assert restored.kg_group == "library"


def test_load_save_manifest():
    """Manifest persists to disk and loads back."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest = LibraryManifest(library_root=tmpdir)
        entry = BookEntry(
            id="test1", title="Book", authors=["A"], language="en",
            format="epub", size_bytes=0, source="libgen",
            source_query="q", topics=["sci"],
        )
        manifest.books["test1"] = entry
        save_manifest(manifest)

        loaded = load_manifest(tmpdir)
        assert "test1" in loaded.books
        assert loaded.books["test1"].title == "Book"


def test_load_creates_new_if_missing():
    """Loading from empty dir creates fresh manifest."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest = load_manifest(tmpdir)
        assert manifest.version == 1
        assert manifest.books == {}
        assert manifest.library_root == tmpdir


def test_add_book_from_search_result():
    """Adding a search result creates a pending BookEntry."""
    manifest = LibraryManifest(library_root="/tmp")
    result = SearchResult(
        title="Deep Work",
        authors=["Cal Newport"],
        year="2016",
        language="en",
        format="epub",
        size="2.1 MB",
        source="libgen",
        download_id="md5hash123",
    )
    entry = add_book(manifest, result, topics=["productivity"])

    assert entry.id == "md5hash123"
    assert entry.status == "pending"
    assert entry.topics == ["productivity"]
    assert "md5hash123" in manifest.books


def test_pipeline_state_transitions():
    """Book moves through: pending → downloaded → converted → ingested."""
    manifest = LibraryManifest(library_root="/tmp")
    result = SearchResult(
        title="Book", authors=["A"], year="2020", language="en",
        format="pdf", size="5 MB", source="libgen", download_id="id1",
    )
    add_book(manifest, result, topics=["test"])

    mark_downloaded(manifest, "id1", "downloads/book.pdf", 5000000)
    assert manifest.books["id1"].status == "downloaded"
    assert manifest.books["id1"].source_file == "downloads/book.pdf"
    assert manifest.books["id1"].downloaded_at is not None

    mark_converted(manifest, "id1", "books/test/book/")
    assert manifest.books["id1"].status == "converted"
    assert manifest.books["id1"].output_dir == "books/test/book/"

    mark_ingested(manifest, "id1")
    assert manifest.books["id1"].status == "ingested"
    assert manifest.books["id1"].ingested_at is not None


def test_mark_failed():
    """Failed books retain error messages."""
    manifest = LibraryManifest(library_root="/tmp")
    result = SearchResult(
        title="Bad Book", authors=["A"], year="2020", language="en",
        format="djvu", size="10 MB", source="torrent", download_id="id2",
    )
    add_book(manifest, result, topics=["test"])

    mark_failed(manifest, "id2", "OCR failed: unreadable scan")
    assert manifest.books["id2"].status == "failed"
    assert "OCR failed" in manifest.books["id2"].error


def test_get_delta():
    """Delta returns only converted (not yet ingested) books."""
    manifest = LibraryManifest(library_root="/tmp")
    for i, status in enumerate(["pending", "downloaded", "converted", "ingested", "converted", "failed"]):
        entry = BookEntry(
            id=f"id{i}", title=f"Book {i}", authors=["A"], language="en",
            format="pdf", size_bytes=0, source="libgen",
            source_query="q", topics=["t"], status=status,
        )
        manifest.books[f"id{i}"] = entry

    delta = get_delta(manifest)
    assert len(delta) == 2
    assert all(b.status == "converted" for b in delta)


def test_get_stats():
    """Stats correctly counts by status."""
    manifest = LibraryManifest(library_root="/tmp")
    for i, status in enumerate(["pending", "pending", "downloaded", "converted", "ingested", "failed"]):
        entry = BookEntry(
            id=f"id{i}", title=f"Book {i}", authors=["A"], language="en",
            format="pdf", size_bytes=0, source="libgen",
            source_query="q", topics=["t"], status=status,
        )
        manifest.books[f"id{i}"] = entry

    stats = get_stats(manifest)
    assert stats["pending"] == 2
    assert stats["downloaded"] == 1
    assert stats["converted"] == 1
    assert stats["ingested"] == 1
    assert stats["failed"] == 1


def test_slugify():
    """Slugify produces filesystem-safe names."""
    assert slugify("Thinking, Fast and Slow") == "thinking-fast-and-slow"
    assert slugify("  Hello   World  ") == "hello-world"
    assert slugify("C++ Programming (3rd Ed.)") == "c-programming-3rd-ed"
    assert slugify("A" * 200) == "a" * 80  # truncated


def test_book_output_path():
    """Output paths follow the convention."""
    path = book_output_path("/lib", ["psychology", "cbt"], "Thinking Fast and Slow")
    assert path == "/lib/books/psychology/thinking-fast-and-slow"

    path_no_topic = book_output_path("/lib", [], "Some Book")
    assert path_no_topic == "/lib/books/uncategorized/some-book"


def test_conversion_config():
    """ConversionConfig is a simple data holder."""
    cfg = ConversionConfig(converter="marker", use_ocr=True, use_llm=True, chapter_split="headings")
    assert cfg.converter == "marker"
    assert cfg.use_llm is True


if __name__ == "__main__":
    tests = [
        test_models_roundtrip,
        test_load_save_manifest,
        test_load_creates_new_if_missing,
        test_add_book_from_search_result,
        test_pipeline_state_transitions,
        test_mark_failed,
        test_get_delta,
        test_get_stats,
        test_slugify,
        test_book_output_path,
        test_conversion_config,
    ]
    for test in tests:
        try:
            test()
            print(f"  PASS  {test.__name__}")
        except Exception as e:
            print(f"  FAIL  {test.__name__}: {e}")
