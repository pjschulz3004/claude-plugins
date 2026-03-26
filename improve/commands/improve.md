---
description: Autonomously improve a codebase through rotating cycles of security, quality, performance, testing, design, and simplification
argument-hint: "[duration: 30m, 1h, 2h] [--creep: skip to feature proposals] [--creep-build: propose AND implement top 3]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - Skill
  - WebSearch
  - WebFetch
  - mcp__filesystem__write_file
  - mcp__filesystem__edit_file
  - mcp__filesystem__read_file
  - mcp__filesystem__create_directory
  - mcp__filesystem__list_directory
  - mcp__filesystem__search_files
  - mcp__kg__kg_search
  - mcp__kg__kg_add_episode
  - mcp__plugin_snarc_snarc__snarc_search
  - mcp__plugin_snarc_snarc__snarc_patterns
  - mcp__plugin_snarc_snarc__snarc_context
  - mcp__plugin_snarc_snarc__snarc_stats
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs
  - AskUserQuestion
---

# Autonomous Codebase Improvement

**Arguments:** $ARGUMENTS

You are an autonomous improvement engine. You rotate through improvement categories, using the best available skills for each, making real changes, testing them, and committing after each successful cycle.

## Phase 0: Setup

### Enable Autopilot

Enable autopilot mode so the entire run proceeds without permission prompts:
```bash
touch "$HOME/.claude/auto-approve" && echo "AUTOPILOT ON"
```

### Parse Duration

Extract the time budget from arguments. Supported formats:
- `30m` or `30min` = 30 minutes
- `1h` or `1hr` = 1 hour (DEFAULT if no argument given)
- `2h` = 2 hours
- `1h30m` = 90 minutes

Store the parsed duration. You will track cycles against this budget, aiming for ~15-20 minutes per cycle. Calculate your target cycle count:
- 30m = 2 cycles
- 1h = 3-4 cycles
- 2h = 6-8 cycles

### Time Tracking (MANDATORY)

Record the **wall clock start time** at the beginning (`date +%s` or equivalent). Before EACH cycle:
1. Check elapsed time: `echo $(($(date +%s) - START_TIME))` seconds
2. If elapsed >= budget, skip to Phase 2 (Final Verification)
3. If remaining time < 10 minutes, do a lightweight final cycle

Log timestamps in `.improve-log.md` for each cycle start/end. This prevents speedrunning through cycles without depth. With a 2h budget, spend 15-20 minutes per cycle doing DEEP analysis (spawn sub-agents, run static analysis tools, address 3-5 findings per cycle), not surface-level passes.

### Initialize Log

Create `.improve-log.md` in the project root with:

```markdown
# Improvement Log
**Started:** [timestamp]
**Duration Budget:** [parsed duration]
**Target Cycles:** [count]

---
```

### Reconnaissance

Before any improvement work, understand the codebase:

1. **Detect project type**: Read package.json, Cargo.toml, pyproject.toml, go.mod, etc.
2. **Find test commands**: Identify how to run tests (npm test, cargo test, pytest, go test, etc.)
3. **Check git status**: Ensure clean working tree. If dirty, STOP and ask the user.
4. **Identify languages**: Note primary languages for language-specific skills.
5. **Find existing CI/linting**: Check for .eslintrc, .prettierrc, rustfmt.toml, mypy.ini, etc.
6. **Estimate codebase size**: Count source files to calibrate cycle scope.
7. **Check for previous research**: Read `.improve-research.md` if it exists (carries over from prior runs).

Record findings in the log.

### Memory Recall (SNARC Integration)

Before researching, query SNARC for cross-session intelligence about this project:

1. **Hot spot detection** — Query concept_cluster patterns to find files that keep getting worked on across sessions:
   ```
   snarc_patterns(kind="concept_cluster", query="<project directory basename>")
   ```
   Files appearing in 5+ clusters across sessions are chronic hot spots — prioritize them for deeper improvement cycles.

2. **Project context search** — Search SNARC for prior session insights about the project:
   ```
   snarc_search(query="<project name> OR <key module names>")
   ```
   Look for: identity-tier facts about the project, past debugging sessions, architectural decisions, known pain points.

3. **Error pattern detection** — Check for recurring error-fix chains:
   ```
   snarc_patterns(kind="error_fix", query="<project name>")
   ```
   Recurring fixes in the same files indicate structural issues that surface-level improvements won't solve — these need design-level refactoring.

**Use SNARC findings to:**
- Prioritize hot-spot files in early cycles (they clearly need the most attention)
- Skip areas that were recently improved (SNARC will show recent focused work)
- Add SNARC-discovered pain points to the Research Queue
- Log SNARC context in `.improve-research.md` under a `## Session Memory` section

### Research Phase (spend ~10-15% of budget here)

After reconnaissance and memory recall, research the project's specific ecosystem before touching code. This prevents generic improvements and ensures changes follow actual best practices for THIS project's stack.

**Spawn parallel research agents (Sonnet model) for:**

1. **API & SDK best practices**: For each external API/SDK the project uses (found in imports, configs, .env):
   - Use `context7` MCP to fetch current documentation for key libraries
   - WebSearch for `"<library> best practices 2025/2026"`, `"<library> common mistakes"`, `"<library> performance tips"`
   - Look for: deprecated patterns the project still uses, newer API versions, recommended configurations

2. **Language/framework idioms**: Research current best practices for the project's primary language version:
   - Python: latest typing patterns, dataclass vs pydantic, asyncio patterns, f-string vs format
   - JS/TS: latest ESNext features, framework-specific patterns (React 19, Next.js 15, etc.)
   - Rust: clippy lint categories, latest edition features, common anti-patterns

3. **Dependency health**: Quick scan of key dependencies:
   - Are any deprecated or unmaintained?
   - Are there known performance issues or better alternatives?
   - Are there major version upgrades available with migration guides?

4. **Prior run topics**: If `.improve-research.md` exists, it will have a `## Research Queue` section with topics queued by previous improvement cycles. Research those first as they represent specific knowledge gaps discovered during actual code analysis.

**Output**: Write findings to `.improve-research.md`:

```markdown
# Improvement Research — [project name]
**Last updated:** [timestamp]

## Stack Profile
- **Language:** Python 3.12
- **Framework:** FastAPI 0.115
- **Key deps:** httpx 0.28, pydantic 2.10, sqlalchemy 2.0
- **APIs:** Mistral, Groq, OpenAI

## Best Practices Found
### [library/API name]
- [practice]: [source/reason]
- [anti-pattern to avoid]: [what to do instead]

### [language idioms]
- [pattern]: [why it matters]

## Deprecated Patterns Detected
- [file:line] uses [old pattern] → should use [new pattern] (since [version])

## Research Queue
<!-- Topics added by improvement cycles for next run -->
```

This file persists across runs. Each subsequent `/improve` run reads it, acts on it, and adds new research topics discovered during cycles.

---

## Phase 1: Improvement Cycles

Execute cycles in this priority order. Each cycle picks ONE category, does focused work, tests, and commits. **Security always runs first.** After that, rotate through remaining categories based on what will have the highest impact.

### Category Rotation Order

| Priority | Category | Skills to Use | Focus |
|----------|----------|---------------|-------|
| 1 (always first) | **Security** | `sharp-edges`, `insecure-defaults`, `semgrep` (if available), `supply-chain-risk-auditor` | Vulnerabilities, insecure defaults, dependency risks |
| 2 | **Quality** | `impeccable:audit` findings, `kaizen:analyse`, `reflexion:critique` | Code smells, anti-patterns, error handling |
| 3 | **Simplification** | `impeccable:simplify`, `consider:via-negativa`, `consider:pareto` | Remove complexity, dead code, unnecessary abstractions |
| 4 | **Testing** | `property-based-testing`, `forge-tester` patterns | Missing test coverage, edge cases, property tests |
| 5 | **Performance** | `impeccable:optimize`, `kaizen:analyse` (muda/waste) | Bottlenecks, N+1 queries, unnecessary allocations |
| 6 | **Design** | `impeccable:extract`, `impeccable:normalize`, `impeccable:clarify` | Refactoring, API design, naming, documentation |
| 7 (web projects only) | **Visual/UI** | `agent-browser`, `interface-design:audit`, `interface-design:critique`, `impeccable:audit`, `impeccable:polish`, `impeccable:harden` | Visual regression, accessibility, responsive design, broken layouts, design system consistency |
| 8 (after all above stable) | **Feature Creep** | `research:landscape`, `research:competitive`, `research:open-source`, `impeccable:delight`, `impeccable:onboard` | New features, UX improvements, capability expansion |

### Feature Creep Mode

**Triggers when:** All improvement categories produce no HIGH-confidence findings for a full rotation. The codebase is clean — time to make it better.

**Research phase (use parallel agents):**

1. **Understand the app's purpose**: Read README, CLAUDE.md, package.json description, any docs/ folder. Summarize what this app does and who it's for.

2. **Check GitHub issues/feature requests** (if the project has a remote):
   ```bash
   gh issue list --label "enhancement,feature,feature-request" --state open --limit 20
   gh issue list --label "good first issue" --state open --limit 10
   gh issue list --state open --sort reactions --limit 15
   ```
   Prioritize by reaction count (most-wanted features).

3. **Research competing/related projects**:
   - Use `research:competitive` to find similar tools and compare feature sets
   - Use `research:open-source` to find libraries that could add capabilities
   - Identify features competitors have that this project lacks

4. **UX/UI audit** (for projects with frontend):
   - Use `impeccable:critique` to evaluate current design effectiveness
   - Use `impeccable:onboard` to assess first-time user experience
   - Use `impeccable:delight` to identify opportunities for polish and personality

5. **Capability gaps**: Identify patterns like:
   - Missing CLI flags that power users would want
   - Missing API endpoints that the data model supports but aren't exposed
   - Missing integrations with common tools in the ecosystem
   - Accessibility gaps
   - Missing i18n/l10n support

**Default behavior: Propose only.** Feature Creep produces a prioritized feature proposal document. The user decides what to build.

**With `--creep-build` flag:** After generating proposals, automatically implement the top 3 features ranked by (high community demand + low effort). For each:
1. Create a git branch: `feature/improve-<short-name>`
2. Use `superpowers:brainstorming` to design the approach
3. Implement with tests
4. Run full test suite to verify no regressions
5. Commit on the feature branch
6. Log what was built in `.improve-features.md`
7. Do NOT merge — leave branches for user review

For frontend features, also use `impeccable:delight` and `impeccable:polish` after implementation.

**Proposal document format:**

```markdown
## Feature Proposals — [date]

### From GitHub Issues (community-requested)
| # | Issue | Reactions | Effort | Description |
|---|-------|-----------|--------|-------------|
| 1 | #123 | 47 | Medium | [feature] |

### From Competitive Analysis
| # | Feature | Found In | Effort | Value |
|---|---------|----------|--------|-------|
| 1 | [feature] | [competitor] | [est] | [why] |

### From UX Audit
| # | Improvement | Category | Effort | Impact |
|---|-------------|----------|--------|--------|
| 1 | [improvement] | onboarding/delight/clarity | [est] | [why] |

### Recommended Next Steps
1. [highest impact, lowest effort feature]
2. [most community-requested feature]
3. [biggest competitive gap]
```

Save this to `.improve-features.md` and commit it. The user decides what to build.

**If the user passes `--creep` flag:** Skip straight to Feature Creep mode without running improvement cycles first.

### Cycle Execution Protocol

For EACH cycle:

#### Step 1: Analyse (use Task agent with Sonnet model for mechanical scanning)

Spawn a sub-agent to scan the codebase for issues in the current category. The agent should:
- Read relevant source files
- Apply the category's analysis lens
- Return a prioritized list of concrete findings with file paths and line numbers
- Focus on the TOP 3 most impactful issues (Pareto principle)

Use these skill patterns based on category:

**Security cycle:**
- Invoke `sharp-edges` skill: look for language-specific API misuse, unsafe defaults, auth issues
- Invoke `insecure-defaults` skill: find configs and code using insecure default values
- Check dependency manifests for known-vulnerable patterns (supply-chain-risk-auditor)
- If semgrep is installed (`which semgrep`), run it with auto config

**Quality cycle:**
- Look for: missing error handling, inconsistent patterns, code duplication, type safety gaps
- Apply kaizen:analyse (muda/waste identification) thinking
- Check for: TODO/FIXME/HACK comments that indicate known debt

**Simplification cycle:**
- Apply via-negativa: what can be REMOVED to improve the code?
- Find: dead code, unused exports, over-abstraction, unnecessary indirection
- Look for functions/modules that can be consolidated
- Identify overly complex conditional logic that can be flattened

**Testing cycle:**
- Find untested critical paths (auth, data mutation, error handling)
- Identify functions with complex logic but no tests
- Look for opportunities for property-based tests (invariants, round-trips)
- Check edge cases: empty inputs, boundary values, concurrent access

**Performance cycle:**
- Find: N+1 queries, unnecessary allocations, blocking I/O on hot paths
- Look for: missing caching, redundant computations, inefficient data structures
- Check: startup time, bundle size (for JS/TS projects)

**Design cycle:**
- Find: poor naming, unclear APIs, missing abstractions, leaky abstractions
- Look for: functions doing too many things, unclear module boundaries
- Check: public API surface - is it minimal and coherent?

**Visual/UI cycle (web projects only — skip if no HTML/frontend):**
- Start/find the dev server (npm run dev, python -m http.server, etc.)
- Use `agent-browser open http://localhost:<port> && agent-browser wait --load networkidle`
- Use `agent-browser snapshot -i` to audit interactive elements (broken buttons, missing labels, inaccessible forms)
- Use `agent-browser screenshot --annotate .improve-screenshots/ui-audit.png` for visual inspection
- Read the annotated screenshot to check: layout issues, overflow, missing responsive design, broken images
- Test critical user flows: navigation, form submission, error states
- Check accessibility: missing alt text, unlabeled inputs, keyboard navigation
- If `.interface-design/system.md` exists, use `interface-design:audit` to check code against the design system (spacing grid, depth strategy, color palette, pattern drift)
- Use `interface-design:critique` to evaluate craft quality: composition rhythm, proportion, focal point, surface layering, interaction states, content coherence
- Use `impeccable:audit` findings for structured UI quality assessment
- Use `impeccable:harden` for error state and edge case resilience

#### Step 2: Fix (make targeted changes)

For each of the top findings:
1. Make the fix in the source code
2. Keep changes focused and atomic - one logical improvement per finding
3. Ensure changes are backwards-compatible unless fixing a security issue

**CRITICAL RULES:**
- Never change test expectations to make tests pass - fix the code
- Never delete tests unless they test removed functionality
- Never introduce new dependencies without strong justification
- Preserve all existing public APIs unless they are security risks

#### Step 3: Verify

After making changes:
1. Run the project's test suite. If tests exist and a test command was identified, run it.
2. If tests fail, revert the change that caused the failure and note it in the log.
3. If no tests exist, verify manually that the code still parses/compiles:
   - JS/TS: `npx tsc --noEmit` or equivalent
   - Rust: `cargo check`
   - Python: `python -m py_compile <file>`
   - Go: `go vet ./...`
4. Run any available linters.
5. **For web projects with a dev server**: Use agent-browser for visual verification:
   ```bash
   # If dev server is running (or start it)
   agent-browser open http://localhost:<port> && agent-browser wait --load networkidle
   agent-browser screenshot .improve-screenshots/cycle-N.png --annotate
   agent-browser snapshot -i  # Check interactive elements work
   ```
   Read the annotated screenshot to verify nothing is visually broken.

#### Step 4: Commit

If verification passed:
```bash
git add -A
git commit -m "<category>: <concise description of what improved and why>"
```

If verification failed, revert uncommitted changes and log the failure.

#### Step 5: Log & Queue Research

Append to `.improve-log.md`:

```markdown
## Cycle N: [Category]
**Status:** SUCCESS | FAILED | PARTIAL
**Time:** [start] → [end] ([minutes]m)
**Changes:**
- [file]: [what changed and why]
- [file]: [what changed and why]

**Findings not addressed (for future cycles):**
- [finding]: [reason deferred]

---
```

**Queue research topics**: During each cycle, when you encounter patterns, APIs, or libraries where you're unsure of current best practices, or where the code uses an approach that might be outdated, append to the `## Research Queue` section in `.improve-research.md`:

```markdown
- **[topic]** — discovered in [category] cycle: [why this needs research]. Source: [file:line]
```

Examples of what to queue:
- Security cycle finds a JWT library — queue "JWT best practices for [library] [version]"
- Quality cycle sees raw SQL — queue "[ORM] query builder patterns vs raw SQL for [use case]"
- Performance cycle sees sync HTTP calls — queue "[library] async patterns and connection pooling"
- Any cycle sees a deprecated import warning — queue "[library] migration guide from [old] to [new]"

These topics get researched at the start of the NEXT `/improve` run, making each run smarter than the last.

### Cycle Budget Management — HARD TIME GATE

**THIS IS THE MOST IMPORTANT RULE IN THE ENTIRE COMMAND.**

After EVERY cycle, run this check before doing ANYTHING else:

```bash
ELAPSED=$(($(date +%s) - START_TIME))
REMAINING=$((BUDGET_SECONDS - ELAPSED))
echo "Elapsed: ${ELAPSED}s / ${BUDGET_SECONDS}s | Remaining: ${REMAINING}s"
```

**Rules:**
- If `REMAINING > 600` (10+ minutes left): **YOU MUST start another cycle.** Do NOT proceed to Phase 2.
- If `REMAINING` is between 300-600: Do one more lightweight cycle (quick scan, targeted fixes).
- If `REMAINING < 300`: Proceed to Phase 2 (Final Verification).
- If all 8 categories have been covered and time remains: **Start a SECOND rotation**, going deeper on categories where findings were deferred. Use the deferred findings list as your starting point.
- If a second rotation finds nothing new (stall detection): Enter Feature Creep mode with remaining time.

**You are NOT allowed to proceed to Phase 2 while REMAINING > 600.** This is a hard constraint, not a suggestion. The user paid for the full duration — use it.

**Cycle depth should scale with budget:**
- 30m budget: 2 cycles, ~12 min each — quick scan, top 2-3 fixes per cycle
- 1h budget: 4-5 cycles, ~10-12 min each — sub-agent analysis, 3-5 fixes per cycle
- 2h budget: 8-10 cycles, ~12-15 min each — full static analysis, property tests, deep refactoring

---

## Phase 2: Final Verification

After all cycles complete:

1. **Run full test suite** one final time
2. **Check git log** - review all commits made during this session
3. **Generate summary** by completing the log:

```markdown
## Summary
**Completed:** [timestamp]
**Cycles Run:** N
**Commits Made:** N
**Categories Covered:** [list]

### Improvements by Category
| Category | Changes | Impact |
|----------|---------|--------|
| Security | N fixes | [brief] |
| Quality | N fixes | [brief] |
| ... | ... | ... |

### Deferred Findings
[Ranked list of issues found but not addressed, for future runs]

### Recommendations
[What to focus on next time]
```

4. **Commit research and log**:
```bash
git add .improve-log.md .improve-research.md
git commit -m "improve: add improvement session log and research"
```

The `.improve-research.md` file carries forward to the next run. Its Research Queue section contains specific topics discovered during this session that need investigation before the next round of improvements can be fully informed.

5. **Disable autopilot**:
```bash
rm -f "$HOME/.claude/auto-approve" && echo "AUTOPILOT OFF"
```

---

## Operating Principles

### Pareto Focus
Do NOT try to fix everything. Fix the 20% of issues that deliver 80% of improvement. Skip cosmetic issues in favor of substantive ones.

### Safety First
- Always verify after changes
- Revert on failure rather than cascading fixes
- Never force-push or rewrite history
- Keep changes atomic and reviewable

### Model Tiering for Sub-Agents
When spawning Task agents:
- Use **Sonnet** for: scanning, finding issues, running analysis, mechanical reviews
- Use **Opus** for: design decisions, architecture changes, complex refactoring judgment calls
- Always give agents **write permissions**

### Context Isolation
- Each sub-agent gets focused context for its specific task
- Do NOT read implementation artifacts back into the orchestrator
- Write findings to files, not through the orchestrator context

### Stall Detection
If two consecutive cycles produce the same findings or no actionable improvements:
- STOP cycling
- Report what was found and what was already addressed
- Move to Phase 2 (Final Verification)

### What NOT to Improve
- Generated files (compiled output, lockfiles, vendor directories)
- Configuration files that are environment-specific (.env, docker-compose overrides)
- Third-party code (node_modules, vendor, external)
- Files with "DO NOT EDIT" markers

---

## Autonomous Execution

To run `/improve` fully unattended, use the launcher script:

```bash
~/scripts/improve-autonomous.sh <project-dir> [duration] [flags]

# Examples:
~/scripts/improve-autonomous.sh ~/Projects/Jarvis 2h
~/scripts/improve-autonomous.sh ~/Projects/THEO 1h --creep-build
```

This uses `claude -p` (non-interactive print mode) with `--dangerously-skip-permissions` to avoid all confirmations. The script handles:
- Changing to the project directory
- Passing the full improve prompt
- Logging output to `.improve-output.log`
- Running in the background if desired (append `&`)
