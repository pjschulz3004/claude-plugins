#!/usr/bin/env python3
"""
Batch ingest markdown files into Graphiti Knowledge Graph.

Generic ingestion script for any project. Reads markdown files from a directory,
chunks them by section headings, and feeds them to Graphiti as episodes.

OpenAI gpt-4.1-mini (LLM) + OpenAI text-embedding-3-small (embeddings).
TPM-aware rate limiter to stay under OpenAI Tier 1 limits.

Usage:
    python batch-ingest.py --group my-canon --dir /path/to/wiki     # Ingest all files
    python batch-ingest.py --group my-canon --dir /path/to/wiki --limit 50
    python batch-ingest.py --group my-canon --dir /path/to/wiki/characters  # Subfolder
    python batch-ingest.py --group my-canon --dir /path/to/wiki --include-chapters
    python batch-ingest.py --group my-canon --dir /path/to/wiki --batch-size 50
    python batch-ingest.py --group my-canon --dir /path/to/wiki --dry-run
    python batch-ingest.py --group my-canon --dir /path/to/wiki --wipe

Environment (~/.kg/.env):
    NEO4J_URI           Default: bolt://localhost:7687
    NEO4J_USER          Default: neo4j
    NEO4J_PASSWORD      Default: scribe-kg-local
    OPENAI_API_KEY      Required for LLM + embeddings
    SEMAPHORE_LIMIT     Graphiti internal concurrency (default: 10)
    LLM_TPM_LIMIT       Max tokens per minute for LLM calls (default: 150000)
"""

import argparse
import asyncio
import collections
import os
import re
import sys
import time
import yaml
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env from ~/.kg/.env
load_dotenv(Path.home() / ".kg" / ".env")

CHUNK_MAX_WORDS = 2000
DEFAULT_BATCH_SIZE = 50


def validate_group(group_id):
    """Validate group_id against ~/.kg/registry.yaml. Returns True if valid."""
    reg_path = Path.home() / ".kg" / "registry.yaml"
    if not reg_path.exists():
        print(f"WARNING: No registry at {reg_path}")
        return True
    with open(reg_path) as f:
        data = yaml.safe_load(f) or {}
    groups = data.get("groups", {})
    if group_id not in groups:
        print(f"ERROR: Group '{group_id}' not registered. Valid groups: {list(groups.keys())}")
        return False
    return True


def _make_noop_cross_encoder():
    """Create a NoOp cross encoder that passes Pydantic validation."""
    from graphiti_core.cross_encoder.client import CrossEncoderClient

    class NoOpCrossEncoder(CrossEncoderClient):
        async def rank(self, query, passages):
            return [(p, 1.0) for p in passages]

    return NoOpCrossEncoder()


def _estimate_tokens(text):
    """Rough token estimate: chars / 4. Good enough for rate limiting."""
    return len(text) // 4


def _make_tpm_limited_client(base_client, max_tpm=150000):
    """Wrap an LLM client with a TPM-aware sliding window rate limiter.

    Tracks estimated token usage over a 60-second window and sleeps
    when approaching the limit. Uses chars/4 estimation for input tokens
    plus a flat 500-token output estimate per call.
    """
    import typing
    from pydantic import BaseModel
    from graphiti_core.prompts.models import Message
    from graphiti_core.llm_client.config import ModelSize

    OUTPUT_ESTIMATE = 500  # conservative output tokens per call
    lock = asyncio.Lock()
    # deque of (timestamp, estimated_tokens) for sliding window
    window = collections.deque()
    call_count = [0]
    total_tokens = [0]
    start_time = [time.time()]

    original_generate = base_client._generate_response

    def _window_tokens_used(now):
        """Sum tokens in the last 60 seconds, purging old entries."""
        cutoff = now - 60.0
        while window and window[0][0] < cutoff:
            window.popleft()
        return sum(t for _, t in window)

    async def tpm_limited_generate(
        messages: list[Message],
        response_model: type[BaseModel] | None = None,
        max_tokens: int = 16384,
        model_size: ModelSize = ModelSize.medium,
    ) -> dict[str, typing.Any]:
        # Estimate tokens for this call
        input_text = " ".join(m.content for m in messages)
        est_tokens = _estimate_tokens(input_text) + OUTPUT_ESTIMATE

        async with lock:
            now = time.time()
            current_usage = _window_tokens_used(now)

            # If adding this call would exceed the limit, sleep until enough tokens age out
            while current_usage + est_tokens > max_tpm:
                if not window:
                    break  # shouldn't happen, but safety valve
                oldest_time = window[0][0]
                wait = oldest_time + 60.0 - now + 0.1
                if wait > 0:
                    await asyncio.sleep(wait)
                now = time.time()
                current_usage = _window_tokens_used(now)

            # Record this call
            window.append((time.time(), est_tokens))
            call_count[0] += 1
            total_tokens[0] += est_tokens

            # Periodic status log
            if call_count[0] % 50 == 0:
                elapsed = time.time() - start_time[0]
                actual_tpm = total_tokens[0] / (elapsed / 60)
                current_window_tpm = _window_tokens_used(time.time())
                print(
                    f"    [tpm] {call_count[0]} calls | "
                    f"window: {current_window_tpm:,.0f}/{max_tpm:,.0f} TPM | "
                    f"avg: {actual_tpm:,.0f} TPM",
                    flush=True,
                )

        return await original_generate(messages, response_model, max_tokens, model_size)

    base_client._generate_response = tpm_limited_generate
    return base_client


async def get_graphiti():
    """Initialize Graphiti with OpenAI LLM + OpenAI embeddings."""
    from graphiti_core import Graphiti
    from graphiti_core.llm_client import LLMConfig
    from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
    from graphiti_core.embedder import OpenAIEmbedder, OpenAIEmbedderConfig

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "scribe-kg-local")
    openai_key = os.getenv("OPENAI_API_KEY")
    max_tpm = int(os.getenv("LLM_TPM_LIMIT", "150000"))
    embed_dim = int(os.getenv("EMBEDDING_DIM", "1536"))

    if not openai_key:
        print("ERROR: OPENAI_API_KEY not set. Add it to ~/.kg/.env or environment.")
        sys.exit(1)

    llm_client = OpenAIGenericClient(config=LLMConfig(
        api_key=openai_key,
        model="gpt-4.1-mini",
        small_model="gpt-4.1-mini",
    ))
    llm_client = _make_tpm_limited_client(llm_client, max_tpm=max_tpm)
    print(f"  LLM: gpt-4.1-mini (TPM limit: {max_tpm:,})")

    embedder = OpenAIEmbedder(config=OpenAIEmbedderConfig(
        api_key=openai_key,
        embedding_model="text-embedding-3-small",
        embedding_dim=embed_dim,
    ))
    print(f"  Embeddings: text-embedding-3-small ({embed_dim}d)")

    g = Graphiti(
        uri, user, password,
        llm_client=llm_client,
        embedder=embedder,
        cross_encoder=_make_noop_cross_encoder(),
    )
    await g.build_indices_and_constraints()
    return g


def strip_frontmatter(text):
    """Remove YAML frontmatter from markdown content."""
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            return text[end + 3:].strip()
    return text


def chunk_by_sections(text, max_words=CHUNK_MAX_WORDS):
    """Split markdown by ## headers into chunks under max_words."""
    parts = re.split(r"(?=^## )", text, flags=re.MULTILINE)
    parts = [p.strip() for p in parts if p.strip()]

    chunks = []
    current = ""
    current_words = 0

    for part in parts:
        part_words = len(part.split())

        if part_words > max_words:
            if current:
                chunks.append(current.strip())
                current = ""
                current_words = 0

            paragraphs = part.split("\n\n")
            sub_chunk = ""
            sub_words = 0
            for para in paragraphs:
                pw = len(para.split())
                if sub_words + pw > max_words and sub_chunk:
                    chunks.append(sub_chunk.strip())
                    sub_chunk = para
                    sub_words = pw
                else:
                    sub_chunk += "\n\n" + para if sub_chunk else para
                    sub_words += pw
            if sub_chunk:
                chunks.append(sub_chunk.strip())
            continue

        if current_words + part_words > max_words and current:
            chunks.append(current.strip())
            current = part
            current_words = part_words
        else:
            current += "\n\n" + part if current else part
            current_words += part_words

    if current:
        chunks.append(current.strip())

    return chunks if chunks else [text]


def get_category_from_path(filepath, wiki_dir):
    """Extract category from file path relative to wiki dir."""
    rel = filepath.relative_to(wiki_dir)
    parts = rel.parts
    if len(parts) > 1:
        return parts[0]
    return "unknown"


def prepare_work_items(md_files, wiki_dir, include_chapters=False):
    """Prepare all work items: (ep_name, chunk, category, filename) tuples."""
    items = []
    skipped_chapters = 0
    skipped_short = 0

    for filepath in md_files:
        category = get_category_from_path(filepath, wiki_dir)

        if category == "chapters" and not include_chapters:
            skipped_chapters += 1
            continue

        raw = filepath.read_text(encoding="utf-8")
        content = strip_frontmatter(raw)
        word_count = len(content.split())

        if word_count < 20:
            skipped_short += 1
            continue

        filename = filepath.stem
        chunks = chunk_by_sections(content)

        for ci, chunk in enumerate(chunks):
            ep_name = f"wiki-{category}-{filename}"
            if len(chunks) > 1:
                ep_name += f"-{ci+1}"
            items.append((ep_name, chunk, category, filename, ci))

    if skipped_chapters:
        print(f"  Skipped {skipped_chapters} chapter files (use --include-chapters to include)")
    if skipped_short:
        print(f"  Skipped {skipped_short} files with <20 words")

    return items


def format_time(seconds):
    """Format seconds as Xh Ym or Ym Zs."""
    if seconds >= 3600:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        return f"{h}h {m}m"
    elif seconds >= 60:
        m = int(seconds // 60)
        s = int(seconds % 60)
        return f"{m}m {s}s"
    return f"{int(seconds)}s"


IS_TTY = sys.stdout.isatty()


def print_progress(done, total, elapsed, nodes, edges, errors_count):
    """Print a progress bar with stats. Uses \\r for TTY, \\n for log files."""
    pct = done / total * 100 if total else 0
    bar_width = 30
    filled = int(bar_width * done / total) if total else 0
    bar = "\u2588" * filled + "\u2591" * (bar_width - filled)

    rate = done / elapsed if elapsed > 0 else 0
    remaining = total - done
    eta = remaining / rate if rate > 0 else 0

    line = (
        f"  [{bar}] {pct:5.1f}% | "
        f"{done}/{total} eps | "
        f"{nodes} nodes, {edges} edges | "
        f"{rate:.2f} ep/s | "
        f"ETA: {format_time(eta)} | "
        f"err: {errors_count}"
    )

    if IS_TTY:
        print(f"\r{line}", end="", flush=True)
    else:
        print(line, flush=True)


async def main():
    parser = argparse.ArgumentParser(description="Batch ingest markdown into Knowledge Graph")
    parser.add_argument("--group", type=str, required=True,
                        help="Group ID for Graphiti (must be registered in ~/.kg/registry.yaml)")
    parser.add_argument("--dir", type=str, required=True,
                        help="Directory containing markdown files to ingest")
    parser.add_argument("--limit", type=int, default=0, help="Max episodes to ingest (0 = all)")
    parser.add_argument("--include-chapters", action="store_true", help="Also ingest chapter pages")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE,
                        help=f"Episodes per bulk API call (default: {DEFAULT_BATCH_SIZE})")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be ingested")
    parser.add_argument("--wipe", action="store_true", help="Clear group data before ingesting")
    parser.add_argument("--skip-registry-check", action="store_true",
                        help="Bypass registry validation for group ID")
    args = parser.parse_args()

    # Validate group against registry
    if not args.skip_registry_check:
        if not validate_group(args.group):
            sys.exit(1)

    wiki_dir = Path(args.dir).resolve()

    md_files = sorted(wiki_dir.rglob("*.md"))
    if not md_files:
        print(f"No .md files found in {wiki_dir}")
        return

    print(f"Found {len(md_files)} markdown files in {wiki_dir}")
    print(f"Group: {args.group}")
    print("Preparing chunks...")
    items = prepare_work_items(md_files, wiki_dir, args.include_chapters)

    if args.limit:
        items = items[:args.limit]

    print(f"  {len(items)} episodes to ingest (batch size: {args.batch_size})")
    print(f"  SEMAPHORE_LIMIT: {os.getenv('SEMAPHORE_LIMIT', '20 (default)')}")

    if args.dry_run:
        cats = {}
        for ep_name, chunk, category, filename, ci in items:
            cats[category] = cats.get(category, 0) + 1
        print(f"\nDRY RUN breakdown:")
        for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
            print(f"  {cat}: {count} episodes")
        print(f"  TOTAL: {len(items)} episodes")
        return

    print("Initializing Graphiti...")
    g = await get_graphiti()

    if args.wipe:
        print(f"Wiping existing {args.group} data...")
        from graphiti_core.utils.maintenance.graph_data_operations import clear_data
        await clear_data(g.driver, group_ids=[args.group])
        print("  Done.")

    from graphiti_core.utils.bulk_utils import RawEpisode
    from graphiti_core.nodes import EpisodeType

    episodes = []
    for ep_name, chunk, category, filename, ci in items:
        episodes.append(RawEpisode(
            name=ep_name,
            content=chunk,
            source=EpisodeType.text,
            source_description=f"{args.group}/{category}",
            reference_time=datetime(2011, 1, 1, tzinfo=timezone.utc),
        ))

    total_nodes = 0
    total_edges = 0
    total_episodes = 0
    errors = []
    start_time = time.time()

    num_batches = (len(episodes) + args.batch_size - 1) // args.batch_size
    print(f"\nIngesting {len(episodes)} episodes in {num_batches} batches...\n")

    for batch_idx in range(num_batches):
        batch_start = batch_idx * args.batch_size
        batch_end = min(batch_start + args.batch_size, len(episodes))
        batch = episodes[batch_start:batch_end]

        batch_t = time.time()
        try:
            result = await g.add_episode_bulk(batch, group_id=args.group)
            total_nodes += len(result.nodes)
            total_edges += len(result.edges)
            total_episodes += len(result.episodes)

            elapsed = time.time() - start_time
            print_progress(
                batch_end, len(episodes), elapsed,
                total_nodes, total_edges, len(errors),
            )
            batch_elapsed = time.time() - batch_t
            print(f"  (batch {batch_idx+1}/{num_batches}: {batch_elapsed:.0f}s)", flush=True)

        except Exception as e:
            err_str = str(e)
            batch_elapsed = time.time() - batch_t
            errors.append(f"Batch {batch_idx+1} ({batch_start}-{batch_end}): {err_str[:300]}")
            print(f"\n  Batch {batch_idx+1}/{num_batches}: ERROR ({batch_elapsed:.0f}s) - {err_str[:200]}",
                  flush=True)

            if "429" in err_str or "rate limit" in err_str.lower():
                print("  Rate limited. Waiting 30s before retry...", flush=True)
                await asyncio.sleep(30)
                try:
                    result = await g.add_episode_bulk(batch, group_id=args.group)
                    total_nodes += len(result.nodes)
                    total_edges += len(result.edges)
                    total_episodes += len(result.episodes)
                    elapsed = time.time() - start_time
                    print_progress(
                        batch_end, len(episodes), elapsed,
                        total_nodes, total_edges, len(errors),
                    )
                    print(f"  (retry OK)", flush=True)
                    errors.pop()
                except Exception as e2:
                    errors.append(f"Batch {batch_idx+1} retry: {str(e2)[:300]}")
                    print(f"  Retry failed: {str(e2)[:200]}", flush=True)

    elapsed = time.time() - start_time

    print(f"\n\n{'='*60}")
    print(f"DONE")
    print(f"{'='*60}")
    print(f"  Group:             {args.group}")
    print(f"  Episodes ingested: {total_episodes}")
    print(f"  Entity nodes:      {total_nodes}")
    print(f"  Relationships:     {total_edges}")
    print(f"  Errors:            {len(errors)}")
    print(f"  Time:              {format_time(elapsed)}")
    if total_episodes:
        print(f"  Rate:              {total_episodes/elapsed:.2f} episodes/sec")
        print(f"  Avg per episode:   {elapsed/total_episodes:.1f}s")
    if errors:
        print(f"\n  Errors:")
        for e in errors[:20]:
            print(f"    - {e}")

    await g.close()


if __name__ == "__main__":
    asyncio.run(main())
