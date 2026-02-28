"""Search LibGen for books. Outputs JSON array of SearchResult objects.

Handles German CUII DNS blocking via shared dns_bypass module.
"""

from __future__ import annotations

import argparse
import json

from libgen_api_enhanced import LibgenSearch

from dns_bypass import dns_context
from models import SearchResult


def search(query: str, max_results: int = 20, mirror: str = "li") -> list[SearchResult]:
    """Search LibGen by title, return SearchResult objects."""
    hostname = f"libgen.{mirror}"

    with dns_context(hostname):
        s = LibgenSearch(mirror=mirror)
        raw_results = s.search_title(query)

    results = []
    for r in raw_results[:max_results]:
        results.append(SearchResult(
            title=r.title or "Unknown",
            authors=[a.strip() for a in (r.author or "Unknown").split(",")],
            year=r.year or None,
            language=r.language or "en",
            format=(r.extension or "pdf").lower(),
            size=r.size or "? MB",
            source="libgen",
            download_id=r.md5 or "",
            download_url=r.mirrors[0] if r.mirrors else None,
        ))

    return results


def select_best_format(results: list[SearchResult]) -> list[SearchResult]:
    """Given results, prefer EPUB > PDF > MOBI for each unique title.

    Groups results by download_id (each is unique), but when the same
    book exists in multiple formats, returns only the best format.
    """
    FORMAT_PRIORITY = {"epub": 0, "pdf": 1, "mobi": 2, "djvu": 3}

    # Group by normalized title + authors
    groups: dict[str, list[SearchResult]] = {}
    for r in results:
        key = (r.title.lower().strip(), tuple(sorted(a.lower() for a in r.authors)))
        group_key = str(key)
        groups.setdefault(group_key, []).append(r)

    best = []
    for group in groups.values():
        group.sort(key=lambda r: FORMAT_PRIORITY.get(r.format, 99))
        best.append(group[0])

    return best


def main():
    parser = argparse.ArgumentParser(description="Search LibGen for books")
    parser.add_argument("--query", "-q", required=True, help="Search query")
    parser.add_argument("--max", "-m", type=int, default=20, help="Max results")
    parser.add_argument("--format", "-f", help="Filter by format (epub,pdf)")
    parser.add_argument("--mirror", default="li", help="LibGen mirror TLD (default: li)")
    parser.add_argument("--best", action="store_true", help="Select best format per title")
    args = parser.parse_args()

    results = search(args.query, args.max, args.mirror)

    if args.format:
        formats = [f.strip().lower() for f in args.format.split(",")]
        results = [r for r in results if r.format in formats]

    if args.best:
        results = select_best_format(results)

    print(json.dumps([r.to_dict() for r in results], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
