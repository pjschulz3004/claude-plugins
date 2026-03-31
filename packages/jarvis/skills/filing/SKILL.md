---
name: filing
description: "Extract PDF attachments from invoice emails, smart-name them, and file to inbox for archival."
---

# Invoice Filing Skill

Processes invoice emails: extracts attachment details, constructs smart filenames, saves to the files inbox for WebDAV archival. Runs weekly (Monday 9am heartbeat task).

## Step 1: Find Invoice Emails

Call `mcp__jarvis-email__search` with folder `INBOX/Business/Invoices` to retrieve recent invoice emails. If that folder is empty or unavailable, search for emails with invoice keywords in the INBOX using `mcp__jarvis-email__search` with query `invoice OR rechnung OR faktur`.

For each result, extract:
- uid
- sender (company name — parse display name from "Company Name <email@example.com>")
- subject
- date
- any attachment indicators in the result

## Step 2: Extract and Name Each Invoice

For each invoice email:

**Parse metadata:**
1. Date: use email date field, format as `YYYY-MM-DD`
2. Company name: use sender display name. Strip legal suffixes (GmbH, Ltd, Inc, UG, AG) if they make the name too long. Normalise spaces to underscores. Remove special characters.
3. Amount: search subject and body snippet for patterns like `€X.XX`, `EUR X.XX`, `X,XX EUR`, `X.XX EUR`. Take the first match. If no amount found, use `unknown-amount`.

**Construct filename:**
```
YYYY-MM-DD_{Company}_{Amount}.pdf
```

Examples:
- `2026-03-15_Hetzner_4.51EUR.pdf`
- `2026-03-01_Adobe_54.99EUR.pdf`
- `2026-02-28_Digitalocean_12.00USD.pdf`
- `2026-03-10_Bundesnetzagentur_unknown-amount.pdf`

**Handle PDF attachment:**
- If the email MCP server exposes attachment content: call `mcp__jarvis-files__save_to_inbox` with the constructed filename and attachment content.
- If attachment content is not available via MCP: flag the email for manual download. Still record the constructed filename so Paul knows what to name it. Call `mcp__jarvis-email__flag` to mark it for attention.

## Step 3: Archive Processed Emails

For each invoice email that was successfully filed (attachment saved to inbox):
- Call `mcp__jarvis-email__mark_read` to mark as read
- The email stays in `INBOX/Business/Invoices` — do not trash or move (audit trail)

For emails that could not be processed (no attachment, unparseable), leave them unread and flagged.

## Step 4: Summary

Report following `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` tone rules.

Include:
- N invoices filed successfully, filenames listed
- N invoices flagged for manual download (attachment not accessible), with email subjects
- N invoices skipped (already processed / already read)
- Any parsing failures with reason

Example output:
```
3 invoices filed this week.

Filed: 2026-03-28_Hetzner_4.51EUR.pdf, 2026-03-25_Adobe_54.99EUR.pdf, 2026-03-20_Digitalocean_12.00USD.pdf

1 invoice requires manual download — attachment not accessible via MCP: "Rechnung März 2026 — Bundesnetzagentur" (flagged in inbox).
```
