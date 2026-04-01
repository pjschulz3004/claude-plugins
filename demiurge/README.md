# Demiurge — Forge + Improve as GSD Modules

Integration layer that brings Forge's development discipline and Improve's autonomous codebase improvement into GSD's project lifecycle. Not a standalone plugin — a set of GSD-compatible commands, workflows, and agents.

## Commands

### Forge Pipeline

| Command | Purpose |
|---------|---------|
| `/gsd:forge new` | Start new project with IGNITE phase (Point & Call, 5-layer decomposition) |
| `/gsd:forge` | Resume existing pipeline (reads `forge.local.md` state) |
| `/gsd:forge status` | Display pipeline dashboard (phase, gates, health checks) |
| `/gsd:forge-temper` | Standalone hardening pass (security, performance, diff review, simplification) |
| `/gsd:forge-autonomous` | Autonomous GSD phases with decomposition discipline per phase |
| `/gsd:forge-autonomous --from 3` | Resume autonomous from phase 3 |

### Improve Integration

| Command | Purpose |
|---------|---------|
| `/improve` | Standalone improvement loop (unchanged from original plugin) |
| `/improve 2h` | Run for 2 hours |
| `/improve --creep` | Feature proposals only |
| `/gsd:improve-phase` | Run improvement cycle as GSD phase (default: 30m, security+quality) |
| `/gsd:improve-phase --duration 1h --category security,testing` | Custom duration and categories |

### Available Categories for improve-phase

`security`, `quality`, `simplification`, `testing`, `performance`, `design`

(Visual/UI and Feature Creep are excluded from GSD phase mode — use standalone `/improve` for those)

## Configuration

### forge_discipline flag

Add to `.planning/config.json` to enable decomposition discipline wrapper:

```json
{
  "forge_discipline": true
}
```

When enabled, `/gsd:forge-autonomous` wraps each phase execution with:
- Decomposition layer identification (L1-L5)
- Types-first task ordering enforcement
- Specialist agent spawning (forge-backend, forge-frontend, forge-designer, forge-tester)
- 1-shot prompt test between phases

### forge.local.md

Pipeline state file created by `/gsd:forge new`. Tracks:
- Current phase and step
- Gate flags (data_model, pure_logic, edge_logic, ui approved)
- Health check results per decomposition layer
- Agent XP log

## File Locations

### Safe Zone (survives GSD updates automatically)

| File | Location |
|------|----------|
| Specialist agents (6) | `~/.claude/agents/forge-*.md` |
| Standalone improve | `~/.claude/commands/improve.md` |
| Quality gate hook | `~/.claude/scripts/forge-quality-gate.sh` |
| Autopilot hook | `~/.claude/scripts/improve-auto-approve.sh` |
| Autonomous runner | `~/.claude/scripts/improve-autonomous.sh` |

### Patch Zone (restored via `/gsd:reapply-patches` after GSD update)

| File | Location |
|------|----------|
| GSD commands (4) | `~/.claude/commands/gsd/forge*.md`, `improve-phase.md` |
| Workflows (6) | `~/.claude/get-shit-done/workflows/forge-*.md` |
| Decomposition template | `~/.claude/get-shit-done/templates/forge-decomposition.md` |

## After GSD Updates

```bash
/gsd:reapply-patches
```

This restores all 10 patch-zone files from the automatic backup at `~/.claude/gsd-local-patches/`.

## Migrating from Standalone Plugins

### From forge@pjschulz-plugins

```bash
claude plugin uninstall "forge@pjschulz-plugins"
```

| Old | New |
|-----|-----|
| `/forge` | `/gsd:forge` |
| `/forge new` | `/gsd:forge new` |
| `/forge status` | `/gsd:forge status` |

### From improve@pjschulz-plugins

```bash
claude plugin uninstall "improve@pjschulz-plugins"
```

| Old | New |
|-----|-----|
| `/improve` | `/improve` (unchanged) |
| (not available) | `/gsd:improve-phase` |
