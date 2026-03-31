# Budget Categorisation Rules

These rules guide the budget agent when categorising YNAB transactions.

## Principles

- Auto-categorise silently when confident
- Only alert for category overspend or truly uncategorisable transactions
- Learn from past YNAB transactions: match payee name to historical category assignments
- When multiple categories could apply, pick the one with the most historical matches

## Payee Rules

<!-- These evolve over time. The improve agent adds new rules nightly. -->
<!-- Format: payee pattern -> YNAB category name -->

(No payee rules seeded yet — the improve agent will populate this table
as it observes Paul's manual categorisations in YNAB.)

## Alerts

- Alert when a category reaches 90%+ of budget
- Alert when an uncategorisable transaction exceeds 50 EUR
- Include the payee name, amount, and date in the alert
- Do not alert for transactions under 5 EUR that are uncategorisable
