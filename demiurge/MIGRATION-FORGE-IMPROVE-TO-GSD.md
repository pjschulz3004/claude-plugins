# Migration Plan: Consolidating Forge + Improve into GSD-Compatible Modules

**Author:** Daimon (for Paul)
**Date:** 2026-03-27
**Status:** Design Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Inventory](#2-system-inventory)
3. [Overlap Analysis](#3-overlap-analysis)
4. [Migration Architecture](#4-migration-architecture)
5. [Module Definitions](#5-module-definitions)
6. [Target File Structure](#6-target-file-structure)
7. [Installation Instructions](#7-installation-instructions)
8. [Update Survival](#8-update-survival)
9. [Deprecated Cross-References](#9-deprecated-cross-references)
10. [Risks and Open Questions](#10-risks-and-open-questions)

---

## 1. Executive Summary

**Goal:** Consolidate Forge (project scaffolding pipeline) and Improve (autonomous codebase improvement engine) into GSD-compatible modules that:
- Hook into GSD's extension points (commands, workflows, agents, templates)
- Survive GSD's update cycle via the `gsd-local-patches/` backup-and-merge system
- Preserve Forge's 4-phase pipeline discipline and specialist agents
- Preserve Improve's autonomous rotation loop, autopilot mode, and SNARC integration
- Eliminate redundancy where GSD already covers functionality natively

**Key Insight:** GSD's customization layer is file-based. Custom commands go in `~/.claude/commands/gsd/`, custom workflows in `~/.claude/get-shit-done/workflows/`, custom agents in `~/.claude/agents/`, and custom templates in `~/.claude/get-shit-done/templates/`. Files NOT prefixed with `gsd-` in agents, and NOT inside `commands/gsd/` or `get-shit-done/`, are preserved across updates automatically. Files inside those directories are backed up to `gsd-local-patches/` and can be reapplied via `/gsd:reapply-patches`.

**Strategy:** Place custom modules in GSD's namespace where they integrate with GSD workflows, and outside the namespace where they're independent. Use the reapply-patches system for anything that modifies GSD core files.

---

## 2. System Inventory

### 2.1 GSD (v1.30.0) — Installed via npx

**Location:** `~/.npm/_npx/.../node_modules/get-shit-done-cc/`
**Installed to:** `~/.claude/commands/gsd/`, `~/.claude/get-shit-done/`, `~/.claude/agents/gsd-*`

| Component | Count | Purpose |
|-----------|-------|---------|
| Commands (`commands/gsd/`) | 57 | Slash commands (skills) |
| Workflows (`get-shit-done/workflows/`) | 50+ | Detailed workflow logic |
| Agents (`agents/gsd-*`) | 18 | Specialized subagents |
| Templates (`get-shit-done/templates/`) | 22+ | Markdown templates |
| References (`get-shit-done/references/`) | 14+ | Technical documentation |
| Core libraries (`get-shit-done/bin/lib/`) | 12+ | Node.js tooling (state, config, phase, roadmap) |
| Hooks (`get-shit-done/hooks/dist/`) | 5 | Session/runtime hooks |

**Key Capabilities:**
- Project initialization (`new-project`, `new-milestone`)
- Phase lifecycle (`discuss-phase` -> `plan-phase` -> `execute-phase`)
- Autonomous execution (`autonomous` with discuss -> plan -> execute per phase)
- Verification and auditing (`verify-work`, `audit-milestone`, `validate-phase`)
- State management (`.planning/` directory, STATE.md, ROADMAP.md)
- Git integration (outcome-based commits via `gsd-tools.cjs`)
- Model profiles and settings (`settings`, `set-profile`)
- Workstreams, workspaces, threads for parallel work
- Debugging (`debug` with persistent state)
- Update + patch reapplication system

### 2.2 Forge (v0.1.2) — Custom Plugin

**Location:** `~/dev/claude/plugins/forge/`

| Component | Files | Purpose |
|-----------|-------|---------|
| Command | `commands/forge.md` | Entry point, state routing |
| Skills | 4 (`forge-ignite`, `forge-shape`, `forge-temper`, `forge-deliver`) | 4-phase pipeline |
| Agents | 6 (`forge-researcher`, `forge-backend`, `forge-frontend`, `forge-designer`, `forge-reviewer`, `forge-tester`) | Specialist subagents |
| Hooks | 2 (SessionStart prompt, PreToolUse script) | Tip display, quality gate warning |
| References | 1 (`decomposition-prompt.md`) | 5-layer decomposition template |
| State | `forge.local.md` per project | Phase tracking, gate flags |

**Unique Capabilities (not in GSD):**
1. **Point & Call Discipline** — Forces articulation before solutioning (SPEAK step)
2. **5-Layer Decomposition** — Types -> Pure Logic -> Edge -> UI -> Integration
3. **1-Shot Prompt Test** — Architecture validation gate between phases
4. **Specialist Agent Routing** — Maps decomposition layers to specific agent roles
5. **Agent XP Log** — Tracks lessons learned across the pipeline
6. **Quality Gate Hook** — Warns before shipping if TEMPER incomplete
7. **Visual Verification** — agent-browser screenshot testing in TEMPER

**Capabilities Overlapping with GSD:**
1. Project scaffolding -> GSD `new-project` + `new-milestone`
2. Phase execution -> GSD `execute-phase`
3. Autonomous flow -> GSD `autonomous`
4. Code review -> GSD `verify-work` + verifier agent
5. Git commit management -> GSD `gsd-tools.cjs commit`
6. Research phase -> GSD `research-phase` + `gsd-phase-researcher`

### 2.3 Improve (v0.2.0) — Custom Plugin

**Location:** `~/dev/claude/plugins/improve/`

| Component | Files | Purpose |
|-----------|-------|---------|
| Command | `commands/improve.md` | Entry point, cycle orchestration |
| Scripts | 2 (`auto-approve-hook.sh`, `improve-autonomous.sh`) | Autopilot, headless execution |
| State | `.improve-log.md`, `.improve-research.md`, `.improve-features.md` per project | Session tracking |

**Unique Capabilities (not in GSD):**
1. **Timed Rotation Loop** — 8-category cycle with hard time gates
2. **Autopilot Mode** — `.autopilot` marker file for unattended permission grants
3. **SNARC Memory Integration** — Cross-session hot spot detection, error pattern analysis
4. **Research Phase** — Pre-cycle library/API best practices research via Context7
5. **Improvement Categories** — Security, Quality, Simplification, Testing, Performance, Design, UI, Feature Creep
6. **Feature Creep Mode** — `--creep` / `--creep-build` for feature proposals with GitHub issue integration
7. **Stall Detection** — Two identical/empty cycles triggers termination
8. **Visual/UI Auditing** — agent-browser for web project regression testing
9. **Cross-Session Research Queue** — `.improve-research.md` carries forward between runs
10. **Headless Runner Script** — `improve-autonomous.sh` for background execution

**Capabilities Overlapping with GSD:**
1. Autonomous execution -> GSD `autonomous`
2. Phase-by-phase flow -> GSD phase lifecycle
3. Git commit management -> GSD commit strategy
4. State tracking -> GSD `.planning/STATE.md`

---

## 3. Overlap Analysis

### 3.1 What GSD Already Covers

| Forge/Improve Feature | GSD Equivalent | Action |
|------------------------|----------------|--------|
| Forge: Project scaffolding | `gsd:new-project` + `gsd:new-milestone` | **Drop** — use GSD native |
| Forge: Phase execution | `gsd:execute-phase` + `gsd-executor` agent | **Drop** — use GSD native |
| Forge: Research before planning | `gsd:research-phase` + `gsd-phase-researcher` | **Drop** — use GSD native |
| Forge: Code review | `gsd:verify-work` + `gsd-verifier` | **Supplement** — Forge's reviewer has additional modes |
| Forge: Autonomous flow | `gsd:autonomous` | **Extend** — add Forge discipline layer |
| Forge: Git commits | `gsd-tools.cjs commit` | **Drop** — use GSD native |
| Improve: Autonomous execution | `gsd:autonomous` | **Different paradigm** — keep as separate module |
| Improve: State tracking | `.planning/STATE.md` | **Keep Improve's own** — different domain |

### 3.2 What's Unique and Must Migrate

**From Forge (6 items):**
1. Point & Call discipline gates
2. 5-layer decomposition model + template
3. 1-shot prompt test (architecture validation)
4. Specialist agent definitions (backend, frontend, designer, reviewer, tester)
5. Agent XP logging
6. Quality gate hook (pre-ship warning)

**From Improve (10 items):**
1. Timed rotation loop with hard time gates
2. Autopilot mode (`.autopilot` marker)
3. SNARC memory integration
4. 8-category improvement rotation
5. Feature Creep mode (`--creep`, `--creep-build`)
6. Stall detection
7. Research phase with Context7 and cross-session queue
8. Visual/UI auditing cycle
9. Headless runner script
10. Improvement artifacts (`.improve-log.md`, `.improve-research.md`, `.improve-features.md`)

---

## 4. Migration Architecture

### 4.1 Design Principle

GSD is the **orchestration layer** (project lifecycle, phases, state, git). Forge becomes a **discipline module** that wraps GSD's project init and phase execution with decomposition gates. Improve becomes a **standalone loop module** that operates independently of GSD's phase system (it improves existing code, not build new features).

```
                    ┌─────────────────────────────────────────┐
                    │              GSD Core (v1.30+)          │
                    │  new-project, plan-phase, execute-phase │
                    │  autonomous, verify-work, state mgmt    │
                    └───────────┬──────────────┬──────────────┘
                                │              │
                    ┌───────────▼──────┐  ┌────▼──────────────┐
                    │  Forge Module    │  │  Improve Module   │
                    │  (Discipline)    │  │  (Maintenance)    │
                    │                  │  │                   │
                    │  - Decomposition │  │  - Rotation loop  │
                    │  - Point & Call  │  │  - Autopilot      │
                    │  - 1-Shot Test   │  │  - SNARC memory   │
                    │  - Specialist    │  │  - Feature creep  │
                    │    agents        │  │  - Time gates     │
                    │  - Quality gate  │  │  - Research queue │
                    └──────────────────┘  └───────────────────┘
```

### 4.2 Extension Points Used

| GSD Extension Point | What Goes There | Survives Update? |
|---------------------|-----------------|------------------|
| `~/.claude/commands/gsd/` | Forge & Improve command files | Backed up + reapplied via patches |
| `~/.claude/get-shit-done/workflows/` | Forge workflow files | Backed up + reapplied via patches |
| `~/.claude/get-shit-done/templates/` | Forge decomposition template | Backed up + reapplied via patches |
| `~/.claude/agents/` (non-`gsd-` prefix) | Forge specialist agents | **Auto-preserved** (not wiped) |
| `~/.claude/commands/` (non-`gsd/` dir) | Improve standalone command | **Auto-preserved** (not wiped) |
| Project `.planning/config.json` | Forge/Improve settings | **Auto-preserved** (per-project) |

### 4.3 Survival Strategy

**Safe zone (never wiped by GSD updates):**
- `~/.claude/agents/forge-*.md` — agents without `gsd-` prefix are untouched
- `~/.claude/commands/improve.md` — commands outside `gsd/` directory are untouched
- `~/.claude/commands/forge.md` — commands outside `gsd/` directory are untouched
- Any scripts in `~/.claude/scripts/` — custom directory, untouched

**Patch zone (backed up + reapplied):**
- `~/.claude/commands/gsd/forge-*.md` — GSD-integrated Forge commands
- `~/.claude/get-shit-done/workflows/forge-*.md` — Forge workflow logic
- `~/.claude/get-shit-done/templates/forge-*.md` — Forge templates

**Decision:** Place Forge's GSD-integrated components in the patch zone (they hook into GSD workflows). Place Improve entirely in the safe zone (it's independent). Place Forge's agents in the safe zone (they don't modify GSD internals).

---

## 5. Module Definitions

### 5.1 Forge Module — GSD Discipline Layer

#### 5.1.1 Command: `/gsd:forge` (Entry Point)

**File:** `~/.claude/commands/gsd/forge.md`
**Zone:** Patch zone (reapplied after updates)

Replaces the current `/forge` command. Routes to Forge-specific workflows within GSD's framework.

```yaml
---
name: gsd:forge
description: Start or resume the Forge development pipeline (IGNITE -> SHAPE -> TEMPER -> DELIVER) with GSD orchestration
argument-hint: "[new|status|reset]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
  - WebSearch
  - WebFetch
---
```

**Behavior:**
- `gsd:forge new` -> Runs IGNITE phase (Point & Call, decomposition, foundation)
- `gsd:forge` (no args) -> Reads `forge.local.md`, routes to current phase
- `gsd:forge status` -> Shows pipeline dashboard
- `gsd:forge reset` -> Clears forge state

**Key integration:** After IGNITE completes, invokes `gsd:new-project` (native GSD) with Forge's decomposition artifacts as input. SHAPE phase wraps `gsd:autonomous` with decomposition discipline.

#### 5.1.2 Workflow: IGNITE

**File:** `~/.claude/get-shit-done/workflows/forge-ignite.md`
**Zone:** Patch zone

Contains the full IGNITE workflow: SPEAK -> EXPLORE -> SHAPE_DOMAIN -> FIRST_1000_LINES.

**No changes needed** from current `forge-ignite/SKILL.md` content except:
- Replace `Skill(skill="brainstorming")` with native invocation
- Replace `Skill(skill="tdd")` with native invocation
- At completion, invoke `gsd:new-project` instead of storing state independently

#### 5.1.3 Workflow: Forge Discipline Wrapper

**File:** `~/.claude/get-shit-done/workflows/forge-discipline.md`
**Zone:** Patch zone

This is the **key integration point**. Wraps GSD's `execute-phase` with Forge's decomposition discipline:

1. Before each GSD phase execution:
   - Identify which decomposition layers the phase touches (1-5)
   - Enforce task ordering: data model -> pure logic -> edge -> UI -> integration
   - Select specialist agents based on layer

2. After each GSD phase execution:
   - Run 1-Shot Prompt Test (architecture validation)
   - Log results to `forge.local.md` health_checks

3. Between phases:
   - Check architecture health via 1-shot test
   - If failing, spawn `forge-researcher` to analyze friction

**[NEEDS VERIFICATION]** Whether GSD's `autonomous.md` workflow can be extended via a wrapper workflow, or whether the autonomous workflow itself must be patched. The current autonomous workflow calls `Skill(skill="gsd:execute-phase")` directly. A Forge discipline wrapper would need to intercept this call or be invoked as a pre/post hook.

**Option A (Recommended):** Create a custom command `gsd:forge-autonomous` that reimplements the autonomous workflow loop but calls `forge-discipline` before/after each phase. This avoids patching GSD core.

**Option B:** Patch `autonomous.md` to check for a `forge_discipline: true` config flag and invoke the wrapper. This is cleaner but lives in the patch zone.

#### 5.1.4 Workflow: TEMPER

**File:** `~/.claude/get-shit-done/workflows/forge-temper.md`
**Zone:** Patch zone

Hardening workflow. Can be invoked as a standalone GSD command after all phases complete:

1. Security Review (spawn `forge-reviewer` with security mode)
2. Performance Audit (spawn `forge-reviewer` with performance mode)
3. Git Diff Review (mandatory, critical logic errors)
4. Code Simplification
5. Visual Verification (web projects)
6. Final Test Suite (spawn `forge-tester`)

**Integration:** Runs after `gsd:autonomous` completes, before `gsd:audit-milestone`. Could be wired into the autonomous lifecycle step.

#### 5.1.5 Workflow: DELIVER

**File:** `~/.claude/get-shit-done/workflows/forge-deliver.md`
**Zone:** Patch zone

Replaces or supplements `gsd:ship`:
- PR creation with Forge-specific documentation (decomposition layers, hardening findings)
- Deployment checklist
- Agent XP log review

#### 5.1.6 Template: Decomposition Prompt

**File:** `~/.claude/get-shit-done/templates/forge-decomposition.md`
**Zone:** Patch zone

The 5-layer decomposition template. Referenced by `forge-ignite` workflow during SHAPE_DOMAIN step.

#### 5.1.7 Specialist Agents (6 files)

**Files:** `~/.claude/agents/forge-*.md`
**Zone:** Safe zone (auto-preserved, no `gsd-` prefix)

| Agent | File | Role |
|-------|------|------|
| `forge-researcher` | `forge-researcher.md` | Codebase exploration, dependency research |
| `forge-backend` | `forge-backend.md` | Data models, APIs, business logic (Layers 1-3) |
| `forge-frontend` | `forge-frontend.md` | UI logic, state management (Layer 4) |
| `forge-designer` | `forge-designer.md` | Visual design, CSS, responsive (Layer 4) |
| `forge-reviewer` | `forge-reviewer.md` | Security, performance, diff review, simplification |
| `forge-tester` | `forge-tester.md` | Unit, integration, E2E tests per layer |

**No changes needed.** These agents are already self-contained prompt files.

#### 5.1.8 Hook: Quality Gate

**File:** `~/.claude/scripts/forge-quality-gate.sh`
**Zone:** Safe zone (custom scripts directory)

The PreToolUse hook that warns before `git push` / `gh pr create` if TEMPER phase is incomplete. Register in `settings.json` or `settings.local.json` hooks section.

**[NEEDS VERIFICATION]** Whether GSD's own hooks conflict with custom PreToolUse hooks. GSD has `gsd-prompt-guard.js` and `gsd-workflow-guard.js` — need to confirm they don't interfere.

### 5.2 Improve Module — Standalone Maintenance Loop

#### 5.2.1 Command: `/improve`

**File:** `~/.claude/commands/improve.md`
**Zone:** Safe zone (outside `gsd/` directory)

The complete Improve command. **No changes needed** — it already operates independently of GSD's phase system.

The `/improve` command stays as a standalone command because:
- It doesn't create GSD projects or phases
- It has its own time-based loop (not phase-based)
- It operates on existing codebases, not new projects
- Its artifacts (`.improve-*`) are separate from `.planning/`

#### 5.2.2 Scripts

**Files:**
- `~/.claude/scripts/improve-auto-approve.sh` — Autopilot hook
- `~/.claude/scripts/improve-autonomous.sh` — Headless runner

**Zone:** Safe zone

Register the auto-approve hook in `settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "bash ~/.claude/scripts/improve-auto-approve.sh"
      }
    ]
  }
}
```

#### 5.2.3 GSD Integration Point (Optional)

**File:** `~/.claude/commands/gsd/improve-phase.md`
**Zone:** Patch zone

An **optional** GSD command that runs one Improve cycle as a GSD phase. This would allow inserting an improvement pass into a GSD roadmap:

```
Phase 5: Feature X
Phase 5.1: Improvement pass (security + quality)  <- uses improve-phase
Phase 6: Feature Y
```

```yaml
---
name: gsd:improve-phase
description: Run an Improve cycle as a GSD phase (security + quality pass on recent work)
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch]
---
```

This would invoke the Improve rotation logic for a fixed set of categories (e.g., security + quality only) and produce GSD-compatible artifacts (VERIFICATION.md).

**[NEEDS VERIFICATION]** Whether GSD's verification system accepts custom VERIFICATION.md formats, or if there's a strict schema.

---

## 6. Target File Structure

```
~/.claude/
├── commands/
│   ├── forge.md                          # SAFE: Top-level /forge entry (optional, redirects to gsd:forge)
│   ├── improve.md                        # SAFE: Standalone /improve command
│   └── gsd/
│       ├── forge.md                      # PATCH: /gsd:forge entry point
│       ├── forge-temper.md               # PATCH: /gsd:forge-temper standalone hardening
│       ├── forge-deliver.md              # PATCH: /gsd:forge-deliver shipping
│       ├── improve-phase.md              # PATCH: /gsd:improve-phase (optional)
│       └── ... (57 GSD native commands)
│
├── get-shit-done/
│   ├── workflows/
│   │   ├── forge-ignite.md               # PATCH: IGNITE workflow
│   │   ├── forge-discipline.md           # PATCH: Decomposition discipline wrapper
│   │   ├── forge-temper.md               # PATCH: TEMPER hardening workflow
│   │   ├── forge-deliver.md              # PATCH: DELIVER shipping workflow
│   │   ├── forge-autonomous.md           # PATCH: Forge-aware autonomous loop (Option A)
│   │   └── ... (50+ GSD native workflows)
│   │
│   ├── templates/
│   │   ├── forge-decomposition.md        # PATCH: 5-layer decomposition prompt
│   │   └── ... (22+ GSD native templates)
│   │
│   └── references/
│       └── ... (14+ GSD native references)
│
├── agents/
│   ├── forge-researcher.md               # SAFE: Research specialist
│   ├── forge-backend.md                  # SAFE: Backend specialist (Layers 1-3)
│   ├── forge-frontend.md                 # SAFE: Frontend logic (Layer 4)
│   ├── forge-designer.md                 # SAFE: Visual design (Layer 4)
│   ├── forge-reviewer.md                 # SAFE: Code review & audit
│   ├── forge-tester.md                   # SAFE: Testing specialist
│   └── gsd-*.md                          # GSD native agents (18 files)
│
├── scripts/
│   ├── forge-quality-gate.sh             # SAFE: PreToolUse quality gate hook
│   ├── improve-auto-approve.sh           # SAFE: Autopilot hook
│   └── improve-autonomous.sh             # SAFE: Headless runner
│
└── gsd-local-patches/                    # AUTO: Created by gsd:update when patched files exist
    └── backup-meta.json
```

**Legend:**
- **SAFE** = Never touched by GSD updates
- **PATCH** = Backed up by `gsd:update`, reapplied via `gsd:reapply-patches`
- **AUTO** = Managed by GSD's update system

---

## 7. Installation Instructions

### 7.1 Prerequisites

```bash
# Ensure GSD is installed and current
gsd:update

# Verify GSD version (need 1.30.0+)
cat ~/.claude/get-shit-done/VERSION 2>/dev/null || echo "GSD not found"
```

### 7.2 Install Forge Module

```bash
# Step 1: Copy Forge agents to safe zone
cp ~/dev/claude/plugins/forge/agents/*.md ~/.claude/agents/

# Step 2: Copy Forge workflows to GSD workflow directory
cp ~/dev/claude/plugins/forge/skills/forge-ignite/SKILL.md \
   ~/.claude/get-shit-done/workflows/forge-ignite.md

# NOTE: forge-discipline.md, forge-autonomous.md need to be WRITTEN (new files)
# They don't exist in current Forge — they're the integration layer

cp ~/dev/claude/plugins/forge/skills/forge-temper/SKILL.md \
   ~/.claude/get-shit-done/workflows/forge-temper.md

cp ~/dev/claude/plugins/forge/skills/forge-deliver/SKILL.md \
   ~/.claude/get-shit-done/workflows/forge-deliver.md

# Step 3: Copy decomposition template
cp ~/dev/claude/plugins/forge/skills/forge-ignite/references/decomposition-prompt.md \
   ~/.claude/get-shit-done/templates/forge-decomposition.md

# Step 4: Create GSD command entry point
# This requires writing a new forge.md command that routes through GSD
# (see Module Definition 5.1.1 for spec)

# Step 5: Copy quality gate hook
mkdir -p ~/.claude/scripts
cp ~/dev/claude/plugins/forge/hooks/scripts/quality-gate.sh \
   ~/.claude/scripts/forge-quality-gate.sh
chmod +x ~/.claude/scripts/forge-quality-gate.sh

# Step 6: Register hook in settings.local.json
# Add PreToolUse hook for forge-quality-gate.sh
```

### 7.3 Install Improve Module

```bash
# Step 1: Copy Improve command to safe zone
cp ~/dev/claude/plugins/improve/commands/improve.md ~/.claude/commands/improve.md

# Step 2: Copy scripts to safe zone
cp ~/dev/claude/plugins/improve/scripts/auto-approve-hook.sh \
   ~/.claude/scripts/improve-auto-approve.sh
cp ~/dev/claude/plugins/improve/scripts/improve-autonomous.sh \
   ~/.claude/scripts/improve-autonomous.sh
chmod +x ~/.claude/scripts/improve-auto-approve.sh
chmod +x ~/.claude/scripts/improve-autonomous.sh

# Step 3: Register autopilot hook in settings.local.json
# Add PreToolUse hook for improve-auto-approve.sh
```

### 7.4 New Files to Write

These files don't exist in current Forge or Improve and must be authored:

| File | Purpose | Priority |
|------|---------|----------|
| `commands/gsd/forge.md` | GSD entry point for Forge pipeline | **High** |
| `workflows/forge-discipline.md` | Decomposition wrapper for GSD phases | **High** |
| `workflows/forge-autonomous.md` | Forge-aware autonomous loop | **Medium** |
| `commands/gsd/improve-phase.md` | Optional: Improve as GSD phase | **Low** |

### 7.5 Files to Modify

The existing Forge skill files need these adaptations when copied to GSD:

| File | Changes Needed |
|------|----------------|
| `forge-ignite.md` | Replace Skill() calls with GSD equivalents. At completion, invoke `gsd:new-project` |
| `forge-temper.md` | Make it a standalone GSD command (not dependent on forge.local.md phase) |
| `forge-deliver.md` | Integrate with `gsd:ship` or replace it |

---

## 8. Update Survival

### 8.1 What Happens on `gsd:update`

GSD's update process:
1. Wipes `~/.claude/commands/gsd/`, `~/.claude/get-shit-done/`, `~/.claude/agents/gsd-*`
2. Reinstalls from latest npm package
3. Backs up any files you modified to `~/.claude/gsd-local-patches/`
4. Prompts you to run `/gsd:reapply-patches`

### 8.2 Our Files After Update

| File | Location | After Update |
|------|----------|--------------|
| `agents/forge-*.md` | Safe zone | **Untouched** (no `gsd-` prefix) |
| `commands/improve.md` | Safe zone | **Untouched** (outside `gsd/`) |
| `commands/forge.md` | Safe zone | **Untouched** (outside `gsd/`) |
| `scripts/*.sh` | Safe zone | **Untouched** (custom directory) |
| `commands/gsd/forge.md` | Patch zone | **Wiped**, backed up to `gsd-local-patches/` |
| `commands/gsd/forge-temper.md` | Patch zone | **Wiped**, backed up to `gsd-local-patches/` |
| `commands/gsd/improve-phase.md` | Patch zone | **Wiped**, backed up to `gsd-local-patches/` |
| `workflows/forge-*.md` | Patch zone | **Wiped**, backed up to `gsd-local-patches/` |
| `templates/forge-decomposition.md` | Patch zone | **Wiped**, backed up to `gsd-local-patches/` |

### 8.3 Recovery After Update

```bash
# After running /gsd:update:
/gsd:reapply-patches

# This will:
# 1. Find gsd-local-patches/ directory
# 2. Show list of backed-up forge/improve files
# 3. Merge them back into the new GSD version
# 4. Report status (merged/skipped/conflict)
```

### 8.4 Automation Option

Create a post-update script that automatically copies safe-zone files and reapplies patches:

**File:** `~/.claude/scripts/gsd-post-update.sh`

```bash
#!/bin/bash
# Run after gsd:update to restore Forge + Improve modules

echo "Restoring Forge + Improve modules..."

# Safe zone files are already fine — verify they exist
for agent in forge-researcher forge-backend forge-frontend forge-designer forge-reviewer forge-tester; do
    if [ ! -f "$HOME/.claude/agents/${agent}.md" ]; then
        echo "WARNING: Missing agent: ${agent}.md"
    fi
done

# Reapply patched files
echo "Run /gsd:reapply-patches to restore GSD-integrated files."
```

---

## 9. Deprecated Cross-References

Once consolidated, these dependencies become unnecessary:

| Current Dependency | Reason for Removal |
|--------------------|--------------------|
| Forge plugin's `plugin.json` | No longer a standalone plugin |
| Forge's `hooks/hooks.json` | Hooks registered in `settings.local.json` instead |
| Forge's `forge.local.md` state file | **Kept** — still used for Forge-specific state |
| Improve plugin's `plugin.json` | No longer a standalone plugin |
| Improve's hook registration in plugin | Hooks registered in `settings.local.json` instead |
| Forge -> `ralph-loop` skill dependency | Keep if ralph-loop is installed, degrade gracefully |
| Forge -> `brainstorming` skill dependency | Keep, invoke via Skill() |
| Forge -> `tdd` skill dependency | Keep, invoke via Skill() |
| Forge -> `finishing-a-development-branch` skill | Replaced by `gsd:ship` or `gsd:forge-deliver` |
| Forge -> `code-simplifier` agent | Keep if available, optional |
| Improve -> all security/quality skills (sharp-edges, insecure-defaults, etc.) | Keep — these are from other installed plugins |
| Improve -> SNARC MCP tools | Keep — external MCP server |
| Improve -> Context7 MCP tools | Keep — external MCP server |
| Improve -> KG MCP tools | Keep — external MCP server |

**Plugins that can be uninstalled after migration:**
- `forge` plugin (from `pjschulz-plugins` marketplace)
- `improve` plugin (from `pjschulz-plugins` marketplace)

**Plugins that must remain:**
- All security plugins (trailofbits)
- All quality plugins (impeccable, kaizen, reflexion)
- SNARC, KG, Context7 (MCP servers)
- superpowers (brainstorming, TDD, debugging)
- ralph-loop (quality iteration)

---

## 10. Risks and Open Questions

### 10.1 Items Needing Verification

| Item | Question | Impact |
|------|----------|--------|
| **[NEEDS VERIFICATION]** Autonomous wrapper | Can a custom `gsd:forge-autonomous` coexist with native `gsd:autonomous`? | High — determines Option A vs B |
| **[NEEDS VERIFICATION]** Hook conflicts | Do GSD's `gsd-prompt-guard.js` and `gsd-workflow-guard.js` conflict with custom PreToolUse hooks? | Medium — may need hook ordering |
| **[NEEDS VERIFICATION]** VERIFICATION.md schema | Does GSD's verifier expect a specific format, or will custom verification files work? | Medium — affects `improve-phase` integration |
| **[NEEDS VERIFICATION]** Patch detection | Does GSD's update detect NEW files added to `commands/gsd/` (not just modified existing ones)? | High — determines if forge commands are backed up |
| **[NEEDS VERIFICATION]** Agent discovery | Are agents in `~/.claude/agents/` auto-discovered by all GSD workflows, or must they be referenced explicitly? | Low — agents are invoked by name in prompts |
| **[NEEDS VERIFICATION]** Workflow references | Can GSD commands reference custom workflows via `@~/.claude/get-shit-done/workflows/forge-*.md`? | High — core integration mechanism |

### 10.2 Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| GSD update wipes forge commands before backup | Low | Test with dry-run first; keep source in `~/dev/claude/plugins/` |
| Forge discipline wrapper adds too much overhead per phase | Medium | Make it configurable via `.planning/config.json` flag |
| Improve's autopilot hook conflicts with GSD's hooks | Medium | Test hook ordering; use separate event types if needed |
| GSD major version changes break workflow format | Low | Pin GSD version; test before updating |
| Two autonomous modes confuse users | Low | Clear documentation; `/improve` = maintenance, `/gsd:forge` or `/gsd:autonomous` = building |

### 10.3 Recommended Execution Order

1. **Phase 1:** Copy agents and scripts to safe zone (zero risk, immediate value)
2. **Phase 2:** Write `gsd:forge` command and `forge-ignite` workflow (core integration)
3. **Phase 3:** Write `forge-discipline.md` wrapper (the hard part — verify GSD extension points)
4. **Phase 4:** Copy Improve to safe zone (zero risk)
5. **Phase 5:** Write `forge-autonomous.md` (Option A) or patch `autonomous.md` (Option B)
6. **Phase 6:** Test update cycle (run `gsd:update` + `gsd:reapply-patches`)
7. **Phase 7:** Uninstall standalone Forge and Improve plugins
8. **Phase 8:** Write `improve-phase.md` (optional GSD integration)

### 10.4 Recommendation

**Start with Phase 1 + 4** (safe zone copies). This gives you immediate access to all agents and the Improve command without any GSD integration risk. The standalone plugins can remain installed alongside the copies until full integration is tested.

Then tackle Phase 2-3 as a GSD project itself (use `/gsd:new-project` to build the integration layer).

---

## Appendix A: GSD Configuration Reference

### `.planning/config.json` — Add Forge Settings

```json
{
  "forge": {
    "discipline_enabled": true,
    "one_shot_test": true,
    "specialist_agents": true,
    "quality_gate": true,
    "xp_logging": true,
    "decomposition_layers": [1, 2, 3, 4, 5]
  },
  "improve": {
    "default_duration": "1h",
    "categories": ["security", "quality", "simplification", "testing", "performance", "design", "ui", "creep"],
    "snarc_enabled": true,
    "research_phase": true,
    "stall_threshold": 2
  }
}
```

**[NEEDS VERIFICATION]** Whether GSD's `config.json` accepts arbitrary keys or validates against a schema.

### Appendix B: Command Cheat Sheet (Post-Migration)

| Command | Purpose | Module |
|---------|---------|--------|
| `/gsd:forge new` | Start new project with Forge discipline | Forge |
| `/gsd:forge` | Resume Forge pipeline | Forge |
| `/gsd:forge-temper` | Run hardening pass (standalone) | Forge |
| `/gsd:forge-deliver` | Ship with Forge documentation | Forge |
| `/gsd:autonomous` | GSD native autonomous (no Forge discipline) | GSD |
| `/gsd:forge-autonomous` | Autonomous with Forge discipline wrapper | Forge |
| `/improve 2h` | Run 2-hour improvement loop | Improve |
| `/improve --creep` | Feature proposals only | Improve |
| `/improve --creep-build` | Propose + implement top 3 features | Improve |
| `/gsd:improve-phase` | Run improvement pass as GSD phase | Improve (optional) |
