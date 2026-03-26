---
description: Toggle autopilot mode (auto-approve all tool calls without permission prompts) for the current project directory
allowed-tools:
  - Bash
---

# Autopilot Mode Toggle

Check the current state and toggle:

```bash
if [ -f ".autopilot" ]; then
    rm ".autopilot"
    echo "AUTOPILOT OFF — permission prompts restored for $(pwd)"
else
    touch ".autopilot"
    echo "AUTOPILOT ON — all tool calls auto-approved for $(pwd)"
fi
```

Run the above command. Report the result to the user.

**Scope:** Project directory only. The `.autopilot` file lives in the current working directory, so it only affects sessions running in this folder. Add `.autopilot` to `.gitignore` if the project has one.
