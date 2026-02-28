"""Download books from LibGen. Resolves download links and saves files.

Handles CUII DNS blocking via shared dns_bypass module.

Usage:
    python download_libgen.py --md5 <hash> --library-root /path/to/library
    python download_libgen.py --search-json '<json>' --library-root /path/to/library
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

from dns_bypass import dns_context
from models import SearchResult
from manifest import load_manifest, save_manifest, add_book, mark_downloaded, mark_failed, VALID_MD5, VALID_FORMATS

ALLOWED_MIRRORS = {"li", "rs", "gs", "lol"}


def resolve_download_url(mirror_url: str, md5: str) -> dict:
    """Visit a LibGen mirror page and extract the direct download URL + metadata.

    Returns dict with 'url', 'title', 'authors' keys.
    """
    resp = requests.get(mirror_url, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Extract metadata — LibGen ads.php puts Title/Author/etc in one <td> with <br/> separators
    title = ""
    authors = []
    for td in soup.find_all("td"):
        html = str(td)
        if "Title:" not in html:
            continue
        # Parse br-separated lines within this td
        for line in td.stripped_strings:
            if line.startswith("Title:"):
                title = line[6:].strip()
            elif line.startswith("Author(s):"):
                authors = [a.strip() for a in line[10:].split(";") if a.strip()]
        break

    # Extract download URL
    a_tags = soup.find_all("a", string=lambda s: s and s.strip().upper() == "GET")

    if not a_tags:
        raise ValueError(f"No GET links found on mirror page: {mirror_url}")

    for link in a_tags:
        href = link.get("href")
        if not href:
            continue
        full_url = urljoin(mirror_url, href)
        params = parse_qs(urlparse(full_url).query)
        key_vals = params.get("key")
        if key_vals and key_vals[0]:
            parsed = urlparse(mirror_url)
            root_url = f"{parsed.scheme}://{parsed.netloc}"
            return {
                "url": f"{root_url}/get.php?md5={md5}&key={key_vals[0]}",
                "title": title,
                "authors": authors,
            }

    raise ValueError(f"Could not extract download key from mirror page: {mirror_url}")


def download_file(url: str, dest: Path, chunk_size: int = 1_048_576) -> int:
    """Download a file from URL to dest path. Returns file size in bytes."""
    dest.parent.mkdir(parents=True, exist_ok=True)

    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()

    size = 0
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=chunk_size):
            f.write(chunk)
            size += len(chunk)

    return size


def download_book(
    md5: str,
    extension: str,
    library_root: str,
    mirror: str = "li",
    mirror_url: str | None = None,
) -> tuple[Path, int, dict]:
    """Download a book from LibGen by MD5 hash.

    Args:
        md5: LibGen MD5 hash
        extension: File extension (pdf, epub, etc.)
        library_root: Path to library data directory
        mirror: LibGen mirror TLD
        mirror_url: Direct mirror URL (skips construction if provided)

    Returns:
        (file_path, size_bytes, metadata) where metadata has 'title' and 'authors'
    """
    if mirror not in ALLOWED_MIRRORS:
        raise ValueError(f"Unknown mirror: {mirror!r}")
    if not VALID_MD5.match(md5):
        raise ValueError(f"Invalid MD5: {md5!r}")
    if extension not in VALID_FORMATS:
        raise ValueError(f"Invalid format: {extension!r}")

    hostname = f"libgen.{mirror}"

    if not mirror_url:
        mirror_url = f"https://{hostname}/ads.php?md5={md5}"

    # Extract all hostnames that need DNS bypass
    hosts_to_bypass = {hostname}
    parsed = urlparse(mirror_url)
    if parsed.hostname:
        hosts_to_bypass.add(parsed.hostname)

    dest = Path(library_root) / "downloads" / f"{md5}.{extension}"

    with dns_context(*hosts_to_bypass):
        result = resolve_download_url(mirror_url, md5)
        download_url = result["url"]

        # The CDN URL might be on the same or different host
        cdn_parsed = urlparse(download_url)
        if cdn_parsed.hostname and cdn_parsed.hostname not in hosts_to_bypass:
            pass  # For now, CDN is typically same host

        size = download_file(download_url, dest)

    return dest, size, {"title": result["title"], "authors": result["authors"]}


def download_from_search_result(
    result: SearchResult,
    topics: list[str],
    library_root: str,
    mirror: str = "li",
) -> dict:
    """Download a book from a SearchResult, update manifest.

    Returns dict with status info for JSON output.
    """
    manifest = load_manifest(library_root)

    # Add to manifest if not already tracked
    if result.download_id not in manifest.books:
        entry = add_book(manifest, result, topics)
    else:
        entry = manifest.books[result.download_id]

    if entry.status not in ("pending", "failed"):
        save_manifest(manifest)
        return {
            "status": "skipped",
            "reason": f"Already {entry.status}",
            "book_id": entry.id,
            "title": entry.title,
        }

    try:
        file_path, size, metadata = download_book(
            md5=result.download_id,
            extension=result.format,
            library_root=library_root,
            mirror=mirror,
            mirror_url=result.download_url,
        )

        # Update entry with scraped metadata if title was placeholder
        if entry.title == "Unknown" and metadata.get("title"):
            entry.title = metadata["title"]
        if entry.authors == ["Unknown"] and metadata.get("authors"):
            entry.authors = metadata["authors"]

        rel_path = str(file_path.relative_to(library_root))
        mark_downloaded(manifest, entry.id, rel_path, size)
        save_manifest(manifest)

        return {
            "status": "downloaded",
            "book_id": entry.id,
            "title": entry.title,
            "file": rel_path,
            "size_bytes": size,
        }

    except Exception as e:
        mark_failed(manifest, entry.id, str(e))
        save_manifest(manifest)
        return {
            "status": "failed",
            "book_id": entry.id,
            "title": entry.title,
            "error": str(e),
        }


def main():
    parser = argparse.ArgumentParser(description="Download books from LibGen")
    parser.add_argument("--md5", help="LibGen MD5 hash to download")
    parser.add_argument("--extension", default="pdf", help="File extension")
    parser.add_argument("--search-json", help="SearchResult as JSON string")
    parser.add_argument("--topics", default="uncategorized", help="Comma-separated topics")
    parser.add_argument("--library-root", required=True, help="Library data directory")
    parser.add_argument("--mirror", default="li", help="LibGen mirror TLD")
    args = parser.parse_args()

    topics = [t.strip() for t in args.topics.split(",")]

    if args.search_json:
        data = json.loads(args.search_json)
        result = SearchResult.from_dict(data)
        output = download_from_search_result(result, topics, args.library_root, args.mirror)
    elif args.md5:
        # Direct MD5 download — create a minimal SearchResult
        result = SearchResult(
            title="Unknown",
            authors=["Unknown"],
            year=None,
            language="en",
            format=args.extension,
            size="? MB",
            source="libgen",
            download_id=args.md5,
            download_url=None,
        )
        output = download_from_search_result(result, topics, args.library_root, args.mirror)
    else:
        parser.error("Either --md5 or --search-json is required")
        return

    print(json.dumps(output, indent=2))
    if output["status"] == "failed":
        sys.exit(1)


if __name__ == "__main__":
    main()
