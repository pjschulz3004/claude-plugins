"""Split markdown into chapter files.

Splits converted markdown by heading boundaries and writes numbered chapter files.

Usage:
    python split_chapters.py --input book.md --output-dir books/topic/title/
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from manifest import slugify


DECORATION_PATTERNS = re.compile(
    r"decoration|scene-break|corner",
    re.IGNORECASE,
)


def clean_pandoc_markdown(text: str) -> str:
    """Remove Pandoc decoration artifacts from converted markdown."""
    lines = text.split("\n")
    cleaned = []
    skip_depth = 0

    for line in lines:
        stripped = line.strip()

        # Handle ::: fence blocks
        fence_match = re.match(r"^(:{3,})\s*(.*)", stripped)
        if fence_match:
            colons = fence_match.group(1)
            class_name = fence_match.group(2).strip()

            if skip_depth > 0:
                # Inside a skipped block — track nesting
                if class_name:
                    skip_depth += 1  # opening fence
                else:
                    skip_depth -= 1  # closing fence
                continue

            if class_name and DECORATION_PATTERNS.search(class_name):
                # Opening a decoration block — start skipping
                skip_depth += 1
                continue

            # Non-decoration ::: fence — just strip the fence line itself
            continue

        if skip_depth > 0:
            continue

        # Remove empty span markers []{#...} and bare []
        line = re.sub(r"\[\]\{[^}]*\}", "", line)
        line = re.sub(r"\[\]", "", line)

        # Remove inline span wrappers: [text]{.class} → text
        line = re.sub(r"\[([^\]]*)\]\{[^}]*\}", r"\1", line)

        # Remove remaining {.class} attributes anywhere in line
        line = re.sub(r"\{[.#][^}]*\}", "", line)

        # Remove orphaned brackets: [text] with no (url) following
        line = re.sub(r"\[([^\]]+)\](?!\()", r"\1", line)

        # Remove decoration images
        if re.match(r"^!\[.*\]\(d2d_images/", stripped):
            continue

        # Remove ASCII table decorations (D2D formatting tables)
        if re.match(r"^\+[-=+]+\+$", stripped):
            continue
        if re.match(r"^\|.*\|$", stripped) and ("decoration" in line or "chapter-title" in line or ":::" in line):
            continue

        # Remove standalone horizontal rules (scene break markers)
        if stripped == "----------------":
            continue

        cleaned.append(line)

    # Collapse multiple blank lines
    result = re.sub(r"\n{3,}", "\n\n", "\n".join(cleaned))
    return result.strip()


def split_by_headings(markdown: str, level: int = 1) -> list[tuple[str, str]]:
    """Split markdown by heading level. Returns list of (title, content) tuples."""
    prefix = "#" * level + " "
    lines = markdown.split("\n")
    chapters: list[tuple[str, str]] = []
    current_title = ""
    current_lines: list[str] = []

    for line in lines:
        if line.startswith(prefix) and not line.startswith(prefix + "#"):
            # New chapter boundary
            if current_lines or current_title:
                content = "\n".join(current_lines).strip()
                if content:
                    chapters.append((current_title, content))
            current_title = line[len(prefix):].strip()
            current_lines = []
        else:
            current_lines.append(line)

    # Don't forget last chapter
    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            chapters.append((current_title, content))

    return chapters


def split_markdown(markdown: str) -> list[tuple[str, str]]:
    """Split markdown into chapters, trying multiple strategies.

    Strategy:
    1. Split by # (H1) headings
    2. If <2 chapters, try ## (H2)
    3. If still <2, whole content is one chapter
    """
    # Try H1 first
    chapters = split_by_headings(markdown, level=1)

    # Filter out TOC chapters (just links, no real content)
    chapters = [
        (title, content)
        for title, content in chapters
        if not _is_toc(title, content)
    ]

    if len(chapters) >= 2:
        return chapters

    # Try H2
    chapters = split_by_headings(markdown, level=2)
    chapters = [
        (title, content)
        for title, content in chapters
        if not _is_toc(title, content)
    ]

    if len(chapters) >= 2:
        return chapters

    # Fallback: single chapter
    return [("full-text", markdown)]


_TOC_LINK = re.compile(r"^\[.*\]\(.*\)$")


def _is_toc(title: str, content: str) -> bool:
    """Detect table-of-contents chapters (mostly links, little prose)."""
    if "table of contents" in title.lower() or "contents" == title.lower().strip():
        return True
    lines = [l for l in content.split("\n") if l.strip()]
    if not lines:
        return True
    if len(lines) >= 20:
        return False
    link_lines = sum(1 for l in lines if _TOC_LINK.match(l.strip()))
    return link_lines > len(lines) * 0.5


def write_chapters(
    chapters: list[tuple[str, str]],
    output_dir: str,
) -> list[str]:
    """Write chapter files to output directory. Returns list of file paths."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    paths = []
    for i, (title, content) in enumerate(chapters, 1):
        slug = slugify(title) if title else "chapter"
        filename = f"{i:02d}-{slug}.md"
        filepath = out / filename
        filepath.write_text(f"## {title}\n\n{content}\n" if title and title != "full-text" else content + "\n")
        paths.append(str(filepath))

    return paths


def convert_and_split_text(
    text: str,
    output_dir: str,
    clean: bool = True,
) -> list[str]:
    """Split markdown text into chapters and write files.

    Returns list of chapter file paths.
    """
    if clean:
        text = clean_pandoc_markdown(text)

    chapters = split_markdown(text)
    return write_chapters(chapters, output_dir)


def convert_and_split(
    input_file: str,
    output_dir: str,
    clean: bool = True,
) -> list[str]:
    """Read a markdown file, optionally clean it, split into chapters, write files.

    Returns list of chapter file paths.
    """
    text = Path(input_file).read_text()
    return convert_and_split_text(text, output_dir, clean)


def main():
    parser = argparse.ArgumentParser(description="Split markdown into chapter files")
    parser.add_argument("--input", "-i", required=True, help="Input markdown file")
    parser.add_argument("--output-dir", "-o", required=True, help="Output directory for chapters")
    parser.add_argument("--no-clean", action="store_true", help="Skip Pandoc artifact cleanup")
    args = parser.parse_args()

    paths = convert_and_split(args.input, args.output_dir, clean=not args.no_clean)
    for p in paths:
        print(p)


if __name__ == "__main__":
    main()
