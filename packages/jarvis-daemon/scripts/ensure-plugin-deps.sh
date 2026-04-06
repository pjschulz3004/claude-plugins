#!/usr/bin/env bash
# Ensure Jarvis MCP plugins can start on every daemon boot.
# Solves three problems permanently:
#
# 1. No compiled dist/ in marketplace cache → symlink from monorepo
# 2. No node_modules for workspace deps → symlink from monorepo
# 3. No credentials for MCP server processes → inject from daemon .env into .mcp.json
#
# Run as ExecStartPre in systemd.

set -euo pipefail

MONOREPO="$HOME/dev/claude/plugins"
MONOREPO_MODULES="$MONOREPO/node_modules"
ENV_FILE="$MONOREPO/packages/jarvis-daemon/.env"
PLUGIN_CACHE="$HOME/.claude/plugins/cache/pjschulz-plugins"
PLUGIN_MARKETPLACE="$HOME/.claude/plugins/marketplaces/pjschulz-plugins/packages"

if [ ! -d "$MONOREPO" ]; then
  echo "[ensure-plugin-deps] Monorepo not found"
  exit 0
fi

# Load credentials from daemon .env
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

PLUGINS="jarvis-email jarvis-calendar jarvis-contacts jarvis-budget jarvis-files"

for plugin in $PLUGINS; do
  MONO_DIST="$MONOREPO/packages/$plugin/dist"
  [ ! -d "$MONO_DIST" ] && continue

  # Symlink dist/ and node_modules/ into BOTH cache and marketplace dirs
  for DIR in "$PLUGIN_CACHE/$plugin/0.1.0" "$PLUGIN_MARKETPLACE/$plugin"; do
    if [ -d "$DIR" ]; then
      rm -rf "$DIR/dist" 2>/dev/null
      ln -sf "$MONO_DIST" "$DIR/dist"
      rm -rf "$DIR/node_modules" 2>/dev/null
      ln -sf "$MONOREPO_MODULES" "$DIR/node_modules"
    fi
  done
done

# Symlink node_modules into plugin data dirs
for dir in "$HOME/.claude/plugins/data/jarvis-"*; do
  if [ -d "$dir" ]; then
    rm -rf "$dir/node_modules" 2>/dev/null
    ln -sf "$MONOREPO_MODULES" "$dir/node_modules"
  fi
done

# Inject credentials into .mcp.json for each plugin
# MCP server subprocesses DON'T inherit the daemon's env vars.
# The .mcp.json env block is the ONLY way to pass credentials to them.

inject_mcp_env() {
  local DIR="$1"
  local MCP_FILE="$DIR/.mcp.json"
  [ ! -f "$MCP_FILE" ] && return

  # Write a fresh .mcp.json with credentials from the daemon .env
  local SERVER_NAME
  SERVER_NAME=$(python3 -c "import json; d=json.load(open('$MCP_FILE')); print(list(d['mcpServers'].keys())[0])" 2>/dev/null || echo "")
  [ -z "$SERVER_NAME" ] && return

  local ARGS
  ARGS=$(python3 -c "import json; d=json.load(open('$MCP_FILE')); print(json.dumps(d['mcpServers']['$SERVER_NAME'].get('args',[])))" 2>/dev/null || echo '[]')

  cat > "$MCP_FILE" << MCPEOF
{
  "mcpServers": {
    "$SERVER_NAME": {
      "command": "node",
      "args": $ARGS,
      "env": {
        "NODE_PATH": "\${CLAUDE_PLUGIN_DATA}/node_modules",
        "JARVIS_MAILBOX_EMAIL": "${MAILBOX_USER:-}",
        "JARVIS_MAILBOX_PASSWORD": "${MAILBOX_PASS:-}",
        "JARVIS_MAILBOX_IMAP_HOST": "${MAILBOX_IMAP_HOST:-imap.mailbox.org}",
        "JARVIS_CALDAV_URL": "${MAILBOX_CALDAV_URL:-https://dav.mailbox.org/caldav/}",
        "JARVIS_CARDDAV_URL": "https://dav.mailbox.org/carddav/",
        "JARVIS_YNAB_ACCESS_TOKEN": "${YNAB_ACCESS_TOKEN:-}",
        "JARVIS_YNAB_BUDGET_ID": "${YNAB_BUDGET_ID:-}"
      }
    }
  }
}
MCPEOF
}

for plugin in $PLUGINS; do
  inject_mcp_env "$PLUGIN_CACHE/$plugin/0.1.0"
  inject_mcp_env "$PLUGIN_MARKETPLACE/$plugin"
done

echo "[ensure-plugin-deps] Jarvis plugins: dist + deps + credentials verified"
