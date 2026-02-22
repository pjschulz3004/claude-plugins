---
name: forge-temper
description: This skill should be used when the user runs "forge temper", "harden the code", "security review", "performance audit", "prepare for shipping", or when the SHAPE phase is complete. Runs security, performance, and quality audits before delivery.
version: 0.1.0
---

# Forge TEMPER — Hardening Phase

Code exists and features work. Now make it production-ready. AI-generated code is NOT optimized for security, performance, or scalability by default — this phase explicitly checks for all three.

## Entry

1. Read `forge.local.md` — verify SHAPE is complete
2. If SHAPE is not complete, explain and redirect

## Step 1: Security Review

Spawn `forge-reviewer` subagent with security focus.

Checklist:
- Input validation at all system boundaries (Layer 3 edges)
- Authentication and authorization on protected routes
- No hardcoded secrets, API keys, or credentials
- SQL injection, XSS, command injection prevention
- CORS configuration (if web)
- Dependency audit (`npm audit` / `pip audit` / `cargo audit`)
- File upload validation (if applicable)
- Rate limiting on public endpoints

Present findings with severity ratings (critical / high / medium / low).
Fix all critical and high issues before proceeding.

Update `forge.local.md`: set `temper.security_reviewed: true`

## Step 2: Performance Audit

Spawn `forge-reviewer` subagent with performance focus.

Checklist:
- Database query efficiency (N+1 queries, missing indexes)
- Unnecessary re-renders (if frontend)
- Bundle size analysis (if web)
- Memory leaks in long-running processes
- Caching opportunities
- Async operations that should not block

Present findings with impact estimates.
Fix high-impact issues. Log others as known tradeoffs.

Update `forge.local.md`: set `temper.performance_reviewed: true`

## Step 3: Git Diff Review (Mandatory)

This is the most important step. Review the git diff for critical logic errors that testing alone cannot catch.

Run: `git diff main...HEAD` (or appropriate base branch)

Focus on:
- **Fallback logic**: Does the code use `created_at` as a fallback for `birth_date`? Subtle data errors that "work" in testing but are semantically wrong.
- **Default values**: Are defaults reasonable? Will they cause issues at scale?
- **Error handling**: Are errors swallowed silently? Logged but not handled?
- **Type coercion**: Implicit conversions that could lose data
- **Race conditions**: Concurrent access patterns
- **Off-by-one**: Loop boundaries, pagination, time ranges

Present each finding with the exact diff hunk and explanation.

**Point & Call:** Ask the user to confirm: "I have reviewed the critical logic in the diff and it is correct."

Update `forge.local.md`: set `temper.diff_reviewed: true`

## Step 4: Code Simplification

Invoke the `code-simplifier` agent (if available) or spawn `forge-reviewer` with simplification focus.

Look for:
- Dead code that can be removed
- Over-abstraction (premature DRY)
- Functions that can be simplified
- Comments that restate the code
- Unused imports and dependencies

Apply changes conservatively. Each simplification should make the code clearer, not just shorter.

Update `forge.local.md`: set `temper.simplified: true`

## Step 5: Final Test Suite

Spawn `forge-tester` subagent to run the complete test suite.

1. Run all unit tests
2. Run all integration tests
3. Run E2E tests (if they exist)
4. Report coverage metrics
5. Flag any tests that are flaky or skipped

All tests must pass before proceeding.

## Phase Transition

When all steps complete:
1. Update `forge.local.md`: set `phase: DELIVER`
2. Announce: "TEMPER complete. Code is hardened. Transitioning to DELIVER."
3. Invoke the `forge-deliver` skill
