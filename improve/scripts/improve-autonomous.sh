#!/bin/bash
# Autonomous codebase improvement runner
# Usage: improve-autonomous.sh <project-dir> [duration] [flags]
# Example: improve-autonomous.sh ~/Projects/Jarvis 2h --creep-build

set -euo pipefail

PROJECT_DIR="${1:?Usage: improve-autonomous.sh <project-dir> [duration] [flags]}"
DURATION="${2:-1h}"
FLAGS="${3:-}"

# Resolve to absolute path
PROJECT_DIR="$(realpath "$PROJECT_DIR")"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: $PROJECT_DIR is not a directory"
    exit 1
fi

# Check for git repo
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo "Warning: $PROJECT_DIR is not a git repository. Improve needs git for commits."
    echo "Initialize with: cd $PROJECT_DIR && git init"
    exit 1
fi

LOG_FILE="$PROJECT_DIR/.improve-output.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Autonomous Improve ==="
echo "Project:  $PROJECT_DIR"
echo "Duration: $DURATION"
echo "Flags:    ${FLAGS:-none}"
echo "Log:      $LOG_FILE"
echo "Started:  $TIMESTAMP"
echo ""

PROMPT="Run /improve ${DURATION} ${FLAGS}. Work autonomously through all cycles. Do not ask for confirmation on anything. Make real changes, test them, and commit. If something fails, revert and move on. Log everything to .improve-log.md."

cd "$PROJECT_DIR" && claude -p "$PROMPT" \
    --dangerously-skip-permissions \
    2>&1 | tee "$LOG_FILE"

echo ""
echo "=== Improve Complete ==="
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Check $PROJECT_DIR/.improve-log.md for details"
