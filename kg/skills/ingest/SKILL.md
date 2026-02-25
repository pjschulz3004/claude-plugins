---
name: ingest
description: "Batch ingest markdown files into a knowledge group."
---

# KG Ingest

Batch ingest a directory of markdown files into the knowledge graph.

## Step 1: Determine Parameters

From the user's arguments or by asking:
- **directory**: Path to the markdown files (required)
- **group**: Target group_id (required, must be in registry)

If not provided, ask the user for both.

## Step 2: Validate

1. Check the directory exists and contains `.md` files
2. Use `kg_status` to verify the group is registered
3. Show a preview: number of files, estimated chunks, target group

Ask for confirmation before proceeding.

## Step 3: Run Batch Ingestion

Run the batch ingestion script:

```bash
~/.kg/venv/bin/python ~/.claude/plugins/local/kg/scripts/batch-ingest.py \
  --dir <directory> --group <group>
```

The script handles chunking, rate limiting, and progress reporting.

## Step 4: Report Results

After completion, show:
- Episodes ingested
- Nodes and edges created
- Any errors
- Suggest `/kg search` to verify results
