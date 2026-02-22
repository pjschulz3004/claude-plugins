#!/bin/bash
# Forge quality gate hook
# Warns (but does not block) when attempting to push/PR before TEMPER phase

# Read the bash command from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only check for push/PR commands
case "$COMMAND" in
  *"git push"*|*"gh pr create"*|*"gh pr merge"*)
    ;;
  *)
    exit 0
    ;;
esac

# Check if forge.local.md exists in current directory
FORGE_STATE="./forge.local.md"
if [ ! -f "$FORGE_STATE" ]; then
  exit 0  # No forge state = not a forge project, allow everything
fi

# Extract current phase from frontmatter
PHASE=$(python3 -c "
import re, sys
with open('$FORGE_STATE') as f:
    content = f.read()
match = re.search(r'^phase:\s*(\w+)', content, re.MULTILINE)
if match:
    print(match.group(1))
else:
    print('UNKNOWN')
" 2>/dev/null)

# Warn if not past TEMPER
case "$PHASE" in
  IGNITE|SHAPE)
    echo "FORGE WARNING: Current phase is $PHASE. The TEMPER phase (security review, performance audit, git diff review) has not been completed yet. Consider running /forge to continue the pipeline before shipping."
    # Exit 0 = allow (warning only, not blocking)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
