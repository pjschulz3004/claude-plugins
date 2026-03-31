---
phase: 06-cutover
plan: 01
subsystem: deployment
tags: [systemd, deployment, documentation, cutover, devops]
dependency_graph:
  requires: [05-03-PLAN.md]
  provides: [deployment-artifacts, cutover-procedure]
  affects: [jarvis-daemon]
tech_stack:
  added: []
  patterns: [systemd-service, env-file, deploy-script]
key_files:
  created:
    - packages/jarvis-daemon/jarvis-daemon.service
    - packages/jarvis-daemon/.env.example
    - packages/jarvis-daemon/scripts/deploy.sh
    - docs/cutover-runbook.md
    - docs/marketplace-checklist.md
  modified:
    - README.md
decisions:
  - "TS daemon uses port 3334 (JARVIS_HEALTH_PORT) to avoid conflict with Python jarvis on port 8085"
  - "deploy.sh enables but does NOT auto-start the service; cutover timing is manual"
  - "Shadow mode requires a second Telegram bot token to avoid 409 Conflict"
  - ".env.example documents all 11 env vars with comments; MAILBOX_USER/PASS shared across IMAP, CalDAV, CardDAV"
metrics:
  duration: 259s
  completed: 2026-03-31
  tasks_completed: 3
  files_created: 6
---

# Phase 06 Plan 01: Deployment Artifacts Summary

**One-liner:** Systemd unit + .env.example + deploy script + cutover runbook + marketplace checklist + README Jarvis section for safe shadow-mode migration from Python to TS daemon.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Systemd service, .env.example, and deploy script | ec16e36 | jarvis-daemon.service, .env.example, scripts/deploy.sh |
| 2 | Cutover runbook and marketplace checklist | c0232eb | docs/cutover-runbook.md, docs/marketplace-checklist.md |
| 3 | Update README with Jarvis package listing | f93fff8 | README.md |

## Artifacts Created

### packages/jarvis-daemon/jarvis-daemon.service

Systemd unit for the TS daemon. Key configuration:
- `WorkingDirectory=/home/paul/dev/claude/plugins`
- `ExecStart=/usr/bin/node packages/jarvis-daemon/dist/main.js`
- `EnvironmentFile=/home/paul/dev/claude/plugins/packages/jarvis-daemon/.env`
- `Restart=on-failure` with `RestartSec=10`
- `SyslogIdentifier=jarvis-daemon` for clean log filtering

### packages/jarvis-daemon/.env.example

Documents all 11 environment variables in 6 groups:
1. MAILBOX_IMAP_HOST, MAILBOX_IMAP_PORT, MAILBOX_USER, MAILBOX_PASS
2. MAILBOX_CALDAV_URL (CalDAV; shares MAILBOX_USER/PASS)
3. YNAB_ACCESS_TOKEN, YNAB_BUDGET_ID
4. JARVIS_TELEGRAM_BOT_TOKEN, JARVIS_TELEGRAM_CHAT_ID
5. JARVIS_HEALTH_PORT=3334
6. NEO4J_PASSWORD (optional; for memory_consolidation heartbeat)

### packages/jarvis-daemon/scripts/deploy.sh

Build-and-install script with `set -euo pipefail`. Steps: `npm ci` -> `npm run build` -> copy service file -> `systemctl daemon-reload` -> `systemctl enable`. Does NOT `systemctl start` -- cutover timing is manual.

### docs/cutover-runbook.md

Step-by-step migration procedure with 4 sections:
1. **Shadow Mode**: Start TS daemon alongside Python; compare outputs for 24-48 hours. Includes Telegram second-bot guidance to avoid 409 Conflict.
2. **Cutover**: Stop Python, swap Telegram token, restart TS daemon, disable Python.
3. **Verification**: Health endpoint, heartbeat tasks, Telegram commands, Uptime Kuma update.
4. **Rollback**: Stop TS, restart Python, investigate failures.

### docs/marketplace-checklist.md

Per-package publishing steps for all 9 packages. Distinguishes:
- 7 **Plugin** packages (need marketplace publishing): email, calendar, contacts, budget, files, kg, jarvis
- 1 **Library** package (no publishing needed): jarvis-shared
- 1 **Service** package (deploy via deploy.sh, not marketplace): jarvis-daemon

### README.md

Added "Jarvis -- Personal AI Assistant" section with full package table (9 packages with Type and Description columns) and install commands for all 7 plugin packages.

## Decisions Made

1. **Port 3334 for TS daemon**: Python jarvis occupies port 8085. TS daemon defaults to 3333 in code but .env.example sets 3334 to make the non-collision explicit.
2. **No auto-start in deploy.sh**: Safety -- the operator controls cutover timing per the runbook. `systemctl enable` ensures it starts on reboot post-cutover without activating it immediately.
3. **Second Telegram bot in shadow mode**: Running two Telegram bots with the same token causes 409 Conflict. The runbook documents creating a temporary second bot and swapping back at cutover.
4. **MAILBOX_USER/PASS shared**: mailbox.org uses a single credential set for IMAP, CalDAV, and CardDAV. Documented in .env.example to avoid confusion about why CalDAV has no separate password fields.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all files are complete and production-ready. No placeholder content.

## Self-Check: PASSED

Files verified:
- `packages/jarvis-daemon/jarvis-daemon.service` -- FOUND
- `packages/jarvis-daemon/.env.example` -- FOUND
- `packages/jarvis-daemon/scripts/deploy.sh` -- FOUND
- `docs/cutover-runbook.md` -- FOUND
- `docs/marketplace-checklist.md` -- FOUND
- `README.md` updated -- FOUND

Commits verified (on VPS git log):
- `ec16e36` -- feat(06-01): systemd service, .env.example, and deploy script -- FOUND
- `c0232eb` -- feat(06-01): cutover runbook and marketplace checklist -- FOUND
- `f93fff8` -- feat(06-01): add Jarvis package listing to README -- FOUND
