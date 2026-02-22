---
name: forge
description: Start or resume the forge development pipeline. Guides from empty folder to production through IGNITE → SHAPE → TEMPER → DELIVER phases.
argument-hint: "[new|status|reset]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "AskUserQuestion", "Task", "TaskCreate", "TaskUpdate", "TaskList", "Skill", "WebSearch", "WebFetch", "EnterPlanMode"]
---

# Forge — Development Pipeline Orchestrator

Read the project's `forge.local.md` file to determine current pipeline state. If it does not exist, this is a new project.

## Routing Logic

**If argument is `new` OR no `forge.local.md` exists:**
1. Create `forge.local.md` with initial state (phase: IGNITE, step: SPEAK)
2. Invoke the `forge-ignite` skill to begin the foundation phase

**If argument is `status`:**
1. Read `forge.local.md`
2. Display a progress dashboard showing:
   - Current phase and step
   - Gates passed/remaining
   - Agent XP entries
   - Time in current phase

**If argument is `reset`:**
1. Ask for confirmation: "This will reset all forge state. Are you sure?"
2. If confirmed, delete `forge.local.md`
3. Display "Forge state cleared. Run /forge new to start fresh."

**If no argument and `forge.local.md` exists:**
1. Read current phase from `forge.local.md`
2. Resume the appropriate skill:
   - phase: IGNITE → invoke `forge-ignite` skill
   - phase: SHAPE → invoke `forge-shape` skill
   - phase: TEMPER → invoke `forge-temper` skill
   - phase: DELIVER → invoke `forge-deliver` skill
   - phase: COMPLETE → display "Project complete. Run /forge status to review."

## State File Format

The `forge.local.md` file uses YAML frontmatter for state tracking. When creating a new one:

```yaml
---
project: (directory name)
type: pending
phase: IGNITE
step: SPEAK
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
This file tracks the forge development pipeline state for this project.
Do not edit manually unless you know what you are doing.
```

## Important

- Always update `forge.local.md` after phase transitions
- Never skip phases — the gates exist for a reason
- If the user tries to jump ahead, explain why the current gate matters
