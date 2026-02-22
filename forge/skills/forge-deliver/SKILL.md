---
name: forge-deliver
description: This skill should be used when the user runs "forge deliver", "ship it", "create PR", "deploy", "finalize the project", or when the TEMPER phase is complete. Handles PR creation, deployment, and project completion.
version: 0.1.0
---

# Forge DELIVER — Shipping Phase

Code is built, tested, and hardened. Now ship it.

## Entry

1. Read `forge.local.md` — verify TEMPER is complete
2. If TEMPER is not complete, explain which hardening steps remain

## Step 1: PR Creation

Invoke the `finishing-a-development-branch` skill (if available) or create the PR directly.

1. Generate PR title from the IGNITE speak summary
2. Write PR body including:
   - Summary of what was built (from IGNITE)
   - Architecture decisions made (from IGNITE approach)
   - Decomposition layers implemented (from SHAPE)
   - Security and performance findings addressed (from TEMPER)
   - Test coverage metrics
3. Create the PR using `gh pr create`

Update `forge.local.md`: set `deliver.pr_url` to the PR URL

## Step 2: Deployment Checklist

Present a deployment checklist appropriate to the project type:

### Web Application
- [ ] Environment variables configured for production
- [ ] Database migrations ready to run
- [ ] CORS and security headers configured
- [ ] SSL/TLS configured
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Logging configured for production
- [ ] Health check endpoint exists
- [ ] README updated with deployment instructions

### Python Package / CLI
- [ ] pyproject.toml version bumped
- [ ] CHANGELOG updated
- [ ] README installation instructions current
- [ ] CI/CD pipeline configured
- [ ] Package builds correctly (`python -m build`)

### General
- [ ] No debug code or console.log statements
- [ ] No hardcoded development URLs
- [ ] No TODO/FIXME comments for critical items
- [ ] License file present

Ask user to confirm each item or mark as not applicable.

## Step 3: Agent XP Log

Review the `agent_xp` entries accumulated throughout the pipeline.

Present a summary:
- What worked well (patterns to repeat)
- What caused friction (patterns to avoid)
- Time spent per phase (if tracked)
- Ralph Loop iterations needed (quality signal)

Ask user: "Any other lessons learned to log?"

Add final entries to `agent_xp` in `forge.local.md`.

## Step 4: Completion

Update `forge.local.md`: set `phase: COMPLETE`, `deliver.deployed: true`

Announce:
```
FORGE COMPLETE

Project: [name]
Phases: IGNITE ✓ → SHAPE ✓ → TEMPER ✓ → DELIVER ✓

The forge pipeline is complete. Your project went through:
- Foundation thinking (Point & Call discipline)
- Types-first decomposition (5 layers)
- Structured execution (GSD phases)
- Quality loops (Ralph Loop)
- Security and performance hardening
- Git diff review for critical logic
- Deployment preparation

Run /forge status to review the full pipeline history.
```
