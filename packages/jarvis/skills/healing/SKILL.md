---
name: healing
description: "Diagnose repeated task failures by categorising error patterns, probing service health with read-only MCP calls, and escalating when manual intervention is needed."
---

# Healing Skill

Diagnoses why a heartbeat task is failing repeatedly. Read-only -- never modifies data, moves emails, creates events, or changes budget entries. When in doubt, escalate.

## Step 1: Parse Error Context

Read the error context provided in the dispatch prompt. Extract:

- **task_name**: the heartbeat task that is failing
- **consecutive_failures**: how many times in a row it has failed
- **recent_errors**: list of error messages with timestamps (up to 5)
- **service**: the underlying service (imap, caldav, carddav, ynab, webdav)

If any field is missing from the prompt, note it as "unknown" and proceed with what is available.

## Step 2: Categorise Error Pattern

Classify the error into exactly one of these categories based on the error messages:

- **connectivity**: connection refused, timeout, ETIMEDOUT, ECONNREFUSED, ENOTFOUND, DNS resolution failure, socket hang up, EHOSTUNREACH
- **auth**: 401, 403, credential expired, token invalid, login failed, authentication failed, unauthorized, forbidden
- **rate_limit**: 429, too many requests, rate exceeded, retry-after, throttled
- **data**: parsing error, unexpected response format, missing field, JSON.parse, SyntaxError, cannot read property, TypeError
- **resource**: out of memory, ENOMEM, disk full, ENOSPC, process killed, OOMKilled
- **unknown**: none of the above patterns match

Use the error messages to determine category. Multiple errors showing the same pattern reinforce the classification. A progression (e.g., auth failure then connectivity failure) should use the most recent pattern.

## Step 3: Diagnose by Category

### connectivity

1. Attempt to use the relevant MCP tools to test the connection:
   - IMAP service: call `mcp__jarvis-email__list_unread` with limit 1
   - CalDAV service: call `mcp__jarvis-calendar__list_events` for today
   - Budget service: call `mcp__jarvis-budget__list_accounts`
   - Files service: call `mcp__jarvis-files__list_files` with path "/"
2. If the tool succeeds: transient issue, service has recovered. Report "Transient connectivity issue, service recovered."
3. If the tool fails: service is down or network issue. Check if multiple services are affected (indicates network-level problem vs single service).

### auth

1. Attempt a simple read-only operation via the relevant MCP tool (same as connectivity probes above).
2. If auth error confirms: escalate to Paul. Credentials need manual renewal.
3. Report which credential set is affected (MAILBOX_USER/MAILBOX_PASS for IMAP/CalDAV/CardDAV, YNAB_TOKEN for budget, etc.)

### rate_limit

1. This is self-resolving. Report the rate limit pattern and when it started.
2. Suggest reducing heartbeat frequency for the affected task if this happens repeatedly (3+ rate limit episodes).
3. No immediate action needed.

### data

1. Attempt the operation that triggered the error using the relevant MCP tool.
2. If reproducible: report the exact error and the data shape that caused it.
3. If not reproducible: likely a transient API response issue. Report "Data parsing issue appears transient."

### resource

1. Escalate immediately -- Paul needs to check VPS disk/memory.
2. Report the specific resource constraint from the error messages.
3. This cannot be diagnosed further from within the agent.

### unknown

1. Report all error messages verbatim.
2. Escalate to Paul with full context.
3. Do not attempt to guess the root cause.

## Step 4: Take Action or Escalate

Based on the diagnosis:

- **Transient (connectivity recovered, rate limit passed, data issue not reproducible):** Report recovery. No action needed. Include what was tested and the result.
- **Requires human intervention (auth, resource, unknown, persistent connectivity):** Send escalation notification including:
  - Task name and consecutive failure count
  - Diagnosis category
  - Specific error messages (verbatim, not summarised)
  - Recommended action for Paul (e.g., "Renew MAILBOX_PASS credential", "Check VPS disk space with `df -h`")

Never attempt to fix credential issues. Never modify configuration. Never restart services. The healing agent is strictly read-only and diagnostic.

## Step 5: Summary

Produce a brief healing report following `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` tone. Structure:

```
Healing report for "{task_name}" ({consecutive_failures} consecutive failures).

Diagnosis: {category}
{One-sentence finding}

{Action taken or escalation details}
```

Keep it concise. No filler. State facts and actions only.
