#!/usr/bin/env bash
# PostToolUse:Write hook — remind about KB updates only for chapter files
# Reads tool input JSON from stdin, checks if filename matches chapter patterns

set -uo pipefail

input=$(cat 2>/dev/null || true)
[ -z "$input" ] && exit 0

file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "$file_path" ] && exit 0

filename=$(basename "$file_path")

# Check if file matches chapter patterns
case "$filename" in
  *"(draft)"*|*"(edited-"*|*"(scenes)"*|*"(beats)"*)
    echo "Consider updating character states in the knowledge base for changes in this chapter. Use /scribe:kb to update."
    exit 0
    ;;
esac

# Check if file is in an arcs/ directory
case "$file_path" in
  */arcs/*)
    case "$filename" in
      *.md)
        echo "Consider updating character states in the knowledge base for changes in this chapter. Use /scribe:kb to update."
        exit 0
        ;;
    esac
    ;;
esac

# Not a chapter file — exit silently
exit 0
