#!/usr/bin/env bash
# Scribe SessionStart hook — show pipeline state if scribe.local.md exists
# Uses CLAUDE_PROJECT_DIR env var (set by Claude Code for hooks)

# Don't use set -e — we want graceful fallthrough, not hard failures
set -uo pipefail

# Try CLAUDE_PROJECT_DIR first, then parse from stdin
CWD="${CLAUDE_PROJECT_DIR:-}"

if [ -z "$CWD" ]; then
  # Try reading cwd from stdin JSON
  input=$(cat 2>/dev/null || true)
  if [ -n "$input" ]; then
    CWD=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null || true)
  fi
fi

if [ -z "$CWD" ]; then
  exit 0
fi

LOCAL_FILE="$CWD/scribe.local.md"

if [ ! -f "$LOCAL_FILE" ]; then
  exit 0
fi

# Extract YAML frontmatter fields
project=$(sed -n 's/^project: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/p' "$LOCAL_FILE" | head -1)
arc=$(sed -n 's/^current_arc: *\(.*\)/\1/p' "$LOCAL_FILE" | head -1)
chapter=$(sed -n 's/^current_chapter: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/p' "$LOCAL_FILE" | head -1)
stage=$(sed -n 's/^pipeline_stage: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/p' "$LOCAL_FILE" | head -1)
confidence=$(sed -n 's/^voice_confidence: *\(.*\)/\1/p' "$LOCAL_FILE" | head -1)

# Map stage to suggested command
case "${stage:-}" in
  plan-story)   next_cmd="/scribe:plan story" ;;
  plan-arc)     next_cmd="/scribe:plan arc $arc" ;;
  plan-chapter) next_cmd="/scribe:plan chapter $chapter" ;;
  plan-scenes)  next_cmd="/scribe:plan scenes $chapter" ;;
  plan-beats)   next_cmd="/scribe:plan beats $chapter" ;;
  write-draft)  next_cmd="/scribe:write $chapter" ;;
  edit-1)       next_cmd="/scribe:edit plot $chapter" ;;
  edit-2)       next_cmd="/scribe:edit scene $chapter" ;;
  edit-3)       next_cmd="/scribe:edit line $chapter" ;;
  edit-4)       next_cmd="/scribe:edit ai $chapter" ;;
  edit-5)       next_cmd="/scribe:edit hostile $chapter" ;;
  final)        next_cmd="Chapter $chapter is through the pipeline." ;;
  *)            next_cmd="/scribe:plan" ;;
esac

echo "Scribe: ${project:-Unknown project} | Arc ${arc:-?} Ch ${chapter:-?} | Stage: ${stage:-unknown} | Voice: ${confidence:-?}/5"
echo "Next: ${next_cmd}"
