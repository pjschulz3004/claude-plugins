---
phase: 06-plugin-deprecation
plan: 01
status: complete
started: 2026-03-28
completed: 2026-03-28
---

# Summary: Plugin Deprecation

## What was done

### Local Uninstall (DEP-01 through DEP-04)
- Uninstalled `forge@pjschulz-plugins` via `claude plugin uninstall`
- Uninstalled `improve@pjschulz-plugins` via `claude plugin uninstall`
- Verified all 24 Demiurge files intact (6 agents, 4 GSD commands, 6 workflows, 1 template, 3 scripts, 1 standalone command, 1 config flag, 1 state file, 1 decomposition template)
- Verified no orphaned hooks or settings references

### GitHub Marketplace (MKT-01 through MKT-03)
- Updated forge/plugin.json with [DEPRECATED] description prefix
- Created forge/DEPRECATED.md with migration instructions
- Updated improve/plugin.json with [DEPRECATED] description prefix
- Created improve/DEPRECATED.md with migration instructions
- GitHub push blocked by token permissions — needs manual push from VPS

## Manual Step Required

```bash
ssh paul@188.245.108.247 "cd ~/dev/claude/plugins && git add forge/.claude-plugin/plugin.json forge/DEPRECATED.md improve/.claude-plugin/plugin.json improve/DEPRECATED.md && git commit -m 'chore: deprecate forge and improve — superseded by Demiurge' && git push"
```

## key-files

created:
  - ~/dev/claude/plugins/forge/DEPRECATED.md
  - ~/dev/claude/plugins/improve/DEPRECATED.md
modified:
  - ~/dev/claude/plugins/forge/.claude-plugin/plugin.json
  - ~/dev/claude/plugins/improve/.claude-plugin/plugin.json
