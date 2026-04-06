#!/usr/bin/env bash
# Ensure Jarvis MCP plugin node_modules are symlinked to the monorepo.
# Run before daemon startup (ExecStartPre in systemd).
# The plugins use workspace dependencies (@jarvis/shared) that only resolve
# from the monorepo's node_modules. Without this, MCP servers fail to start.

MONOREPO_MODULES="$HOME/dev/claude/plugins/node_modules"

if [ ! -d "$MONOREPO_MODULES" ]; then
  echo "[ensure-plugin-deps] Monorepo node_modules not found at $MONOREPO_MODULES"
  exit 0  # non-fatal
fi

for dir in "$HOME/.claude/plugins/data/jarvis-"*; do
  if [ -d "$dir" ]; then
    rm -rf "$dir/node_modules" 2>/dev/null
    ln -sf "$MONOREPO_MODULES" "$dir/node_modules"
  fi
done

echo "[ensure-plugin-deps] Jarvis plugin symlinks verified"
