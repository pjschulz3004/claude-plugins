---
phase: 02-remaining-tools
plan: 02
subsystem: contacts
tags: [carddav, tsdav, vcard, mcp, contacts, mailbox.org]

requires:
  - phase: 01-foundation-email
    provides: monorepo structure, @jarvis/shared credentials, MCP plugin pattern
provides:
  - "@jarvis/contacts package with CardDAV backend and MCP server"
  - "4 MCP tools: search_contacts, get_contact, create_contact, update_contact"
  - "vCard 3.0 parsing with multi-value field support"
  - "/jarvis-contacts:lookup command"
affects: [03-daemon-integration, jarvis-core]

tech-stack:
  added: [tsdav (CardDAV via existing dep)]
  patterns: [connection-per-operation for CardDAV, vCard line-by-line parsing with unfold]

key-files:
  created:
    - packages/jarvis-contacts/src/types.ts
    - packages/jarvis-contacts/src/backend.ts
    - packages/jarvis-contacts/src/backend.test.ts
    - packages/jarvis-contacts/src/types.test.ts
    - packages/jarvis-contacts/src/mcp-server.ts
    - packages/jarvis-contacts/src/index.ts
    - packages/jarvis-contacts/.claude-plugin/plugin.json
    - packages/jarvis-contacts/.mcp.json
    - packages/jarvis-contacts/commands/lookup.md
    - packages/jarvis-contacts/package.json
    - packages/jarvis-contacts/tsconfig.json
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "tsdav createVCard uses vCardString param (not data) in ^2.1.8"
  - "Same MAILBOX credentials as email plugin (shared mailbox.org account)"
  - "vCard parsing uses regex with unfold for RFC 6350 compliance"

patterns-established:
  - "CardDAV connection-per-operation with retry (same as CalDAV pattern)"
  - "vCard multi-value extraction via regex with gm flag"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05]

duration: 7min
completed: 2026-03-31
---

# Phase 02 Plan 02: Contacts Summary

**CardDAV contacts plugin with tsdav backend, vCard parsing for multi-value fields, and 4 MCP tools for search/get/create/update**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-31T13:29:05Z
- **Completed:** 2026-03-31T13:35:45Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- TsdavContactsBackend with connection-per-operation and retry on transient errors
- vCard parsing handles multi-value EMAIL, TEL, ADR fields with line unfolding
- 4 MCP tools registered: search_contacts, get_contact, create_contact, update_contact
- 24 tests passing (10 type schema + 14 backend with mocked tsdav)
- Plugin manifest, .mcp.json, and /jarvis-contacts:lookup command

## Task Commits

Each task was committed atomically:

1. **Task 1: Contact types and tsdav CardDAV backend (TDD)** - `ba2b3df` (feat)
2. **Task 2: MCP server, plugin manifest, and lookup command** - `1796871` (feat)

## Files Created/Modified
- `packages/jarvis-contacts/src/types.ts` - CardDAVConfig, Contact, ContactSummary interfaces + Zod schemas
- `packages/jarvis-contacts/src/backend.ts` - TsdavContactsBackend with connection-per-operation, vCard parsing
- `packages/jarvis-contacts/src/backend.test.ts` - 14 backend tests with mocked tsdav DAVClient
- `packages/jarvis-contacts/src/types.test.ts` - 10 Zod schema validation tests
- `packages/jarvis-contacts/src/mcp-server.ts` - MCP server with 4 contacts tools
- `packages/jarvis-contacts/src/index.ts` - Re-exports types and backend
- `packages/jarvis-contacts/.claude-plugin/plugin.json` - Plugin manifest with MAILBOX userConfig
- `packages/jarvis-contacts/.mcp.json` - MCP server declaration
- `packages/jarvis-contacts/commands/lookup.md` - Lookup command scoped to search+get tools
- `packages/jarvis-contacts/package.json` - Package with tsdav, zod, @jarvis/shared deps
- `packages/jarvis-contacts/tsconfig.json` - TypeScript config with composite build
- `package.json` - Added jarvis-contacts to workspaces
- `tsconfig.json` - Added jarvis-contacts to project references

## Decisions Made
- tsdav createVCard uses `vCardString` parameter (not `data`) in ^2.1.8 -- discovered during build
- Same MAILBOX credentials as email plugin (shared mailbox.org account for CardDAV)
- vCard parsing uses regex with line unfolding for RFC 6350 compliance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createVCard API parameter name**
- **Found during:** Task 2 (TypeScript build)
- **Issue:** Plan specified `data` property for createVCard, but tsdav ^2.1.8 uses `vCardString`
- **Fix:** Changed `data: vcardData` to `vCardString: vcardData` in backend.ts, updated test mocks
- **Files modified:** packages/jarvis-contacts/src/backend.ts, packages/jarvis-contacts/src/backend.test.ts
- **Verification:** Build passes, all 24 tests pass
- **Committed in:** 1796871 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** API parameter name correction. No scope creep.

## Issues Encountered
- vitest mock constructors require `function` syntax (not arrow functions) when used with `new` -- converted all DAVClient.mockImplementation to use named function expressions

## User Setup Required
None - no external service configuration required (uses same MAILBOX credentials as email plugin).

## Next Phase Readiness
- Contacts plugin ready for standalone use as Claude Code plugin
- Ready for daemon integration in Phase 3
- CardDAV pattern validated alongside CalDAV (same tsdav library)

---
*Phase: 02-remaining-tools*
*Completed: 2026-03-31*
