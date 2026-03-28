# Forge — DEPRECATED

**This plugin has been superseded by [Demiurge](../demiurge/).**

Demiurge integrates Forge's development discipline (5-layer decomposition, Point & Call gates, specialist agents, architecture validation) directly into GSD as native commands and workflows.

## Migration

1. **Uninstall Forge:**
   ```bash
   claude plugin uninstall "forge@pjschulz-plugins"
   ```

2. **Install Demiurge files** (copy to GSD directories):
   - Agents: `~/.claude/agents/forge-*.md` (6 specialist agents)
   - Workflows: `~/.claude/get-shit-done/workflows/forge-*.md` (5 workflow files)
   - Commands: `~/.claude/commands/gsd/forge*.md` (3 command files)
   - Template: `~/.claude/get-shit-done/templates/forge-decomposition.md`
   - Scripts: `~/.claude/scripts/forge-quality-gate.sh`

3. **Use new commands:**

   | Old Command | New Command |
   |-------------|-------------|
   | `/forge` | `/gsd:forge` |
   | `/forge new` | `/gsd:forge new` |
   | `/forge status` | `/gsd:forge status` |
   | (manual hardening) | `/gsd:forge-temper` |
   | (manual autonomous) | `/gsd:forge-autonomous` |

## What Changed

- Forge no longer maintains its own state management — uses GSD's `.planning/` directory
- Project scaffolding delegates to `gsd:new-project` after IGNITE phase
- Phase execution uses GSD's native `execute-phase` with a discipline wrapper
- All Forge agents survive GSD updates (safe zone at `~/.claude/agents/`)
- Workflow files restored after GSD updates via `/gsd:reapply-patches`
