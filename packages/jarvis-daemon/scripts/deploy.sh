#!/usr/bin/env bash
set -euo pipefail

# deploy.sh -- Build and install the Jarvis TS daemon on the VPS.
#
# Usage: ./packages/jarvis-daemon/scripts/deploy.sh
#
# What it does:
#   1. Installs npm dependencies (npm ci)
#   2. Builds all packages (npm run build)
#   3. Copies the systemd service file to /etc/systemd/system/
#   4. Reloads systemd and enables the service
#
# NOTE: This script does NOT start the service automatically.
# Cutover timing is manual -- see docs/cutover-runbook.md.
# Start with: sudo systemctl start jarvis-daemon

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
SERVICE_SRC="${REPO_ROOT}/packages/jarvis-daemon/jarvis-daemon.service"
SERVICE_DEST="/etc/systemd/system/jarvis-daemon.service"

echo "[deploy] Repo root: ${REPO_ROOT}"
cd "${REPO_ROOT}"

echo "[deploy] Installing dependencies..."
npm ci

echo "[deploy] Building all packages..."
npm run build

echo "[deploy] Copying service file to ${SERVICE_DEST}..."
sudo cp "${SERVICE_SRC}" "${SERVICE_DEST}"
sudo chmod 644 "${SERVICE_DEST}"

echo "[deploy] Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "[deploy] Enabling jarvis-daemon service..."
sudo systemctl enable jarvis-daemon

echo ""
echo "[deploy] Done. Service installed and enabled."
echo "[deploy] To start (cutover): sudo systemctl start jarvis-daemon"
echo "[deploy] To check status:    sudo systemctl status jarvis-daemon"
echo "[deploy] To view logs:       sudo journalctl -u jarvis-daemon -f"
echo ""
echo "[deploy] IMPORTANT: See docs/cutover-runbook.md before starting in production."
echo "[deploy] Python jarvis service on port 8085 is NOT affected by this script."
