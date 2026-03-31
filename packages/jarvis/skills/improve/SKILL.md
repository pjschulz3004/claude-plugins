---
name: improve
description: "Nightly self-improvement cycle. Analyses 6 dimensions of operational data, detects corrections and patterns, updates rule files, reports changes."
---

# Nightly Self-Improvement Skill

Analyses Jarvis's operational data across 6 dimensions, detects human corrections that signal misclassifications, extracts patterns for rule evolution, and updates the living rule files. Runs at 03:30 nightly. Every change must be logged for the summary notification.

## Preparation

Read these files before starting analysis:

1. `${CLAUDE_PLUGIN_ROOT}/references/email-rules.md` -- current email classification rules
2. `${CLAUDE_PLUGIN_ROOT}/references/budget-rules.md` -- current budget categorisation rules
3. `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` -- output tone for summary

Initialise a changes log (in-memory list). Every modification made during the cycle gets appended here for the final summary.

## Dimension 1: Task Performance Analysis

**Purpose:** Identify systemic issues from the task ledger.

**Procedure:**

1. Read the task ledger database at `jarvis.db` (SQLite). Query the last 24 hours of task_runs:
   ```sql
   SELECT task_name, status, duration_ms, error, started_at
   FROM task_runs
   WHERE started_at > datetime('now', '-24 hours')
   ORDER BY started_at DESC
   ```
   Use the Read tool on the database, or if MCP tools provide ledger access, use those.

2. For each task, compute:
   - Failure rate: count(failure) / count(total) for last 24h
   - Average duration vs historical average (last 7 days)
   - Empty result rate: count runs where result contained "0 emails processed" or similar empty indicators

3. Flag anomalies:
   - Tasks with >30% failure rate in last 24h (vs <10% historical)
   - Tasks running >2x their 7-day average duration
   - Tasks producing empty results >50% of the time (suggests the task is running but not finding work -- may need schedule adjustment)

4. For each anomaly: log to changes list as `OBSERVATION: {task_name} -- {description}`. Do NOT auto-fix task configurations. Observations are reported to Paul.

## Dimension 2: Email Triage Correction Detection

**Purpose:** Learn from emails Paul manually moved after triage classified them.

**Procedure:**

1. Call `mcp__jarvis-email__search` to find emails moved in the last 24 hours. Search across all folders for emails with recent INTERNALDATE that are NOT in the folder the triage skill would have placed them.

   Strategy: The triage skill classifies emails and moves them to deterministic folders (INBOX/Business/Invoices, INBOX/Personal/Newsletters, etc.). If an email is now in a different folder than expected, Paul moved it -- that is a correction signal.

2. To detect corrections:
   a. List all non-INBOX folders using `mcp__jarvis-email__list_folders`
   b. For each folder, search for recently-arrived emails (last 24h) using `mcp__jarvis-email__search` with date filter
   c. For each email found: check if the email's sender matches an existing sender rule in email-rules.md
      - If sender IS in rules but email is in a DIFFERENT folder than the rule would route to: this is a correction. The rule is wrong.
      - If sender is NOT in rules and email is in a non-INBOX folder: Paul manually moved it. This is a candidate for a new rule.

3. For each correction detected:
   - Extract: sender address, current folder (Paul's choice), expected folder (from rules or "no rule")
   - Determine the correct category from the folder path (e.g., INBOX/Business/Invoices -> invoice, INBOX/Personal/Newsletters -> newsletter)
   - Log to changes list: `EMAIL RULE: {action} -- {sender} -> {category} (was: {old_category_or_none})`

4. Do NOT update email-rules.md yet -- collect all changes first, apply in Dimension 5.

## Dimension 3: Budget Categorisation Correction Detection

**Purpose:** Learn from transactions Paul recategorised in YNAB after the budget agent auto-categorised them.

**Procedure:**

1. Call `mcp__jarvis-budget__get_transactions` for the last 7 days.

2. For each transaction:
   - Check if the payee matches an existing rule in budget-rules.md
   - If the payee HAS a rule but the transaction's current YNAB category differs from the rule's category: Paul recategorised it. This is a correction.
   - If the payee has NO rule and the transaction IS categorised: this is a candidate for a new payee rule.

3. For new rule candidates, only create a rule if the same payee appears 2+ times with the same category (avoid one-off noise).

4. For each correction or new rule:
   - Extract: payee name (normalised -- trim whitespace, lowercase), YNAB category name
   - Log to changes list: `BUDGET RULE: {action} -- {payee} -> {category} (was: {old_category_or_none})`

5. Do NOT update budget-rules.md yet -- collect all changes first, apply in Dimension 5.

## Dimension 4: Telegram Conversation Pattern Analysis

**Purpose:** Spot recurring questions or requests that could become proactive heartbeat tasks or skill improvements.

**Procedure:**

1. Read the Telegram chat history from the SQLite database (`jarvis.db`, table `chat_messages`):
   ```sql
   SELECT role, content, created_at
   FROM chat_messages
   WHERE role = 'user' AND created_at > datetime('now', '-7 days')
   ORDER BY created_at DESC
   ```

2. Scan user messages for patterns:
   - Same question asked 3+ times in 7 days (e.g., "what's my schedule today", "how much did I spend this week")
   - Requests that map to existing heartbeat tasks but outside their schedule (e.g., asking for budget at 10am when budget_check runs at 20:00)
   - Questions that require cross-domain synthesis not currently handled by any skill

3. For each pattern found:
   - Log to changes list: `PATTERN: '{question_pattern}' asked {N} times -- consider {suggestion}`
   - Suggestions can be: "add to morning briefing", "create new heartbeat task", "adjust schedule for {existing_task}"

4. These are OBSERVATIONS only -- do not create new tasks or modify heartbeat.yaml automatically. Paul reviews in the summary notification.

## Dimension 5: Rule File Updates

**Purpose:** Apply the email and budget rule changes collected in Dimensions 2 and 3.

**Procedure for email-rules.md:**

1. Read `${CLAUDE_PLUGIN_ROOT}/references/email-rules.md` using the Read tool
2. For each email rule change from Dimension 2:
   - **New rule**: Add a row to the Sender Rules table: `| {sender} | {category} | {auto_delete_or_dash} | Added by improve agent {date} |`
   - **Corrected rule**: Update the existing row's Category column. Add note: `Updated by improve agent {date} (was: {old_category})`
3. Write the updated file using the Write tool
4. Log each write to changes list: `UPDATED email-rules.md: {N} rules added, {M} rules corrected`

**Procedure for budget-rules.md:**

1. Read `${CLAUDE_PLUGIN_ROOT}/references/budget-rules.md` using the Read tool
2. For each budget rule change from Dimension 3:
   - **New rule**: Add a line under `## Payee Rules`: `| {payee_pattern} | {ynab_category} | Added by improve agent {date} |`
   - **Corrected rule**: Update the existing line's category. Add note: `Updated {date} (was: {old})`
3. If the Payee Rules section still has the "(No payee rules seeded yet)" placeholder, replace it with a markdown table header: `| Payee | Category | Notes |` followed by `|--------|----------|-------|`
4. Write the updated file using the Write tool
5. Log each write to changes list: `UPDATED budget-rules.md: {N} rules added, {M} rules corrected`

**IMPORTANT:** When writing rule files, preserve ALL existing content. Only add or modify the specific rows identified. Never remove existing rules unless explicitly correcting them.

## Dimension 6: Summary Notification

**Purpose:** Report everything learned to Paul.

**Procedure:**

1. Compile the changes log into a plain-text summary following `jarvis-voice.md` tone rules.

2. Structure:
   - Lead with the count: "Nightly review complete. {N} changes made."
   - Group by type:
     - Task performance observations (from Dimension 1)
     - Email rules learned (from Dimension 2/5)
     - Budget rules learned (from Dimension 3/5)
     - Conversation patterns spotted (from Dimension 4)
   - Be specific: "Added sender rule: noreply@hetzner.com -> invoice" not "updated some email rules"
   - End with a light observation if nothing changed: "All quiet on the western front. Rules unchanged, tasks healthy."

3. Output the summary as the final response. The daemon will deliver it via notification channel.

**Example output:**
```
Nightly review complete. 4 changes made.

Email rules: Added 2 sender rules (noreply@hetzner.com -> invoice, digest@substack.com -> newsletter). Corrected 1 rule (notifications@github.com was notification, now reference -- Paul moved 3 of these to Reference this week).

Budget rules: Added 1 payee rule (REWE MARKT -> Groceries, seen 4 times this week).

Observations: email_triage averaged 45s per run (up from 28s last week). No failures. budget_check produced empty results 3 of 7 runs -- the uncategorised transaction backlog may be clearing.

No conversation patterns of note.
```
