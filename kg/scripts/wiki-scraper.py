#!/usr/bin/env python3
"""
MediaWiki Scraper — fetches pages from any MediaWiki-powered wiki via API,
converts to Obsidian-compatible markdown with [[wiki-links]] and YAML frontmatter.

Starts from seed pages defined in a targets YAML file, follows internal links
to discover related pages. Works with Fandom wikis, Wikipedia, and any site
running MediaWiki.

Usage:
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml --seeds-only
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml --limit 5
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml --force
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml --max-depth 2
    python wiki-scraper.py --wiki-url https://mywiki.fandom.com --output-dir ./wiki --targets targets.yaml --dry-run
"""

import argparse
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, quote

import requests
import yaml
from bs4 import BeautifulSoup
from markdownify import MarkdownConverter


# Namespaces to skip when discovering links
SKIP_NS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 110, 111, 500, 501, 502, 503, 828, 829}

# Pages to skip by title pattern
SKIP_TITLES = {
    "Main Page",
}

# Sections to strip from article content (lowercase)
STRIP_SECTIONS = {
    "references", "external links", "site navigation", "fanart gallery",
    "chapter appearances", "trivia", "navigation",
}

# Category heuristics for auto-classifying discovered pages
ORG_KEYWORDS = {"team", "group", "organization", "faction", "gang", "crew", "alliance"}
LOC_KEYWORDS = {"city", "location", "district", "neighborhood", "area", "building", "region", "bay"}
EVENT_KEYWORDS = {"battle", "attack", "war", "event", "incident", "endbringer"}
POWER_KEYWORDS = {"classification", "power", "ability", "trigger", "shard", "cape"}
WORLD_KEYWORDS = {"rule", "law", "institution", "system", "protocol", "prison", "birdcage"}


class ObsidianConverter(MarkdownConverter):
    """Custom markdownify converter with Obsidian wiki-link placeholders."""

    def convert_a(self, el, text, parent_tags):
        href = el.get("href", "")
        if not href or not text or not text.strip():
            return text or ""
        clean_text = text.strip()

        # Internal wiki link
        if href.startswith("/wiki/"):
            slug = href.replace("/wiki/", "").split("#")[0]
            return f"WIKILINK[{slug}|{clean_text}]"

        # External link
        if href.startswith("http"):
            return f"[{clean_text}]({href})"

        return clean_text

    def convert_table(self, el, text, parent_tags):
        return ""

    def convert_sup(self, el, text, parent_tags):
        return ""


def slugify(name):
    """Convert a page title to kebab-case filename."""
    s = unquote(name)
    s = re.sub(r"\s*\(Worm\)\s*", "", s)
    s = re.sub(r"\s*\(Web Serial\)\s*", "", s)
    s = re.sub(r"[''']", "", s)
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def load_targets(targets_file):
    """Load seed targets from YAML. Returns {slug: (category, filename)}."""
    with open(targets_file) as f:
        data = yaml.safe_load(f)

    targets = {}
    for category, entries in data.items():
        for entry in entries:
            targets[entry["slug"]] = (category, entry["filename"])
    return targets


def classify_page(title, categories):
    """Guess category for a discovered page based on its title and wiki categories."""
    cat_text = " ".join(c.lower() for c in categories)
    title_lower = title.lower()

    if any(kw in cat_text for kw in ["location", "city", "place", "geography"]):
        return "locations"
    if any(kw in cat_text for kw in ["organization", "team", "group", "gang"]):
        return "organizations"
    if any(kw in cat_text for kw in ["event", "battle", "endbringer"]):
        return "events"
    if any(kw in cat_text for kw in ["classification", "power", "trigger"]):
        return "powers"
    if any(kw in title_lower for kw in ["rule", "cauldron", "birdcage", "case 53"]):
        return "world"

    # Default: most wiki pages are about characters/entities
    return "characters"


def fetch_page_api(page_title, session, api_url):
    """Fetch a page using MediaWiki parse API. Returns (html, title, links, categories) or None."""
    params = {
        "action": "parse",
        "page": page_title,
        "format": "json",
        "prop": "text|links|categories|displaytitle",
        "redirects": 1,
        "disabletoc": 1,
    }
    try:
        r = session.get(api_url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError):
        # Retry once
        time.sleep(3)
        try:
            r = session.get(api_url, params=params, timeout=30)
            r.raise_for_status()
            data = r.json()
        except (requests.RequestException, ValueError):
            return None

    if "error" in data:
        return None

    parse = data["parse"]
    html = parse.get("text", {}).get("*", "")
    title = parse.get("title", page_title)
    links = [l["*"] for l in parse.get("links", []) if l.get("ns", -1) == 0 and "exists" in l]
    categories = [c["*"] for c in parse.get("categories", [])]

    return html, title, links, categories


def clean_html_to_markdown(html):
    """Convert wiki HTML to clean markdown."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove infoboxes
    for box in soup.find_all("aside", class_="portable-infobox"):
        box.decompose()
    for box in soup.find_all("table", class_="infobox"):
        box.decompose()

    # Remove navboxes
    for nav in soup.find_all(["div", "table"], class_="navbox"):
        nav.decompose()
    for nav in soup.find_all("nav"):
        nav.decompose()

    # Remove edit links
    for edit in soup.find_all("span", class_="mw-editsection"):
        edit.decompose()

    # Remove references
    for refs in soup.find_all("div", class_="reflist"):
        refs.decompose()
    for refs in soup.find_all("ol", class_="references"):
        refs.decompose()
    for refs in soup.find_all("sup", class_="reference"):
        refs.decompose()

    # Remove stub notices
    for stub in soup.find_all("table", class_="ambox"):
        stub.decompose()

    # Remove galleries
    for gallery in soup.find_all(["div", "ul"], class_=lambda c: c and "gallery" in c):
        gallery.decompose()

    # Remove hatnotes (disambiguation notices)
    for hat in soup.find_all("div", class_="hatnote"):
        hat.decompose()

    # Remove sections we don't want
    for heading in soup.find_all(["h2", "h3"]):
        heading_text = heading.get_text().strip().lower()
        if heading_text in STRIP_SECTIONS:
            tag_level = heading.name
            to_remove = [heading]
            for sibling in heading.find_next_siblings():
                if sibling.name and sibling.name in ["h1", "h2"] and (sibling.name <= tag_level):
                    break
                if sibling.name == tag_level and sibling.name == "h3":
                    break
                to_remove.append(sibling)
            for el in to_remove:
                el.decompose()

    # Convert to markdown
    converter = ObsidianConverter(
        heading_style="atx",
        bullets="-",
        strip=["img", "figure", "figcaption"],
    )
    markdown = converter.convert(str(soup))
    return markdown


def resolve_wikilinks(text, known_pages):
    """Replace WIKILINK[slug|display] with [[obsidian-link]] or plain text."""
    def replace_link(match):
        slug = unquote(match.group(1))
        display = match.group(2)
        # Try exact match, then title form
        for lookup in [slug, slug.replace("_", " ")]:
            if lookup in known_pages:
                filename = known_pages[lookup]
                if display.lower().replace(" ", "-") == filename:
                    return f"[[{filename}]]"
                return f"[[{filename}|{display}]]"
        return display

    return re.sub(r"WIKILINK\[([^|]+)\|([^\]]+)\]", replace_link, text)


def clean_markdown(text):
    """Post-process markdown output."""
    # Collapse excessive blank lines
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    # Remove trailing whitespace
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    # Remove leading blank lines after frontmatter
    text = re.sub(r"(^---\n.*?\n---\n)\n+", r"\1\n", text, flags=re.DOTALL)
    return text.strip() + "\n"


def main():
    parser = argparse.ArgumentParser(description="Scrape MediaWiki site to Obsidian markdown")
    parser.add_argument("--wiki-url", type=str, required=True,
                        help="Base URL of the wiki (e.g. https://mywiki.fandom.com)")
    parser.add_argument("--output-dir", type=str, required=True,
                        help="Directory to write markdown files to")
    parser.add_argument("--targets", type=str, required=True,
                        help="Path to targets YAML file with seed pages")
    parser.add_argument("--seeds-only", action="store_true", help="Only scrape seed pages")
    parser.add_argument("--limit", type=int, default=0, help="Max pages to scrape (0 = unlimited)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    parser.add_argument("--max-depth", type=int, default=1, help="Link-following depth (default: 1)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without fetching")
    args = parser.parse_args()

    # Derive API and base URLs from wiki URL
    api_url = args.wiki_url.rstrip("/") + "/api.php"
    wiki_base = args.wiki_url.rstrip("/") + "/wiki/"
    output_base = Path(args.output_dir).resolve()
    targets_file = Path(args.targets).resolve()
    failures_log = output_base / "scrape-failures.log"

    if not targets_file.exists():
        print(f"ERROR: Targets file not found: {targets_file}")
        sys.exit(1)

    # Load seed targets
    seed_targets = load_targets(targets_file)

    # Queue: [(slug_or_title, category, filename, depth)]
    queue = []
    seen = set()
    for slug, (category, filename) in seed_targets.items():
        title = unquote(slug).replace("_", " ")
        queue.append((slug, category, filename, 0))
        seen.add(slug)
        seen.add(title)

    # known_pages maps wiki title/slug -> output filename (for link resolution)
    known_pages = {}
    for slug, (cat, fn) in seed_targets.items():
        known_pages[slug] = fn
        known_pages[unquote(slug).replace("_", " ")] = fn

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"

    scraped = 0
    skipped = 0
    failed = 0
    failures = []
    discovered = 0
    idx = 0

    print(f"Wiki: {args.wiki_url}")
    print(f"API:  {api_url}")
    print(f"Output: {output_base}")
    print(f"Seeds: {len(seed_targets)} pages from {targets_file}")
    print()

    while idx < len(queue):
        if args.limit and scraped >= args.limit:
            break

        slug, category, filename, depth = queue[idx]
        idx += 1

        outpath = output_base / category / f"{filename}.md"

        if args.dry_run:
            status = "EXISTS" if outpath.exists() else "NEW"
            src = "seed" if depth == 0 else f"discovered(d={depth})"
            print(f"  [{status}] {category}/{filename}.md  ({src})")
            scraped += 1
            continue

        if outpath.exists() and not args.force:
            skipped += 1
            continue

        print(f"  [{idx}/{len(queue)}] Scraping {slug}...", end=" ", flush=True)

        result = fetch_page_api(slug, session, api_url)
        if result is None:
            print("FAILED")
            failed += 1
            failures.append(slug)
            time.sleep(0.5)
            continue

        html, resolved_title, page_links, page_cats = result

        # Register the resolved title in known_pages too
        known_pages[resolved_title] = filename
        known_pages[resolved_title.replace(" ", "_")] = filename

        # Discover linked pages
        if not args.seeds_only and depth < args.max_depth:
            for link_title in page_links:
                link_slug = link_title.replace(" ", "_")
                if link_title not in seen and link_slug not in seen:
                    if link_title in SKIP_TITLES:
                        continue
                    seen.add(link_title)
                    seen.add(link_slug)
                    link_fn = slugify(link_title)
                    # Quick classify from parent page context
                    link_cat = classify_page(link_title, page_cats)
                    known_pages[link_title] = link_fn
                    known_pages[link_slug] = link_fn
                    queue.append((link_slug, link_cat, link_fn, depth + 1))
                    discovered += 1

        # Convert content
        markdown = clean_html_to_markdown(html)
        markdown = resolve_wikilinks(markdown, known_pages)

        # Build frontmatter + content
        source_url = wiki_base + quote(resolved_title.replace(" ", "_"), safe="/:()%")
        today = datetime.now().strftime("%Y-%m-%d")

        # Ensure title heading
        if not markdown.lstrip().startswith(f"# {resolved_title}"):
            markdown = f"# {resolved_title}\n\n{markdown}"

        full = f"---\nsource: {source_url}\nscraped: {today}\ncategory: {category}\n---\n\n{markdown}"
        full = clean_markdown(full)

        # Write
        outpath.parent.mkdir(parents=True, exist_ok=True)
        outpath.write_text(full, encoding="utf-8")

        word_count = len(markdown.split())
        print(f"OK ({word_count} words)")
        scraped += 1

        # Rate limit: gentle on the API
        time.sleep(0.5)

    # Summary
    prefix = "DRY RUN " if args.dry_run else ""
    print(f"\n{prefix}Summary:")
    print(f"  Scraped: {scraped}")
    print(f"  Skipped (existing): {skipped}")
    print(f"  Failed:  {failed}")
    if discovered:
        print(f"  Discovered via links: {discovered}")
    print(f"  Total queue size: {len(queue)}")

    if failures:
        failures_log.parent.mkdir(parents=True, exist_ok=True)
        with open(failures_log, "w") as f:
            f.write("\n".join(failures) + "\n")
        print(f"  Failures logged to: {failures_log}")


if __name__ == "__main__":
    main()
