# Jarvis TS Daemon -- Cutover Runbook

Migration procedure from Python Jarvis (port 8085) to TypeScript Jarvis (port 3334).
Follow steps in order. Do not rush the shadow mode period.

---

## Prerequisites

Before starting:

- [ ] All phases complete (01 through 06 plans executed)
- [ ] `.env` file created from `.env.example` and all required fields populated
- [ ] `npm run build` passes cleanly from repo root
- [ ] `npm test` passes cleanly from repo root
- [ ] `./packages/jarvis-daemon/scripts/deploy.sh` has been run (service installed, not started)
- [ ] You have a second Telegram bot token for shadow mode (optional but recommended)
- [ ] Python jarvis is currently running and healthy: `curl http://localhost:8085/health`

---

## 1. Shadow Mode

Run both services simultaneously to compare outputs before committing to cutover.

**Duration:** 24-48 hours minimum.

### 1.1 Prepare the TS daemon .env

Copy the Python service credentials and adapt the variable names:

```bash
# Python jarvis uses different var names -- adapt them:
# MAILBOX    → MAILBOX_USER, MAILBOX_PASS
# CALDAV_URL → MAILBOX_CALDAV_URL
# YNAB_TOKEN → YNAB_ACCESS_TOKEN
# etc.

cp packages/jarvis-daemon/.env.example packages/jarvis-daemon/.env
# Edit and fill in all values
nano packages/jarvis-daemon/.env
```

### 1.2 Use a second Telegram bot token (recommended)

To avoid a 409 Conflict error when both services handle Telegram updates simultaneously:

1. Create a second bot with @BotFather: `/newbot`
2. Set `JARVIS_TELEGRAM_BOT_TOKEN` in the TS `.env` to the NEW bot token
3. Keep the Python service using the original (primary) bot token
4. You will receive notifications from both bots during shadow mode -- this is expected

If you skip this step, one bot will fail with 409 Conflict when the other is running.

### 1.3 Start the TS daemon

```bash
sudo systemctl start jarvis-daemon
sudo systemctl status jarvis-daemon
```

Both services now run simultaneously:
- Python jarvis: port 8085
- TS jarvis: port 3334

### 1.4 Monitor during shadow period

**Health check both services:**

```bash
curl http://localhost:8085/health   # Python
curl http://localhost:3334/health   # TypeScript
```

**Compare task execution (last 20 runs):**

```bash
# TS daemon task ledger
sqlite3 ~/dev/claude/plugins/packages/jarvis-daemon/jarvis.db \
  "SELECT task_name, status, started_at FROM task_runs ORDER BY started_at DESC LIMIT 20;"
```

**Watch TS daemon logs:**

```bash
sudo journalctl -u jarvis-daemon -f
```

**Watch Python logs:**

```bash
sudo journalctl -u jarvis -f
```

### 1.5 Shadow mode checklist

- [ ] TS daemon started without errors
- [ ] Health endpoint returns `{"status":"green"}` at port 3334
- [ ] Heartbeat tasks fire on schedule (check logs after next cron window)
- [ ] No task failures in TS ledger after 24 hours
- [ ] Telegram shadow bot responds to `/status` and `/health` commands
- [ ] No duplicate or missing notifications compared to Python service

---

## 2. Cutover

Only proceed when shadow mode checklist is fully complete.

### 2.1 Stop the Python service

```bash
sudo systemctl stop jarvis
```

### 2.2 Swap Telegram bot token

Update the TS daemon `.env` to use the PRIMARY bot token:

```bash
nano ~/dev/claude/plugins/packages/jarvis-daemon/.env
# Change JARVIS_TELEGRAM_BOT_TOKEN to the original/primary bot token
```

### 2.3 Restart the TS daemon

```bash
sudo systemctl restart jarvis-daemon
```

### 2.4 Verify cutover

```bash
# Health endpoint
curl http://localhost:3334/health

# Logs -- confirm startup and bot launch
sudo journalctl -u jarvis-daemon -n 30

# Send a command via Telegram to the PRIMARY bot
# /status should return current daemon state
```

### 2.5 Disable the Python service

Once TS daemon is confirmed healthy:

```bash
sudo systemctl disable jarvis
```

The Python service files remain on disk -- do not delete them yet.

---

## 3. Verification

After cutover, confirm all systems are functioning:

- [ ] Health endpoint returns green: `curl http://localhost:3334/health`
- [ ] All heartbeat tasks fire on their next schedule window
- [ ] Telegram commands respond from the primary bot: `/status`, `/health`, `/email`, `/brief`
- [ ] Task ledger records successful runs (check after 24 hours)
- [ ] Uptime Kuma monitoring: update the jarvis health check from port 8085 to 3334
  - Navigate to Uptime Kuma at http://10.10.10.10:3001
  - Find the jarvis monitor and update the URL to `http://188.245.108.247:3334/health`

---

## 4. Rollback

If issues are found after cutover, revert to the Python service.

**Estimated rollback time: 2-5 minutes**

### 4.1 Stop the TS daemon

```bash
sudo systemctl stop jarvis-daemon
```

### 4.2 Restore Python service

```bash
# Re-enable if you disabled it
sudo systemctl enable jarvis

# Restore the original bot token in Python .env if you changed it
# nano /home/paul/dev/tools/jarvis/.env

# Start Python service
sudo systemctl start jarvis
```

### 4.3 Verify Python is healthy

```bash
curl http://localhost:8085/health
sudo journalctl -u jarvis -n 20
```

### 4.4 Investigate TS issues

```bash
# Check TS daemon logs for the failure
sudo journalctl -u jarvis-daemon --since "1 hour ago"

# Check task ledger for failed runs
sqlite3 ~/dev/claude/plugins/packages/jarvis-daemon/jarvis.db \
  "SELECT task_name, status, error, started_at FROM task_runs WHERE status != 'success' ORDER BY started_at DESC LIMIT 20;"
```

Fix issues in the TS codebase, redeploy, and retry cutover.

---

## Port Reference

| Service | Port | Unit |
|---------|------|------|
| Python jarvis | 8085 | `jarvis.service` |
| TS jarvis daemon | 3334 | `jarvis-daemon.service` |

**IMPORTANT:** Do not modify or stop `jarvis.service` until shadow mode verification is complete.
