---
phase: 04-update-survival
plan: 01
status: complete
started: 2026-03-27
completed: 2026-03-27
---

# Summary: Validate Update Survival

## What was done

Validated all Demiurge files against GSD's install.js wipe patterns (lines 3492, 3501) and backup mechanism (lines 3881-4011).

## Results

### Patch Zone (9 files — wiped by update, backed up to gsd-local-patches/)

| File | Location | Wipe Target |
|------|----------|-------------|
| forge.md | commands/gsd/ | rmSync(gsdCommandsDir) L3492 |
| forge-temper.md | commands/gsd/ | rmSync(gsdCommandsDir) L3492 |
| forge-autonomous.md | commands/gsd/ | rmSync(gsdCommandsDir) L3492 |
| forge-ignite.md | get-shit-done/workflows/ | rmSync(gsdDir) L3501 |
| forge-discipline.md | get-shit-done/workflows/ | rmSync(gsdDir) L3501 |
| forge-temper.md | get-shit-done/workflows/ | rmSync(gsdDir) L3501 |
| forge-deliver.md | get-shit-done/workflows/ | rmSync(gsdDir) L3501 |
| forge-autonomous.md | get-shit-done/workflows/ | rmSync(gsdDir) L3501 |
| forge-decomposition.md | get-shit-done/templates/ | rmSync(gsdDir) L3501 |

### Safe Zone (9 files — never touched by update)

| File | Location | Why Safe |
|------|----------|----------|
| forge-backend.md | agents/ | No gsd- prefix |
| forge-designer.md | agents/ | No gsd- prefix |
| forge-frontend.md | agents/ | No gsd- prefix |
| forge-researcher.md | agents/ | No gsd- prefix |
| forge-reviewer.md | agents/ | No gsd- prefix |
| forge-tester.md | agents/ | No gsd- prefix |
| forge-quality-gate.sh | scripts/ | Custom directory |
| improve-auto-approve.sh | scripts/ | Custom directory |
| improve-autonomous.sh | scripts/ | Custom directory |

### Recovery Procedure

After running `/gsd:update`:
1. GSD automatically backs up modified files to `~/.claude/gsd-local-patches/`
2. Run `/gsd:reapply-patches` to restore all 9 patch zone files
3. Safe zone files require no action

## Deviations

None.

## key-files

created: []
modified: []
