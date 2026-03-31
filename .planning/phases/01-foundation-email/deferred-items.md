# Deferred Items - Phase 01

## Pre-existing Build Errors

### jarvis-email mcp-server.ts type errors
- **Found during:** 01-03 Task 2 build verification
- **Description:** The `ToolResult` interface from `@jarvis/shared` lacks an index signature that the MCP SDK's `registerTool` callback requires. All `registerTool` calls in `packages/jarvis-email/src/mcp-server.ts` fail type checking.
- **Impact:** `tsc --build` from root fails for jarvis-email. Daemon builds independently via `tsc --build packages/jarvis-daemon`.
- **Fix:** Add `[key: string]: unknown;` to `ToolResult` interface in `@jarvis/shared`, or cast return types in mcp-server.ts.
- **Scope:** Pre-existing from Plan 01-02. Not caused by 01-03 changes.
