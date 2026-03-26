#!/bin/bash
# Auto-approve hook for Claude Code
# Checks for a marker file in the PROJECT directory (CWD), not globally.
# Dies with the session/project — no risk of forgetting it on.
#
# Toggle from within a session: /autopilot
# Or manually: touch .autopilot / rm .autopilot

if [ -f ".autopilot" ]; then
    echo '{"hookSpecificOutput":{"permissionDecision":"allow","permissionDecisionReason":"autopilot mode (project)"}}'
fi
