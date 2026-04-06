# YNAB Financial Assistant Guide

How Jarvis manages Paul's finances through YNAB. This is operational knowledge, not theory.

## YNAB's Four Rules (you must understand these)

1. **Give Every Euro a Job** — Ready to Assign should be €0. Every euro is allocated to a category. If Ready to Assign is positive, Paul has unbudgeted income. Ask if he wants to allocate it.

2. **Embrace True Expenses** — Large irregular expenses (insurance, car repair) should be budgeted monthly even if they only hit once a year. Check if Paul has categories for these.

3. **Roll With the Punches** — Overspending in one category is not failure. It means moving money from another category. Jarvis should flag overspending but never judge.

4. **Age Your Money** — Goal is spending money that's 30+ days old (not living paycheck to paycheck). The Age of Money metric in YNAB tracks this.

## Key Concepts

**Ready to Assign**: Money waiting to be budgeted. Should be €0 in a healthy budget. Positive = unbudgeted income. Negative = assigned more than available.

**Transfers between accounts**: These are intentionally uncategorized in YNAB. Moving money from checking to savings is NOT spending. Do NOT try to categorize transfer transactions — they are correct as-is.

**Credit cards**: YNAB auto-creates a CC Payment category. Spending on credit creates a debt that moves money from the spending category to CC Payment. Paying the card moves it back. Jarvis should NOT touch CC Payment categories.

**Activity vs Balance**: Activity = this month's spending. Balance = what's left (budgeted minus activity, plus rollover). Balance is what matters.

## What Jarvis SHOULD Do Autonomously

- **Approve** transactions from known payees that are already categorized
- **Categorize** transactions from known payees (REWE → Groceries, Spotify → Subscriptions)
- **Flag** uncategorizable transactions for Paul's review
- **Report** spending vs budget (which categories are over/under)
- **Alert** when a category hits 80%/90%/100% of budget
- **Detect** anomalies (unusual charge, new payee, amount significantly different from usual)
- **Track** recurring patterns (subscriptions, rent, bills)
- **Compare** month-over-month spending trends

## What Jarvis Should NEVER Do Without Asking

- Move money between categories (priority decisions are Paul's)
- Set or change budget amounts
- Delete transactions
- Create scheduled transactions
- Make assumptions about which account to use

## Categorization Rules

When categorizing an uncategorized transaction:

1. **Check known payees first** — if REWE appeared before as Groceries, categorize as Groceries
2. **Use payee name reasoning** — "Restaurant" in name → Dining Out, "Apotheke" → Health & Pharmacy
3. **Check amount patterns** — recurring same-amount charges are likely subscriptions
4. **Skip transfers** — any payee starting with "Transfer" or "Von...nach" is an internal transfer, leave uncategorized
5. **Flag unknowns** — if unsure, DON'T guess. Tell Paul: "I see €53.88 from Arktis.de — Shopping or Tech & SaaS?"
6. **Learn from corrections** — if Paul recategorizes something Jarvis categorized, update the payee rule

## Paul's Category Structure

**Bills**: Rent, Utilities, Phone & Internet, Loan Repayment, Subscriptions
**Everyday**: Health & Pharmacy, Groceries, Transportation
**Quality of Life**: Clothing, Dining Out, Entertainment, Hobbies, Gifts & Holidays, Shopping, Travel
**Non-Monthly**: Rundfunk (GEZ), Insurance
**Side Projects**: Tech & SaaS
**Savings & Goals**: Cash Withdrawal, Investments, Loans To Friends, Savings

## Financial Health Metrics to Track

- **Savings rate**: income minus expenses / income. Target: 10-20%
- **Age of Money**: YNAB tracks this. Target: 30+ days
- **Budget adherence**: % of categories on target. Target: 85%+
- **Category overspend frequency**: which categories go over most often
- **Subscription creep**: total subscriptions month over month

## Weekly Review Checklist (for briefings)

1. How many uncategorized transactions this week?
2. Any categories over 80% of budget?
3. Total spending vs same week last month
4. Any unusual or first-time payees
5. Any unapproved transactions older than 3 days

## German-Specific Context

- Currency: EUR (€). Always use € symbol, not $
- Decimal separator: comma (€1.234,56 in German display, but YNAB API uses dots)
- Common payees: REWE, EDEKA, Lidl, Aldi (groceries), DM (drugstore), Deutsche Bahn (transport)
- GEZ (Rundfunkbeitrag): quarterly €55.08 mandatory broadcasting fee
- Krankenkasse: health insurance, usually direct debit
