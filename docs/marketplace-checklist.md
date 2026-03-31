# Jarvis Plugin Marketplace Checklist

Publishing checklist for all packages in the `pjschulz3004/claude-plugins` monorepo.

**Marketplace:** `pjschulz-plugins` (source: `pjschulz3004/claude-plugins`)

---

## Package Types

| Type | Description | Marketplace publishing needed? |
|------|-------------|-------------------------------|
| **Plugin** | Has MCP server or slash commands; installable via `claude plugin install` | Yes |
| **Library** | Shared code used by other packages; no Claude Code interface | No |
| **Service** | Systemd daemon; not a Claude Code plugin | No |

---

## Packages

### jarvis-shared (Library)

Shared types, interfaces, and credentials helper. Used by all other jarvis packages.

- [ ] Package name is `@jarvis/shared` in `package.json`
- [ ] Builds cleanly: `cd packages/jarvis-shared && npm run build`
- [ ] Tests pass: `cd packages/jarvis-shared && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch

**Note:** Library package -- no marketplace publishing needed.

---

### jarvis-email (Plugin)

IMAP email tools: list, search, move, flag messages.

- [ ] Package name is `@jarvis/email` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-email && npm run build`
- [ ] Tests pass: `cd packages/jarvis-email && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-email@pjschulz-plugins`

---

### jarvis-calendar (Plugin)

CalDAV calendar and VTODO task tools.

- [ ] Package name is `@jarvis/calendar` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-calendar && npm run build`
- [ ] Tests pass: `cd packages/jarvis-calendar && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-calendar@pjschulz-plugins`

---

### jarvis-contacts (Plugin)

CardDAV contact search and management.

- [ ] Package name is `@jarvis/contacts` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-contacts && npm run build`
- [ ] Tests pass: `cd packages/jarvis-contacts && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-contacts@pjschulz-plugins`

---

### jarvis-budget (Plugin)

YNAB budget categories and transaction tools.

- [ ] Package name is `@jarvis/budget` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-budget && npm run build`
- [ ] Tests pass: `cd packages/jarvis-budget && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-budget@pjschulz-plugins`

---

### jarvis-files (Plugin)

File inbox/outbox/archive management tools.

- [ ] Package name is `@jarvis/files` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-files && npm run build`
- [ ] Tests pass: `cd packages/jarvis-files && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-files@pjschulz-plugins`

---

### jarvis-kg (Plugin)

Neo4j knowledge graph integration.

- [ ] Package name is `@jarvis/kg` in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis-kg && npm run build`
- [ ] Tests pass: `cd packages/jarvis-kg && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis-kg@pjschulz-plugins`

---

### jarvis (Plugin)

Orchestrator plugin: `/status`, `/brief`, `/ask` slash commands.

- [ ] Package name is `@jarvis/jarvis` (or `jarvis`) in `package.json`
- [ ] Has SKILL.md or plugin manifest (plugin.json)
- [ ] Builds cleanly: `cd packages/jarvis && npm run build`
- [ ] Tests pass: `cd packages/jarvis && npm test`
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] `claude plugin marketplace update pjschulz-plugins`
- [ ] Plugin installable: `claude plugin install jarvis@pjschulz-plugins`

---

### jarvis-daemon (Service)

Heartbeat scheduler, Telegram bot, and health endpoint. Runs as a systemd service on the VPS.

- [ ] Package name is `@jarvis/daemon` in `package.json`
- [ ] Builds cleanly: `cd packages/jarvis-daemon && npm run build`
- [ ] Tests pass: `cd packages/jarvis-daemon && npm test`
- [ ] `jarvis-daemon.service` updated if paths or env vars changed
- [ ] Committed and pushed to `pjschulz3004/claude-plugins` main branch
- [ ] Deploy script run on VPS: `./packages/jarvis-daemon/scripts/deploy.sh`

**Note:** Service package -- no marketplace publishing needed. Deploy via `scripts/deploy.sh`.

---

## Publishing Command Reference

```bash
# Update marketplace index after pushing to GitHub
claude plugin marketplace update pjschulz-plugins

# Install a plugin
claude plugin install jarvis-email@pjschulz-plugins
claude plugin install jarvis-calendar@pjschulz-plugins
claude plugin install jarvis-contacts@pjschulz-plugins
claude plugin install jarvis-budget@pjschulz-plugins
claude plugin install jarvis-files@pjschulz-plugins
claude plugin install jarvis-kg@pjschulz-plugins
claude plugin install jarvis@pjschulz-plugins

# Verify marketplace is up to date
claude plugin marketplace list pjschulz-plugins
```

---

## Final Release Checklist

- [ ] All 7 plugin packages installable from marketplace
- [ ] Daemon deployed and running in shadow mode (see `docs/cutover-runbook.md`)
- [ ] Cutover completed and verified
- [ ] Uptime Kuma updated to monitor port 3334
- [ ] Python jarvis.service disabled
