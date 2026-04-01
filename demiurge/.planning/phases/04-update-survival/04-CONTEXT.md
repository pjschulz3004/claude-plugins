# Phase 4: Update Survival - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Mode:** Auto-generated (validation phase)

<domain>
## Phase Boundary

Validate that all Demiurge files survive a gsd:update + gsd:reapply-patches cycle. This is a testing/validation phase, not a build phase. The deliverables from Phases 1-3 must be verified to survive GSD's update mechanism intact.

</domain>

<decisions>
## Implementation Decisions

### Validation Strategy
1. Inventory all Demiurge files in both safe zone and patch zone
2. Verify safe zone files (forge-*.md agents) are NOT in GSD's wipe list
3. Verify patch zone files (commands/gsd/forge*.md, workflows/forge-*.md, templates/forge-*.md) ARE detected by GSD's backup mechanism
4. Document the recovery procedure for after-update restoration
5. Do NOT actually run gsd:update (destructive) — verify the mechanism by reading GSD's install.js logic

### Claude's Discretion
Implementation of the validation script and documentation format.

</decisions>

<code_context>
## Existing Code Insights

- GSD update wipes: commands/gsd/, get-shit-done/, agents/gsd-*
- GSD update preserves: agents without gsd- prefix, commands outside gsd/, scripts/
- Backup destination: ~/.claude/gsd-local-patches/ with backup-meta.json
- Restore command: /gsd:reapply-patches

</code_context>

<specifics>
## Specific Ideas

No specific requirements.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
