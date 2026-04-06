#!/usr/bin/env bash
# Ensure Jarvis MCP plugins have compiled JS and node_modules.
# Run before daemon startup (ExecStartPre in systemd).
#
# Two problems this solves permanently:
# 1. Marketplace cache only has TypeScript source, no compiled dist/
#    → Symlink dist/ from the monorepo into each plugin cache
# 2. Workspace dependencies (@jarvis/shared) don't resolve outside monorepo
#    → Symlink node_modules from monorepo into plugin data dirs

MONOREPO="$HOME/dev/claude/plugins"
MONOREPO_MODULES="$MONOREPO/node_modules"
PLUGIN_CACHE="$HOME/.claude/plugins/cache/pjschulz-plugins"

if [ ! -d "$MONOREPO" ]; then
  echo "[ensure-plugin-deps] Monorepo not found at $MONOREPO"
  exit 0
fi

# 1. Symlink compiled dist/ into plugin cache
for plugin in jarvis-email jarvis-calendar jarvis-contacts jarvis-budget jarvis-files; do
  CACHE_DIR="$PLUGIN_CACHE/$plugin/0.1.0"
  MONO_DIST="$MONOREPO/packages/$plugin/dist"

  if [ -d "$CACHE_DIR" ] && [ -d "$MONO_DIST" ]; then
    rm -rf "$CACHE_DIR/dist" 2>/dev/null
    ln -sf "$MONO_DIST" "$CACHE_DIR/dist"
  fi
done

# 2. Symlink node_modules into plugin data dirs
if [ -d "$MONOREPO_MODULES" ]; then
  for dir in "$HOME/.claude/plugins/data/jarvis-"*; do
    if [ -d "$dir" ]; then
      rm -rf "$dir/node_modules" 2>/dev/null
      ln -sf "$MONOREPO_MODULES" "$dir/node_modules"
    fi
  done
fi

echo "[ensure-plugin-deps] Jarvis plugins: dist + node_modules verified"
