#!/bin/bash
# combine-scenes.sh — Concatenate scene files into a single chapter file
# Usage: combine-scenes.sh <chapter-dir> <stage-name>
# Example: combine-scenes.sh "arcs/arc-3-agitprop/3.7" "edit-5-hostile"

set -euo pipefail

CHAPTER_DIR="$1"
STAGE="${2:-edit-5-hostile}"
OUTPUT_DIR="${CHAPTER_DIR}/final"
OUTPUT_FILE="${OUTPUT_DIR}/chapter.md"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Find scene files in the stage directory, sorted numerically
STAGE_DIR="${CHAPTER_DIR}/${STAGE}"
if [ ! -d "$STAGE_DIR" ]; then
    echo "Error: Stage directory not found: $STAGE_DIR"
    exit 1
fi

# Get chapter number from directory name (e.g., "3.7" from ".../3.7/")
CHAPTER_NUM=$(basename "$CHAPTER_DIR")

# Find scene files, sort by scene number
SCENE_FILES=$(find "$STAGE_DIR" -maxdepth 1 -name "scene-*.md" | sort -t'-' -k2 -n)

if [ -z "$SCENE_FILES" ]; then
    echo "Error: No scene files found in $STAGE_DIR"
    exit 1
fi

# Count scenes
SCENE_COUNT=$(echo "$SCENE_FILES" | wc -l)
echo "Combining $SCENE_COUNT scenes from $STAGE_DIR"

# Start the output file with chapter header
echo "# ${CHAPTER_NUM}" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

FIRST=true
for SCENE_FILE in $SCENE_FILES; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        # Add scene break between scenes
        echo "" >> "$OUTPUT_FILE"
        echo "---" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi

    # Strip the scene header line and HTML comment, keep only prose
    # Skip lines matching "# Scene N:" and "<!-- ... -->"
    sed '/^# Scene [0-9]/d; /^<!-- .* -->$/d; /^<!-- Edit Stage/,/^-->$/d' "$SCENE_FILE" \
        | sed '/./,$!d' \
        >> "$OUTPUT_FILE"
done

# Count words in final file
WORD_COUNT=$(wc -w < "$OUTPUT_FILE")
echo "Output: $OUTPUT_FILE ($WORD_COUNT words)"
