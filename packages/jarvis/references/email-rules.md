# Email Triage Rules

These rules are applied deterministically before any LLM classification.
The triage skill checks rules in priority order. First match wins.

## Categories

- action_required: Needs Paul's response or decision
- waiting: Paul is waiting for a response
- reference: Useful information, no action needed
- newsletter: Subscriptions, feeds, digests
- invoice: Bills, receipts, payment confirmations
- notification: Automated alerts (auto-delete candidates)
- noise: Spam, marketing, unwanted — trash immediately

## Routing

- Emails to/from it@jschulz.org are business -> INBOX/Business/{category}
- All other emails are personal -> INBOX/Personal/{category}
- Newsletters always go to INBOX/Personal/Newsletters
- Invoices always go to INBOX/Business/Invoices
- Noise gets trashed immediately
- Notifications stay in INBOX (with optional auto-delete keyword)

## Deterministic Signals (priority order)

1. **Sender rules** (below): exact sender match -> category + optional auto_delete
2. **List-Unsubscribe header**: present -> Newsletter
3. **Invoice keywords in subject**: rechnung, invoice, faktur, beleg, receipt, order confirmation, quittung, zahlungsbestatigung + attachment indicator -> Invoice
4. **Fallback**: LLM classification

## Sender Rules

<!-- These evolve over time. The improve agent adds new rules nightly. -->

| Sender | Category | Auto-Delete | Notes |
|--------|----------|-------------|-------|
| noreply@cloudflare.com | notification | 3d | Infrastructure alerts |
| noreply@dhl.de | notification | 7d | Package tracking |
| noreply@trustpilot.com | noise | - | Marketing spam |
| noreply@teamviewer.com | notification | 3d | License alerts |
| notifications@github.com | notification | - | PR/issue notifications |
| messages-noreply@linkedin.com | noise | - | LinkedIn spam |

## Auto-Delete Keywords

- $AutoDelete3d: Delete after 3 days
- $AutoDelete7d: Delete after 7 days

Set via IMAP keyword when categorising. The email_cleanup heartbeat task handles deletion.

## LLM Fallback Instructions

When no deterministic signal matches, classify the email using these guidelines:
- From a real person with a question or request -> action_required
- From a real person as a reply in an ongoing thread Paul started -> waiting
- Automated but contains useful reference information -> reference
- Bulk/marketing from a company Paul doesn't interact with -> noise
- When uncertain, prefer reference over noise (false positive trash is worse than clutter)
