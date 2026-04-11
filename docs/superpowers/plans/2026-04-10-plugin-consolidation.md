# Plugin Ecosystem Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the pjschulz3004/claude-plugins ecosystem: install GSD, migrate forge+improve into GSD extensions (demiurge plan), stand up KG as foundational infrastructure, clean up stale artifacts, and push a single-source-of-truth to GitHub.

**Architecture:** GSD (installed via npx) provides project orchestration at `~/.claude/`. Forge and Improve become GSD extensions: agents in the safe zone (`~/.claude/agents/`), workflows in the patch zone (`~/.claude/get-shit-done/workflows/`), and commands at `~/.claude/commands/gsd/`. KG gets a central hub at `~/.kg/` with Neo4j (Docker), Python/Graphiti MCP server, and group registry. Active plugins (kg, library, scribe, union-writer, autopilot, jarvis-*) remain as marketplace plugins. Deprecated plugin directories (forge, improve, demiurge) are archived.

**Tech Stack:** GSD framework (npx), Claude Code plugins, Neo4j 5 (Docker), Python 3.10+ (Graphiti, MCP), TypeScript (jarvis packages), Git

---

## File Structure

### Files to Create (GSD Safe Zone - survive updates)

```
~/.claude/
├── agents/
│   ├── forge-backend.md          # COPY from plugins/forge/agents/
│   ├── forge-frontend.md         # COPY from plugins/forge/agents/
│   ├── forge-designer.md         # COPY from plugins/forge/agents/
│   ├── forge-researcher.md       # COPY from plugins/forge/agents/
│   ├── forge-reviewer.md         # COPY from plugins/forge/agents/
│   └── forge-tester.md           # COPY from plugins/forge/agents/
├── commands/
│   └── improve.md                # COPY from plugins/improve/commands/
└── scripts/
    ├── forge-quality-gate.sh     # COPY from plugins/forge/hooks/scripts/
    ├── improve-auto-approve.sh   # COPY from plugins/improve/scripts/
    └── improve-autonomous.sh     # COPY from plugins/improve/scripts/
```

### Files to Create (GSD Patch Zone - backed up + restored on GSD update)

```
~/.claude/
├── commands/gsd/
│   ├── forge.md                  # CREATE: routing command (new/status/reset/resume)
│   ├── forge-temper.md           # CREATE: standalone hardening pass
│   ├── forge-autonomous.md       # CREATE: forge-aware autonomous loop
│   └── improve-phase.md          # CREATE: improvement cycle as GSD phase
└── get-shit-done/
    ├── workflows/
    │   ├── forge-ignite.md       # CREATE: SPEAK→EXPLORE→SHAPE_DOMAIN→FIRST_1000_LINES
    │   ├── forge-discipline.md   # CREATE: decomposition wrapper for execute-phase
    │   ├── forge-temper.md       # CREATE: security/perf/diff hardening
    │   ├── forge-deliver.md      # CREATE: PR creation with forge docs
    │   ├── forge-autonomous.md   # CREATE: autonomous loop with discipline
    │   └── forge-improve-phase.md # CREATE: scoped improvement rotation
    └── templates/
        └── forge-decomposition.md # CREATE: 5-layer decomposition prompt
```

### Files to Create (KG Infrastructure)

```
~/.kg/
├── .env                          # CREATE: Neo4j + OpenAI credentials
├── registry.yaml                 # CREATE: group registry (empty initial)
├── docker-compose.yml            # CREATE: Neo4j 5 Community Edition
├── mcp-server.py                 # CREATE: Python MCP server wrapping Graphiti
└── venv/                         # CREATE: Python virtual environment
```

### Files to Modify (Repo Cleanup)

```
plugins/
├── .claude-plugin/marketplace.json  # MODIFY: remove forge/improve/demiurge entries
├── README.md                        # MODIFY: update plugin inventory
├── forge/ARCHIVED.md                # CREATE: archive notice (replace DEPRECATED.md)
├── improve/ARCHIVED.md              # CREATE: archive notice
└── demiurge/                        # DELETE: planning artifacts served their purpose
```

### Files to Modify (Global Config)

```
~/.claude/
├── CLAUDE.md                     # MODIFY: update plugin inventory table
└── settings.json                 # MODIFY: add quality-gate hook
```

---

## Task 1: Install GSD Framework

**Files:**
- Create: `~/.claude/get-shit-done/` (entire directory tree, created by installer)
- Create: `~/.claude/commands/gsd/` (created by installer)
- Create: `~/.claude/agents/gsd-*` (created by installer)

- [ ] **Step 1: Install GSD globally**

```bash
npx get-shit-done-cc@latest --claude --global
```

Expected: GSD installs its directory structure under `~/.claude/`, including `get-shit-done/`, `commands/gsd/`, `agents/gsd-*`, hooks, and bin/lib tooling.

- [ ] **Step 2: Verify installation**

```bash
ls ~/.claude/get-shit-done/
ls ~/.claude/commands/gsd/
ls ~/.claude/agents/gsd-*
```

Expected: Directories exist with GSD's standard files (workflows, templates, references, commands, agents).

- [ ] **Step 3: Commit GSD install state**

No git commit needed. GSD installs to `~/.claude/` which is outside the plugins repo.

---

## Task 2: Deploy Safe Zone Files (Agents + Scripts + Commands)

These files are direct copies from the forge and improve plugins. They survive GSD updates because they don't use the `gsd-` prefix.

**Files:**
- Copy: `plugins/forge/agents/*.md` → `~/.claude/agents/`
- Copy: `plugins/forge/hooks/scripts/quality-gate.sh` → `~/.claude/scripts/forge-quality-gate.sh`
- Copy: `plugins/improve/scripts/auto-approve-hook.sh` → `~/.claude/scripts/improve-auto-approve.sh`
- Copy: `plugins/improve/scripts/improve-autonomous.sh` → `~/.claude/scripts/improve-autonomous.sh`
- Copy: `plugins/improve/commands/improve.md` → `~/.claude/commands/improve.md`

- [ ] **Step 1: Create target directories**

```bash
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/scripts
mkdir -p ~/.claude/commands
```

- [ ] **Step 2: Copy forge agents**

```bash
REPO="c:/Users/Paul/dev/claude/plugins"
cp "$REPO/forge/agents/forge-backend.md" ~/.claude/agents/
cp "$REPO/forge/agents/forge-frontend.md" ~/.claude/agents/
cp "$REPO/forge/agents/forge-designer.md" ~/.claude/agents/
cp "$REPO/forge/agents/forge-researcher.md" ~/.claude/agents/
cp "$REPO/forge/agents/forge-reviewer.md" ~/.claude/agents/
cp "$REPO/forge/agents/forge-tester.md" ~/.claude/agents/
```

- [ ] **Step 3: Verify agents copied**

```bash
ls -la ~/.claude/agents/forge-*.md
```

Expected: 6 files (backend, frontend, designer, researcher, reviewer, tester).

- [ ] **Step 4: Copy scripts**

```bash
cp "$REPO/forge/hooks/scripts/quality-gate.sh" ~/.claude/scripts/forge-quality-gate.sh
cp "$REPO/improve/scripts/auto-approve-hook.sh" ~/.claude/scripts/improve-auto-approve.sh
cp "$REPO/improve/scripts/improve-autonomous.sh" ~/.claude/scripts/improve-autonomous.sh
chmod +x ~/.claude/scripts/*.sh
```

- [ ] **Step 5: Copy standalone improve command**

```bash
cp "$REPO/improve/commands/improve.md" ~/.claude/commands/improve.md
```

- [ ] **Step 6: Verify all safe zone files**

```bash
ls ~/.claude/agents/forge-*.md | wc -l    # expect 6
ls ~/.claude/scripts/*.sh | wc -l          # expect 3
ls ~/.claude/commands/improve.md            # expect exists
```

---

## Task 3: Create GSD Forge Commands (Patch Zone)

These are the GSD command entry points that route to workflows. They go in `~/.claude/commands/gsd/` which GSD backs up during updates.

**Source material:** Read `plugins/demiurge/MIGRATION-FORGE-IMPROVE-TO-GSD.md` sections "Module Definitions" and "Target File Structure". Read `plugins/forge/commands/forge.md` for the original routing logic.

**Files:**
- Create: `~/.claude/commands/gsd/forge.md`
- Create: `~/.claude/commands/gsd/forge-temper.md`
- Create: `~/.claude/commands/gsd/forge-autonomous.md`
- Create: `~/.claude/commands/gsd/improve-phase.md`

- [ ] **Step 1: Write forge.md GSD command**

Read `plugins/forge/commands/forge.md` for the routing logic. Create `~/.claude/commands/gsd/forge.md` with this structure:

```markdown
---
name: forge
description: Start or resume the Forge development pipeline within GSD. Guides from empty folder to production through IGNITE → SHAPE → TEMPER → DELIVER phases with 5-layer decomposition discipline.
argument-hint: "[new|status|reset]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion", "Task", "Skill"]
---

# /gsd:forge — Forge Pipeline within GSD

## Objective

Route to the correct Forge workflow based on argument and pipeline state in `forge.local.md`.

## Execution Context

@~/.claude/get-shit-done/workflows/forge-ignite.md
@~/.claude/get-shit-done/workflows/forge-temper.md
@~/.claude/get-shit-done/workflows/forge-deliver.md
@~/.claude/get-shit-done/workflows/forge-autonomous.md
@~/.claude/get-shit-done/workflows/forge-discipline.md

## Routing Logic

### If `$ARGUMENTS` contains "new" OR no `forge.local.md` exists:

1. Create `forge.local.md` with initial state:

    ```yaml
    ---
    project: (directory name)
    schema_version: 1
    phase: ignite
    step: speak
    ignite:
      speak_summary: ""
      approach_chosen: ""
      data_model_approved: false
      pure_logic_approved: false
      edge_logic_approved: false
      ui_approved: false
      integration_approved: false
      foundation_passed: false
    shape:
      gsd_project: ""
      phases_completed: 0
      health_checks: []
    temper:
      security_reviewed: false
      performance_reviewed: false
      diff_reviewed: false
      simplified: false
    deliver:
      pr_url: ""
      deployed: false
    agent_xp: []
    ---
    # Forge Pipeline State
    ```

2. Invoke the `forge-ignite` workflow via `Skill(skill="gsd:execute-phase")` with the forge-ignite workflow context.

### If `$ARGUMENTS` contains "status":

1. Read `forge.local.md`
2. If it does not exist: "No active Forge pipeline. Run `/gsd:forge new` to start."
3. Display dashboard:
   - Current phase and step
   - Gate checklist (checkmarks for completed, empty boxes for pending)
   - Last 5 agent_xp entries
   - Time in current phase (from timestamps if tracked)

### If `$ARGUMENTS` contains "reset":

1. Ask: "This will delete all Forge pipeline state. Are you sure?" via AskUserQuestion
2. If confirmed: delete `forge.local.md`, respond "Forge state cleared."
3. If denied: respond "Reset cancelled."

### If no argument and `forge.local.md` exists:

1. Read `phase` field from `forge.local.md` using:
   ```bash
   python3 -c "import re; content=open('forge.local.md').read(); m=re.search(r'^phase:\s*(\w+)', content, re.MULTILINE); print(m.group(1) if m else 'unknown')"
   ```
2. Route based on phase:
   - `ignite` → invoke forge-ignite workflow
   - `shape` → invoke `Skill(skill="gsd:execute-phase")` with forge-discipline context
   - `temper` → invoke forge-temper workflow
   - `deliver` → invoke forge-deliver workflow
   - `complete` → "Project complete. Run `/gsd:forge status` to review."

## Success Criteria

- `/gsd:forge new` creates forge.local.md and starts IGNITE
- `/gsd:forge status` shows readable pipeline dashboard
- `/gsd:forge reset` confirms before deleting state
- `/gsd:forge` (no args) resumes correct phase
```

- [ ] **Step 2: Write forge-temper.md GSD command**

Create `~/.claude/commands/gsd/forge-temper.md`:

```markdown
---
name: forge-temper
description: Run the Forge TEMPER hardening pass. Security review, performance audit, git diff review, code simplification. Works standalone (no forge.local.md required).
argument-hint: ""
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"]
---

# /gsd:forge-temper — Standalone Hardening Pass

## Objective

Run all four TEMPER hardening steps on the current codebase. Does not require an active Forge pipeline.

## Execution Context

@~/.claude/get-shit-done/workflows/forge-temper.md

## Process

Invoke the `forge-temper` workflow. It will:
1. Security review via forge-reviewer agent (critical/high block)
2. Performance audit via forge-reviewer agent
3. Git diff review with Point & Call confirmation
4. Code simplification via forge-reviewer agent
5. Visual verification (skipped if no web frontend)
6. Final test suite via forge-tester agent

If `forge.local.md` exists, update temper gate flags after each step.
If not, run all steps without state tracking.

## Success Criteria

- All four hardening areas reviewed
- Critical and high severity issues fixed
- Git diff reviewed with human confirmation
- Test suite passes after simplification
```

- [ ] **Step 3: Write forge-autonomous.md GSD command**

Create `~/.claude/commands/gsd/forge-autonomous.md`:

```markdown
---
name: forge-autonomous
description: Run the Forge-aware autonomous GSD phase execution loop. Applies decomposition discipline before each phase, runs 1-shot architecture tests between phases.
argument-hint: "[--from N]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion", "Task", "Skill"]
---

# /gsd:forge-autonomous — Forge-Disciplined Autonomous Loop

## Objective

Execute GSD phases autonomously with Forge's decomposition discipline applied before each phase. Runs 1-shot architecture tests between phases. Offers TEMPER and DELIVER after all phases complete.

## Execution Context

@~/.claude/get-shit-done/workflows/forge-autonomous.md
@~/.claude/get-shit-done/workflows/forge-discipline.md

## Process

1. Initialize: read `.planning/ROADMAP.md`, identify incomplete phases
2. If `--from N` provided, start from phase N
3. For each phase:
   a. Run forge-discipline wrapper (checks decomposition order, spawns specialist agents)
   b. Execute phase via `Skill(skill="gsd:execute-phase")`
   c. Run 1-shot architecture test (can the next feature be added in one prompt?)
   d. Stall detection: same phase failing twice → escalate
4. After all phases: offer TEMPER, then DELIVER

## Success Criteria

- All phases executed with discipline wrapper
- 1-shot tests pass between phases
- TEMPER offered at completion
- Stalled phases escalated rather than looping
```

- [ ] **Step 4: Write improve-phase.md GSD command**

Create `~/.claude/commands/gsd/improve-phase.md`:

```markdown
---
name: improve-phase
description: Run an improvement cycle as a GSD phase. Scoped category rotation (default security+quality, 30m). Produces VERIFICATION.md.
argument-hint: "[--duration 30m|1h|2h] [--category security,quality,testing,...]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "Skill"]
---

# /gsd:improve-phase — GSD-Integrated Improvement Cycle

## Objective

Run a time-gated improvement rotation scoped to specific categories. Produces VERIFICATION.md with results. Visual/UI and Feature Creep categories are not available in GSD mode.

## Execution Context

@~/.claude/get-shit-done/workflows/forge-improve-phase.md

## Arguments

- `--duration`: Time budget (default: 30m, supports: 30m, 1h, 2h)
- `--category`: Comma-separated categories (default: security,quality)
  - Available: security, quality, simplification, testing, performance, design
  - NOT available in GSD mode: visual/ui, feature-creep

## Process

1. Parse duration and categories from `$ARGUMENTS`
2. Enable autopilot (touch .autopilot)
3. Rotate through categories:
   - Security always runs first regardless of input order
   - Each cycle: Analyze → Fix → Verify → Commit
   - Hard time gate: if <5min remaining, skip to output
4. Generate VERIFICATION.md with YAML frontmatter (status: passed|gaps_found)
5. Disable autopilot (rm .autopilot)

## Success Criteria

- At least one improvement category completed
- All changes verified (test suite passes)
- VERIFICATION.md generated with accurate status
- Autopilot cleaned up even on early exit
```

- [ ] **Step 5: Verify all commands created**

```bash
ls -la ~/.claude/commands/gsd/forge*.md ~/.claude/commands/gsd/improve-phase.md
```

Expected: 4 files (forge.md, forge-temper.md, forge-autonomous.md, improve-phase.md).

---

## Task 4: Create GSD Forge Workflows (Patch Zone)

These encode the behavioral logic of each Forge phase in GSD workflow format. They are the most critical files.

**Source material:** Read the forge skills at `plugins/forge/skills/*/SKILL.md`. Transform each into GSD workflow format using XML sections: `<purpose>`, `<required_reading>`, `<process>`, `<success_criteria>`. The demiurge phase summaries at `plugins/demiurge/.planning/phases/02-workflows/` describe the exact transformation decisions.

**Files:**
- Create: `~/.claude/get-shit-done/workflows/forge-ignite.md`
- Create: `~/.claude/get-shit-done/workflows/forge-discipline.md`
- Create: `~/.claude/get-shit-done/workflows/forge-temper.md`
- Create: `~/.claude/get-shit-done/workflows/forge-deliver.md`
- Create: `~/.claude/get-shit-done/workflows/forge-autonomous.md`
- Create: `~/.claude/get-shit-done/workflows/forge-improve-phase.md`
- Create: `~/.claude/get-shit-done/templates/forge-decomposition.md`

- [ ] **Step 1: Write forge-ignite.md workflow**

Read `plugins/forge/skills/forge-ignite/SKILL.md` and `plugins/demiurge/.planning/phases/02-workflows/02-01-PLAN.md`.

Transform the IGNITE skill into a GSD workflow with these key adaptations:
- YAML frontmatter: `name: forge-ignite`, `type: workflow`
- XML sections: `<purpose>`, `<required_reading>`, `<process>`, `<success_criteria>`
- 5 steps: `speak`, `explore`, `shape_domain`, `first_1000_lines`, `gsd_handoff`
- All Point & Call gates use `AskUserQuestion` with exact commitment phrases:
  - SPEAK: "The system takes [X] as input and produces [Y] for [Z]."
  - EXPLORE: "I chose approach [A] because [reason]."
  - FIRST_1000_LINES: "I can add a feature in 1 shot. The foundation is solid."
- All 5 decomposition layer gates with `AskUserQuestion` approval
- Layer 4 (UI) explicitly skippable for API/CLI projects
- forge.local.md state updates use `python3 -c` regex replacement pattern:
  ```bash
  python3 -c "import re; f=open('forge.local.md'); c=f.read(); f.close(); c=re.sub(r'^(step:\s*).*$', r'\1explore', c, flags=re.MULTILINE); open('forge.local.md','w').write(c)"
  ```
- Agent spawning: `Task(agent="forge-researcher", prompt="...")` for codebase exploration
- Phase transition: `Skill(skill="gsd:new-project")` at completion (hands control to GSD)
- forge-tester spawned for TDD in FIRST_1000_LINES step

Write to `~/.claude/get-shit-done/workflows/forge-ignite.md`.

- [ ] **Step 2: Run verification on forge-ignite.md**

```bash
grep -c "AskUserQuestion" ~/.claude/get-shit-done/workflows/forge-ignite.md
# Expected: >= 8 (3 Point & Call + 5 decomposition layers)
grep "gsd:new-project" ~/.claude/get-shit-done/workflows/forge-ignite.md
# Expected: at least 1 match
grep "forge-researcher" ~/.claude/get-shit-done/workflows/forge-ignite.md
# Expected: at least 1 match
```

- [ ] **Step 3: Write forge-discipline.md workflow**

Read `plugins/forge/skills/forge-shape/SKILL.md` and `plugins/demiurge/.planning/phases/02-workflows/02-02-PLAN.md`.

This is a decomposition discipline WRAPPER invoked before each `gsd:execute-phase`. Key content:

- 5 steps: `check_flag`, `identify_layers`, `enforce_ordering`, `spawn_agents`, `one_shot_test`
- Step 1: Read `forge_discipline` from `.planning/config.json`. If false, exit silently (no-op).
- Step 2: Analyze phase goal text to identify which decomposition layers are touched.
- Step 3: Enforce types-first ordering (advisory, not blocking).
- Step 4: Route to specialist agents based on layer:
  - Layers 1-3 → `Task(agent="forge-backend")`
  - Layer 4 → `Task(agent="forge-frontend")` + `Task(agent="forge-designer")`
  - Layer 5 → `Task(agent="forge-tester")`
- Step 5: 1-shot prompt test with per-dimension assessment table.
- Agent XP tracking: update `agent_xp` in `forge.local.md` after each agent invocation.

Write to `~/.claude/get-shit-done/workflows/forge-discipline.md`.

- [ ] **Step 4: Write forge-temper.md workflow**

Read `plugins/forge/skills/forge-temper/SKILL.md` and `plugins/demiurge/.planning/phases/02-workflows/02-03-PLAN.md`.

6 steps with forge-reviewer and forge-tester agent spawning:
1. Security review (forge-reviewer, critical/high blocking)
2. Performance audit (forge-reviewer)
3. Git diff review (mandatory Point & Call gate: "I have reviewed the critical logic in the diff and it is correct.")
4. Code simplification (forge-reviewer)
5. Visual verification (conditional: skip if no web frontend, check for agent-browser/Playwright)
6. Final test suite (forge-tester, blocks on failures)

Each step writes `temper.*` flags to `forge.local.md`. No phase gate on entry (fully standalone).

Write to `~/.claude/get-shit-done/workflows/forge-temper.md`.

- [ ] **Step 5: Write forge-deliver.md workflow**

Read `plugins/forge/skills/forge-deliver/SKILL.md` and `plugins/demiurge/.planning/phases/02-workflows/02-03-PLAN.md`.

5 steps:
1. Entry check: verify TEMPER complete, warn if missing, graceful degradation
2. Build PR content from forge.local.md (speak_summary, approach_chosen, layers_complete, agent_xp, temper findings)
3. Create PR with `gh pr create` (body includes: Summary, Architecture Decisions, Decomposition Layers, Security & Performance, Agent XP Log, Test Coverage)
4. Deployment checklist (auto-detect project type: web app/Python/general)
5. Agent XP review and completion (write `deliver_complete: true`)

Uses defaults like "Not tracked" for missing fields (never crashes).

Write to `~/.claude/get-shit-done/workflows/forge-deliver.md`.

- [ ] **Step 6: Write forge-autonomous.md workflow**

Read `plugins/demiurge/.planning/phases/02-workflows/02-04-PLAN.md`.

6 steps:
1. Initialize: read `.planning/ROADMAP.md`, identify incomplete phases
2. Discover phases: list phases by status
3. Execute phase: call forge-discipline, then `Skill(skill="gsd:execute-phase")`
4. Iterate: 1-shot test after each phase, advance to next
5. Lifecycle: `gsd:audit-milestone` → `gsd:complete-milestone` → `gsd:cleanup`
6. Handle blocker: stall detection (same phase failing twice → escalate)

Calls forge-discipline unconditionally (self-deactivates when flag false). Uses `Skill()` for GSD commands (never `Task()`). Offers TEMPER and DELIVER after GSD phases complete.

Write to `~/.claude/get-shit-done/workflows/forge-autonomous.md`.

- [ ] **Step 7: Write forge-improve-phase.md workflow**

Read `plugins/improve/commands/improve.md` and `plugins/demiurge/.planning/phases/05-improve-integration/05-01-PLAN.md`.

3 phases:
- Phase 0 (setup): Parse duration/categories, enable autopilot, initialize cycle tracking
- Phase 1 (rotation): Cycle through categories. Security always first. Each cycle: Analyze → Fix → Verify → Commit. Hard time gate: <5min remaining → force Phase 2.
- Phase 2 (output): Generate VERIFICATION.md with YAML frontmatter (status: passed|gaps_found), disable autopilot

Hard rejection of Visual/UI and Feature Creep categories with explicit error. In-memory cycle log only (no .improve-log.md in GSD mode). Available categories: security, quality, simplification, testing, performance, design.

Write to `~/.claude/get-shit-done/workflows/forge-improve-phase.md`.

- [ ] **Step 8: Write forge-decomposition.md template**

Create `~/.claude/get-shit-done/templates/forge-decomposition.md`:

```markdown
# 5-Layer Decomposition Template

## Layer 1: Data Model / Types
Define all core types, interfaces, and schemas.
- What entities exist?
- What are their relationships?
- What constraints apply?
- What are the valid states?

Target: 10-50 lines. If you have hundreds of lines of types, decompose further.

## Layer 2: Pure Logic / Function Signatures
Define function signatures with typed inputs and outputs.
- What operations transform the data?
- Which operations are pure (no side effects)?
- What are the error cases?

Rules: Pure functions preferred. IO at the edges only.

## Layer 3: Edge Logic / Boundaries
Define where the system touches the outside world.
- Database queries and mutations
- API endpoints (request/response contracts)
- File system operations
- External service calls

Rules: Minimize boundaries. Each boundary is a potential failure point.

## Layer 4: UI Components (if applicable)
Define the component tree and interaction patterns.
- What does the user see?
- What can the user do?
- How does state flow through the UI?

Rules: Skip this layer for API/CLI/library projects.

## Layer 5: Integration / Acceptance
Define end-to-end workflows and acceptance criteria.
- What is the complete user journey?
- How do the layers connect?
- What are the acceptance criteria (from the user's perspective)?

## Decomposition Order

Always work top-down: Layer 1 → 2 → 3 → 4 → 5.
Problems in Layer 1 cascade to everything below.
Get each layer reviewed before proceeding to the next.
```

- [ ] **Step 9: Verify all workflows and template created**

```bash
ls ~/.claude/get-shit-done/workflows/forge-*.md | wc -l  # expect 6
ls ~/.claude/get-shit-done/templates/forge-*.md           # expect 1
```

---

## Task 5: Register Quality Gate Hook

The forge quality gate warns (but does not block) when pushing/PRing before TEMPER phase.

**Files:**
- Modify: `~/.claude/settings.json`

- [ ] **Step 1: Read current settings.json**

```bash
cat ~/.claude/settings.json
```

Identify where to add the `hooks` key.

- [ ] **Step 2: Add PreToolUse hook for forge quality gate**

Add to `~/.claude/settings.json` (merge with existing content, do not overwrite):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/scripts/forge-quality-gate.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

Use the Edit tool to add this key. Do NOT overwrite the entire file.

- [ ] **Step 3: Verify hook registered**

Read `~/.claude/settings.json` and confirm the `hooks.PreToolUse` array contains the quality gate entry.

---

## Task 6: Validate GSD + Forge Integration

Before proceeding to KG setup, verify the Forge integration works end-to-end.

- [ ] **Step 1: Test /gsd:forge status (no pipeline)**

Run `/gsd:forge status` and verify it shows "No active Forge pipeline" message.

- [ ] **Step 2: Test update survival**

```bash
# Simulate what GSD update does: list patch zone files
ls ~/.claude/commands/gsd/forge*.md
ls ~/.claude/commands/gsd/improve-phase.md
ls ~/.claude/get-shit-done/workflows/forge-*.md
ls ~/.claude/get-shit-done/templates/forge-*.md
```

Verify all files present.

- [ ] **Step 3: Test safe zone independence**

```bash
# These should exist independently of GSD
ls ~/.claude/agents/forge-*.md
ls ~/.claude/commands/improve.md
ls ~/.claude/scripts/*.sh
```

Verify all safe zone files present.

- [ ] **Step 4: Commit integration validation**

No git commit needed. Integration validated.

---

## Task 7: Set Up KG Infrastructure

Stand up the Knowledge Graph central hub at `~/.kg/` with Neo4j Docker, Python venv, Graphiti, and MCP server.

**Files:**
- Create: `~/.kg/.env`
- Create: `~/.kg/docker-compose.yml`
- Create: `~/.kg/registry.yaml`
- Create: `~/.kg/mcp-server.py`
- Create: `~/.kg/venv/` (Python virtual environment)

**Prerequisites:** Docker Desktop must be running. Python 3.10+ must be available. OpenAI API key required.

- [ ] **Step 1: Create ~/.kg directory and .env**

```bash
mkdir -p ~/.kg
```

Create `~/.kg/.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=scribe-kg-local
OPENAI_API_KEY=sk-PLACEHOLDER
SEMAPHORE_LIMIT=20
LLM_TPM_LIMIT=150000
EMBEDDING_DIM=1536
```

**IMPORTANT:** The executing agent must ask the user for their actual OpenAI API key via AskUserQuestion before writing this file. Do not use the placeholder.

- [ ] **Step 2: Write docker-compose.yml**

Create `~/.kg/docker-compose.yml`:

```yaml
version: "3.8"
services:
  neo4j:
    image: neo4j:5-community
    container_name: kg-neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/scribe-kg-local
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_dbms_security_procedures_unrestricted: "apoc.*"
    volumes:
      - kg-data:/data
      - kg-logs:/logs

volumes:
  kg-data:
  kg-logs:
```

- [ ] **Step 3: Start Neo4j**

```bash
cd ~/.kg && docker compose up -d
```

Expected: Neo4j container starts. Verify:

```bash
docker ps | grep kg-neo4j
```

Wait for Neo4j to be ready (may take 10-20 seconds on first run):

```bash
# Check Neo4j is accepting connections
curl -s http://localhost:7474 || echo "Neo4j not ready yet"
```

- [ ] **Step 4: Create Python virtual environment and install dependencies**

```bash
cd ~/.kg
python -m venv venv
~/.kg/venv/Scripts/pip install graphiti-core mcp pyyaml python-dotenv neo4j
```

Note: On Windows, the venv activate script is at `venv/Scripts/activate`, and pip is at `venv/Scripts/pip`.

- [ ] **Step 5: Write registry.yaml**

Create `~/.kg/registry.yaml`:

```yaml
# Knowledge Graph Group Registry
# Each group_id maps to a knowledge domain
# Projects reference groups in their kg.local.yaml

groups: {}

# Example:
# groups:
#   worm-canon:
#     description: "Worm web serial canon: characters, events, powers, locations"
#     created: "2026-04-10"
#     sources: ["wiki scrape", "manual entry"]
#   library:
#     description: "Research library: books ingested via /library pipeline"
#     created: "2026-04-10"
#     sources: ["libgen downloads"]
```

- [ ] **Step 6: Write MCP server**

Read `plugins/kg/scripts/batch-ingest.py` for the Graphiti integration patterns. Read `plugins/kg/README.md` for the MCP tool specifications.

Create `~/.kg/mcp-server.py` implementing three MCP tools:

1. **`kg_search(query: str, scope: str = "all", limit: int = 10)`** → Search Graphiti for entities and relations matching the query. If a `kg.local.yaml` exists in the working directory, filter by scope's group list.

2. **`kg_add_episode(content: str, group: str, source: str = "manual")`** → Add a knowledge episode to Graphiti. Validate group against `~/.kg/registry.yaml`. Extract entities and relations from content using Graphiti's `add_episode` method.

3. **`kg_status()`** → Return registry contents, project config (from `kg.local.yaml` if present), and Neo4j stats (node count, edge count).

The MCP server should:
- Use `mcp` Python SDK (FastMCP pattern)
- Load credentials from `~/.kg/.env` via python-dotenv
- Initialize Graphiti client on startup
- Handle Neo4j unavailability gracefully (return error messages, don't crash)
- Log to stderr for debugging

- [ ] **Step 7: Verify MCP server starts**

```bash
~/.kg/venv/Scripts/python ~/.kg/mcp-server.py --help 2>&1 || echo "Check MCP server for errors"
```

- [ ] **Step 8: Register MCP server with Claude Code**

```bash
claude mcp add kg -- ~/.kg/venv/Scripts/python ~/.kg/mcp-server.py
```

Verify:

```bash
claude mcp list | grep kg
```

- [ ] **Step 9: Test KG tools**

Run `/kg status` to verify the MCP tools are accessible and Neo4j responds.

---

## Task 8: Uninstall Deprecated Plugins

Remove the standalone forge and improve plugins that are now superseded by the GSD integration.

- [ ] **Step 1: Check currently installed plugins**

```bash
claude plugin list | grep -E "forge|improve"
```

Expected: Neither should be installed (they were already uninstalled based on our investigation). If either IS installed:

```bash
claude plugin uninstall "forge@pjschulz-plugins"
claude plugin uninstall "improve@pjschulz-plugins"
```

- [ ] **Step 2: Update forge/DEPRECATED.md to ARCHIVED.md**

Read `plugins/forge/DEPRECATED.md`. Replace it with `plugins/forge/ARCHIVED.md`:

```markdown
# Forge — ARCHIVED

**This plugin has been archived.** Its capabilities now live as GSD extensions.

## Where Things Went

| Original | New Location |
|----------|-------------|
| /forge command | /gsd:forge |
| forge-* agents | ~/.claude/agents/forge-*.md (safe zone) |
| forge-ignite skill | ~/.claude/get-shit-done/workflows/forge-ignite.md |
| forge-shape skill | ~/.claude/get-shit-done/workflows/forge-discipline.md |
| forge-temper skill | ~/.claude/get-shit-done/workflows/forge-temper.md |
| forge-deliver skill | ~/.claude/get-shit-done/workflows/forge-deliver.md |
| quality-gate hook | ~/.claude/scripts/forge-quality-gate.sh |

## This Directory

Kept for reference. Not published to the marketplace. Not installable.
```

Delete `plugins/forge/DEPRECATED.md` after creating `ARCHIVED.md`.

- [ ] **Step 3: Update improve/DEPRECATED.md to ARCHIVED.md**

```markdown
# Improve — ARCHIVED

**This plugin has been archived.** Its capabilities are available as:

| Capability | New Location |
|-----------|-------------|
| /improve (standalone) | ~/.claude/commands/improve.md (safe zone) |
| /gsd:improve-phase | ~/.claude/commands/gsd/improve-phase.md |
| auto-approve hook | ~/.claude/scripts/improve-auto-approve.sh |
| autonomous runner | ~/.claude/scripts/improve-autonomous.sh |

## This Directory

Kept for reference. Not published to the marketplace. Not installable.
```

Delete `plugins/improve/DEPRECATED.md` after creating `ARCHIVED.md`.

- [ ] **Step 4: Commit plugin deprecation changes**

```bash
cd c:/Users/Paul/dev/claude/plugins
git add forge/ARCHIVED.md improve/ARCHIVED.md
git rm forge/DEPRECATED.md improve/DEPRECATED.md
git commit -m "chore: archive forge and improve plugins (migrated to GSD extensions)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Clean Up Repo

Remove stale artifacts that no longer serve a purpose.

**Files:**
- Delete: `plugins/demiurge/` (migration plan executed, no longer needed)
- Modify: `plugins/.claude-plugin/marketplace.json` (remove forge/improve/demiurge entries)
- Delete: `plugins/.planning/` (stale GSD project state from prior sessions)

- [ ] **Step 1: Remove demiurge directory**

The demiurge directory was a planning space for this migration. Now that the migration is executed, it's no longer needed. Its content has been deployed to `~/.claude/`.

```bash
cd c:/Users/Paul/dev/claude/plugins
git rm -r demiurge/
```

- [ ] **Step 2: Remove stale .planning directory**

The root `.planning/` directory contains GSD project state from prior sessions on the VPS. It's stale and doesn't belong in the marketplace repo.

```bash
git rm -r .planning/
```

- [ ] **Step 3: Update marketplace.json**

Read `plugins/.claude-plugin/marketplace.json`. Remove entries for `forge`, `improve`, and `demiurge`. Keep entries for: `autopilot`, `kg`, `library`, `scribe`, `union-writer`, `jarvis`, `jarvis-budget`, `jarvis-calendar`, `jarvis-contacts`, `jarvis-email`, `jarvis-files`.

Use the Edit tool to remove the three deprecated entries.

- [ ] **Step 4: Remove stale run-growth-now.mjs**

This is a growth loop runner that belongs in the jarvis project, not the marketplace root.

```bash
git rm run-growth-now.mjs
```

- [ ] **Step 5: Commit cleanup**

```bash
cd c:/Users/Paul/dev/claude/plugins
git add -A
git commit -m "chore: clean up stale artifacts (demiurge, .planning, growth runner)

Remove demiurge planning directory (migration executed).
Remove root .planning/ (stale GSD state from VPS).
Remove run-growth-now.mjs (belongs in jarvis project).
Update marketplace.json to reflect active plugins only.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Update References

Update all documentation to reflect the new consolidated state.

**Files:**
- Modify: `~/.claude/CLAUDE.md` (plugin inventory table)
- Modify: `plugins/README.md` (installation guide)

- [ ] **Step 1: Update CLAUDE.md plugin inventory**

Read `~/.claude/CLAUDE.md`. Find the "Plugin inventory (pjschulz3004/claude-plugins)" table. Replace it with:

```markdown
### Plugin inventory (pjschulz3004/claude-plugins)
| Plugin | Purpose |
|--------|---------|
| autopilot | Project-scoped auto-approval via .autopilot marker |
| kg | Universal Knowledge Graph (Graphiti + Neo4j) |
| library | Research library pipeline (LibGen → KG ingest) |
| scribe | Collaborative creative writing studio |
| union-writer | Union (Worm) writing output style |
| jarvis | Unified assistant orchestrator |
| jarvis-budget | YNAB budget MCP server |
| jarvis-calendar | CalDAV calendar MCP server |
| jarvis-contacts | CardDAV contacts MCP server |
| jarvis-email | IMAP email MCP server |
| jarvis-files | File management MCP server |

### GSD Extensions (installed to ~/.claude/, not marketplace plugins)
| Extension | Purpose |
|-----------|---------|
| forge-* agents | 6 specialist agents (backend, frontend, designer, researcher, reviewer, tester) |
| /gsd:forge | Development pipeline with 5-layer decomposition discipline |
| /gsd:forge-temper | Standalone security/performance hardening pass |
| /gsd:forge-autonomous | Forge-disciplined autonomous GSD execution |
| /gsd:improve-phase | Time-gated improvement cycle as GSD phase |
| /improve | Standalone autonomous improvement loop |
```

- [ ] **Step 2: Update README.md**

Read `plugins/README.md`. Update the plugin listing and installation instructions to:
- Remove forge and improve from the installable plugins list
- Add a section about GSD extensions (not installed via marketplace)
- Note that forge and improve are archived (kept for reference)
- Document KG infrastructure requirements

- [ ] **Step 3: Commit reference updates**

```bash
cd c:/Users/Paul/dev/claude/plugins
git add README.md
git commit -m "docs: update README and references for consolidated plugin ecosystem

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

Note: CLAUDE.md is outside the repo, no git commit needed for it.

---

## Task 11: Push to GitHub

Push all changes as the single source of truth.

- [ ] **Step 1: Review all commits**

```bash
cd c:/Users/Paul/dev/claude/plugins
git log --oneline -10
```

Verify the cleanup and archive commits look correct.

- [ ] **Step 2: Check for any remaining unstaged changes**

```bash
git status
```

Expected: clean working tree.

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```

- [ ] **Step 4: Verify GitHub state**

```bash
gh repo view pjschulz3004/claude-plugins --web
```

Or:

```bash
git log --oneline -5
```

Confirm all commits are on GitHub.

---

## Task 12: Update Marketplace Cache

After pushing to GitHub, update the local marketplace cache so installed plugins reflect the cleaned-up state.

- [ ] **Step 1: Update marketplace**

```bash
claude plugin marketplace update pjschulz-plugins
```

- [ ] **Step 2: Verify marketplace state**

```bash
claude plugin list | grep pjschulz
```

Expected: Shows the 11 active plugins (autopilot, kg, library, scribe, union-writer, jarvis, jarvis-budget, jarvis-calendar, jarvis-contacts, jarvis-email, jarvis-files). No forge, improve, or demiurge.

---

## Post-Plan: Future Work (Not in this plan)

These items are identified but deferred:

1. **VPS Synchronization:** Deploy the same GSD+Forge integration to the VPS (`abyss`). SSH in, install GSD, copy safe/patch zone files.

2. **KG Group Registration:** Create actual groups in registry.yaml for existing projects (worm-canon, library, theo-personal, etc.) and run `/kg setup` in each project.

3. **jarvis-kg Coexistence:** The jarvis-daemon's KG bridge uses raw neo4j-driver (TypeScript) while the kg plugin uses Graphiti (Python). Both should work against the same Neo4j instance, but entity schemas may diverge. Consider migrating jarvis-kg to use the MCP server.

4. **GSD Profile and Config:** Run `/gsd:profile-user` and configure `.planning/config.json` with `forge_discipline: true` in projects where you want the decomposition wrapper active.

5. **Hook Testing:** Verify the quality gate hook doesn't conflict with GSD's own hooks. Test hook ordering.

6. **Close GitHub Issues:** Review the 9 open Jarvis growth issues and close any that have been completed.
