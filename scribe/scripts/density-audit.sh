#!/bin/bash
# density-audit.sh — Count AI pattern densities across scene files
# Usage: density-audit.sh <directory-with-scene-files> [output-file]
# Example: density-audit.sh "arcs/arc-3-agitprop/3.7/edit-3-line" "arcs/arc-3-agitprop/3.7/edit-4-ai/density-audit.md"
#
# This is a best-effort counting script. The AI agents do qualitative analysis.
# This provides quantitative context.

set -euo pipefail

INPUT_DIR="$1"
OUTPUT_FILE="${2:-density-audit.md}"

# Concatenate all scene files
COMBINED=$(cat "$INPUT_DIR"/scene-*.md 2>/dev/null)
if [ -z "$COMBINED" ]; then
    echo "Error: No scene files found in $INPUT_DIR"
    exit 1
fi

# Word count
WORD_COUNT=$(echo "$COMBINED" | wc -w)
SCALE=$(echo "scale=2; $WORD_COUNT / 1000" | bc)

# Count patterns (case-insensitive grep, count lines)
count_pattern() {
    echo "$COMBINED" | grep -oiP "$1" | wc -l
}

# Contrastive frames
CONTRASTIVE=$(count_pattern "(not just|not only|it('s| is|n't| isn't) not|wasn't|weren't|it was[n']t|not \w+, but)" || echo 0)

# Tricolons (rough: comma-separated lists of 3+ items ending with "and")
TRICOLONS=$(echo "$COMBINED" | grep -oiP '\w+,\s+\w+,\s+and\s+\w+' | wc -l || echo 0)

# Participial clauses (words ending in -ing preceded by comma or at sentence start)
PARTICIPIAL=$(count_pattern '(, \w+ing |^\w+ing )' || echo 0)

# Fragments (sentences under 6 words, rough heuristic)
FRAGMENTS=$(echo "$COMBINED" | grep -oP '[.!?]\s+[A-Z][^.!?]{0,30}[.!?]' | awk '{if(NF<7) print}' | wc -l || echo 0)

# Dashes (em dash, en dash, space-hyphen-space)
DASHES=$(count_pattern '(—|–| - )' || echo 0)

# AI vocabulary Tier 1
TIER1=$(count_pattern '\b(delve|navigate|underscore|leverage|foster|showcase|spearhead|bolster|meticulous|pivotal|robust|vibrant|bustling|multifaceted|seamless|tapestry|landscape|realm|paradigm|synergy|beacon)\b' || echo 0)

# Emotional labels
EMOTIONAL=$(count_pattern '(surge of|wave of|flood of|mix of .+ and|warred with|felt a sense of|sense of .+ settled)' || echo 0)

# Sentence length stats
SENTENCES=$(echo "$COMBINED" | grep -oP '[^.!?]+[.!?]' | wc -l)
if [ "$SENTENCES" -gt 0 ]; then
    AVG_LEN=$(echo "$COMBINED" | grep -oP '[^.!?]+[.!?]' | awk '{print NF}' | awk '{sum+=$1} END {printf "%.1f", sum/NR}')
    STD_DEV=$(echo "$COMBINED" | grep -oP '[^.!?]+[.!?]' | awk '{print NF}' | awk -v avg="$AVG_LEN" '{sum+=($1-avg)^2} END {printf "%.1f", sqrt(sum/NR)}')
else
    AVG_LEN="0"
    STD_DEV="0"
fi

# Generate report
cat > "$OUTPUT_FILE" << EOF
# Density Audit

**Source**: $INPUT_DIR
**Word count**: $WORD_COUNT
**Scale**: ${SCALE} (per-1000w multiplier)

## Pattern Counts

| Pattern | Count | Per 1000w | Target | Status |
|---------|-------|-----------|--------|--------|
| Contrastive frames | $CONTRASTIVE | $(echo "scale=1; $CONTRASTIVE / $SCALE" | bc) | Max 1-2 | $([ $(echo "$CONTRASTIVE / $SCALE > 2" | bc) -eq 1 ] && echo "OVER" || echo "OK") |
| Tricolons | $TRICOLONS | $(echo "scale=1; $TRICOLONS / $SCALE" | bc) | Max 2-3 | $([ $(echo "$TRICOLONS / $SCALE > 3" | bc) -eq 1 ] && echo "OVER" || echo "OK") |
| Participial clauses | $PARTICIPIAL | $(echo "scale=1; $PARTICIPIAL / $SCALE" | bc) | Max 3-5 | $([ $(echo "$PARTICIPIAL / $SCALE > 5" | bc) -eq 1 ] && echo "OVER" || echo "OK") |
| Fragments (est.) | $FRAGMENTS | $(echo "scale=1; $FRAGMENTS / $SCALE" | bc) | 5-6 | - |
| Dashes | $DASHES | $(echo "scale=1; $DASHES / $SCALE" | bc) | 0 | $([ "$DASHES" -gt 0 ] && echo "FAIL" || echo "OK") |
| AI vocab (Tier 1) | $TIER1 | $(echo "scale=1; $TIER1 / $SCALE" | bc) | 0 | $([ "$TIER1" -gt 0 ] && echo "FAIL" || echo "OK") |
| Emotional labels | $EMOTIONAL | $(echo "scale=1; $EMOTIONAL / $SCALE" | bc) | 0-1 | $([ $(echo "$EMOTIONAL / $SCALE > 1" | bc) -eq 1 ] && echo "OVER" || echo "OK") |

## Burstiness

- **Average sentence length**: $AVG_LEN words
- **Sentence length std dev**: $STD_DEV words (target: > 8.0)
- **Status**: $(echo "$STD_DEV > 8" | bc -l | grep -q 1 && echo "PASS" || echo "FAIL - low burstiness")

## Notes

This is a best-effort quantitative audit. Counts are approximate (regex-based).
The AI detection agents perform qualitative analysis on top of these numbers.
EOF

echo "Density audit written to: $OUTPUT_FILE"
