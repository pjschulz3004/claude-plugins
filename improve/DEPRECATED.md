# Improve — DEPRECATED

**This plugin has been superseded by [Demiurge](../demiurge/).**

Demiurge provides two ways to use Improve's capabilities:

1. **Standalone `/improve` command** — works exactly as before (safe zone copy)
2. **`/gsd:improve-phase`** — run improvement cycles as a GSD phase with VERIFICATION.md output

## Migration

1. **Uninstall Improve:**
   ```bash
   claude plugin uninstall "improve@pjschulz-plugins"
   ```

2. **Install Demiurge files** (copy to safe zone):
   - Command: `~/.claude/commands/improve.md` (standalone, identical to plugin version)
   - GSD Command: `~/.claude/commands/gsd/improve-phase.md` (GSD integration)
   - Workflow: `~/.claude/get-shit-done/workflows/forge-improve-phase.md`
   - Scripts: `~/.claude/scripts/improve-auto-approve.sh`, `~/.claude/scripts/improve-autonomous.sh`

3. **Use new commands:**

   | Old Command | New Command | Notes |
   |-------------|-------------|-------|
   | `/improve` | `/improve` | Unchanged (safe zone copy) |
   | `/improve 2h` | `/improve 2h` | Unchanged |
   | `/improve --creep` | `/improve --creep` | Unchanged |
   | (not available) | `/gsd:improve-phase` | New: run as GSD phase |
   | (not available) | `/gsd:improve-phase --category security` | New: scoped categories |

## What Changed

- The standalone `/improve` command is identical — just moved from plugin directory to `~/.claude/commands/`
- New `/gsd:improve-phase` integrates with GSD's phase lifecycle, producing VERIFICATION.md
- Autopilot scripts moved to `~/.claude/scripts/` (safe zone, never touched by GSD updates)
