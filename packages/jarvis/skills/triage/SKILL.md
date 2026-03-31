---
name: triage
description: "Classify unread emails using deterministic rules first, LLM fallback for ambiguous. Deterministic-first reduces cost and improves consistency."
---

# Email Triage Skill

Classifies and routes unread emails through a 4-signal deterministic chain before falling back to LLM judgment. First match wins. Always load rules before fetching email.

## Step 1: Load Rules

Read `${CLAUDE_PLUGIN_ROOT}/references/email-rules.md`. Parse into working memory:

- Sender rules table (6+ entries): sender address -> category + auto_delete
- Invoice keywords list: rechnung, invoice, faktur, beleg, receipt, order confirmation, quittung, zahlungsbestatigung
- Category definitions (7 categories)
- Folder routing logic (business vs personal, target paths)
- LLM fallback heuristics

## Step 2: Fetch Unread

Call `mcp__jarvis-email__list_unread` with limit 25. For each email, extract:

- uid
- sender (full address, extract the bare email with regex `<(.+)>` or take the full string if no angle brackets)
- subject
- date
- flags (existing keywords/flags)

## Step 3: Deterministic Classification

For each email, test signals in strict priority order. Stop at the first match.

**Signal 1 — Sender match:**
Extract the bare email address from the sender field. Check against the sender rules table (exact match, case-insensitive). If match found: assign category and auto_delete value from the table. Mark as deterministic.

**Signal 2 — List-Unsubscribe header:**
If the email was returned with a List-Unsubscribe header or indicator, classify as newsletter. As a heuristic when header data is unavailable: sender patterns like `noreply@`, `newsletter@`, `digest@`, `updates@`, `info@` combined with a subject that reads like a publication title (volume, issue, digest, weekly, monthly) should classify as newsletter.

**Signal 3 — Invoice keywords:**
Check subject (case-insensitive) for any invoice keyword from the list above. If found AND the subject or snippet also contains any of: PDF, attached, attachment, Anhang, anbei, enclosed — classify as invoice.

**Signal 4 — No match:**
Mark as ambiguous for LLM classification in Step 4.

## Step 4: LLM Classification (ambiguous emails only)

For each email marked ambiguous, apply these heuristics from email-rules.md:

- Sender is a real person + message is a question or request -> action_required
- Sender is a real person + message is a reply in a thread Paul started -> waiting
- Automated message with useful reference information -> reference
- Bulk marketing from a company Paul doesn't regularly interact with -> noise
- When uncertain: prefer reference over noise. False-positive trash is worse than clutter.

Record: category + one-sentence reason (for the improve agent to learn from corrections).

## Step 5: Route

For each classified email:

1. Determine account type: if to/from `it@jschulz.org` -> business, else personal.
2. Determine target folder:
   - business: `INBOX/Business/{Category}` (e.g. `INBOX/Business/Invoices`, `INBOX/Business/ActionRequired`)
   - personal: `INBOX/Personal/{Category}` (e.g. `INBOX/Personal/Newsletters`)
   - newsletters always -> `INBOX/Personal/Newsletters` regardless of account
   - invoices always -> `INBOX/Business/Invoices` regardless of account
   - notifications: stay in INBOX (no move needed, just keyword)
   - noise: trash immediately

3. Execute actions:
   - noise: call `mcp__jarvis-email__trash` with uid
   - all others with a target folder: call `mcp__jarvis-email__move` with uid and target folder
   - auto_delete set to "3d": call `mcp__jarvis-email__set_keyword` with keyword `$AutoDelete3d`
   - auto_delete set to "7d": call `mcp__jarvis-email__set_keyword` with keyword `$AutoDelete7d`
   - action_required: call `mcp__jarvis-email__flag` with uid

## Step 6: Summary

Produce a triage summary following `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` tone rules.

Structure (priority order):

- action_required first: count + subject lines
- invoice: count + subject lines
- waiting: count only
- reference: count only
- newsletter, notification: count only
- noise trashed: count only

End with total processed. No filler. Be specific. If inbox was quiet ("3 emails, all notifications auto-tagged"), say so briefly.

Example output:
```
Triage complete. 14 emails processed.

Action required (2): "Contract review deadline — Sarah", "Invoice dispute — Hetzner"
Invoices filed (3): Hetzner March, Digitalocean Feb, Adobe CC
Newsletters archived: 4
Notifications tagged ($AutoDelete3d): 3
Noise trashed: 2
```
