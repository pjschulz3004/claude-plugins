---
phase: 02-remaining-tools
plan: 01
subsystem: calendar
tags: [caldav, tsdav, vtodo, vevent, icalendar, mcp]

requires:
  - phase: 01-foundation-email
    provides: "@jarvis/shared credentials module, monorepo structure, plugin pattern"
provides:
  - "@jarvis/calendar package with CalDAV backend"
  - "4 MCP tools: list_events, list_todos, create_event, complete_todo"
  - "iCalendar VEVENT/VTODO parsing utilities"
  - "/jarvis-calendar:today command"
affects: [jarvis-core, daemon-heartbeat]

tech-stack:
  added: [tsdav]
  patterns: [connection-per-operation CalDAV, iCalendar parsing, DATE vs DATE-TIME handling]

key-files:
  created:
    - packages/jarvis-calendar/src/types.ts
    - packages/jarvis-calendar/src/backend.ts
    - packages/jarvis-calendar/src/mcp-server.ts
    - packages/jarvis-calendar/src/index.ts
    - packages/jarvis-calendar/.claude-plugin/plugin.json
    - packages/jarvis-calendar/.mcp.json
    - packages/jarvis-calendar/commands/today.md
    - packages/jarvis-calendar/src/types.test.ts
    - packages/jarvis-calendar/src/backend.test.ts
  modified:
    - tsconfig.json

key-decisions:
  - "tsdav ^2.1.8 (latest available, plan specified ^2.2.0 which doesn't exist)"
  - "Reuse MAILBOX credentials prefix (same mailbox.org account for email and CalDAV)"
  - "iCalendar parsing done with regex rather than a full ical parser library (sufficient for VEVENT/VTODO)"

patterns-established:
  - "CalDAV connection-per-operation: new DAVClient + login() per method call, matching IMAP pattern"
  - "iCalendar property extraction via regex with param-aware parsing (DTSTART;VALUE=DATE:20260401)"

requirements-completed: [CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07]

duration: 7min
completed: 2026-03-31
---

# Phase 02 Plan 01: Calendar Plugin Summary

**CalDAV calendar/todo management via tsdav with 4 MCP tools, iCalendar parsing, and /jarvis-calendar:today command**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-31T13:19:56Z
- **Completed:** 2026-03-31T13:26:26Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- TsdavCalendarBackend with connection-per-operation pattern and retry logic for transient errors
- 4 MCP tools: list_events, list_todos, create_event, complete_todo
- iCalendar VEVENT/VTODO parsing supporting both DATE and DATE-TIME formats
- Plugin manifest with MAILBOX userConfig and SessionStart hook for auto-install
- 32 tests passing (20 type schema + 12 backend with mocked tsdav)

## Task Commits

Each task was committed atomically:

1. **Task 1: Calendar types and tsdav backend (TDD)** - `6f64021` (feat)
2. **Task 2: MCP server, plugin manifest, and /jarvis-calendar:today command** - `b1963a0` (feat)
3. **Root tsconfig update** - `2ce132d` (chore)

## Files Created/Modified
- `packages/jarvis-calendar/package.json` - Package config with tsdav, zod, MCP SDK dependencies
- `packages/jarvis-calendar/tsconfig.json` - TypeScript config with composite build
- `packages/jarvis-calendar/src/types.ts` - CalDAVConfig, CalendarEvent, CalendarTodo types + Zod schemas
- `packages/jarvis-calendar/src/backend.ts` - TsdavCalendarBackend with 4 CalDAV operations + retry
- `packages/jarvis-calendar/src/mcp-server.ts` - MCP server exposing 4 calendar tools via stdio
- `packages/jarvis-calendar/src/index.ts` - Re-exports for package consumers
- `packages/jarvis-calendar/src/types.test.ts` - 20 Zod schema validation tests
- `packages/jarvis-calendar/src/backend.test.ts` - 12 backend tests with mocked DAVClient
- `packages/jarvis-calendar/.claude-plugin/plugin.json` - Plugin manifest with userConfig
- `packages/jarvis-calendar/.mcp.json` - MCP server declaration
- `packages/jarvis-calendar/commands/today.md` - /jarvis-calendar:today slash command
- `tsconfig.json` - Added jarvis-calendar to root references

## Decisions Made
- Used tsdav ^2.1.8 (plan specified ^2.2.0 which does not exist on npm)
- Reused MAILBOX credentials prefix since CalDAV uses same mailbox.org account
- Built iCalendar parsing with regex rather than adding an ical parser library (keeps dependencies minimal, sufficient for VEVENT/VTODO)
- Used tsdav's `iCalString` param for createCalendarObject (not `data`) per actual API types
- Used `calendarObject` wrapper for updateCalendarObject per tsdav's actual type signature

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tsdav API type compatibility**
- **Found during:** Task 2 (Build step)
- **Issue:** Plan specified `data` param for createCalendarObject and flat params for updateCalendarObject, but tsdav types require `iCalString` and `calendarObject` wrapper respectively
- **Fix:** Used correct tsdav API: `iCalString` for create, `calendarObject: { url, etag, data }` for update
- **Files modified:** packages/jarvis-calendar/src/backend.ts, packages/jarvis-calendar/src/backend.test.ts
- **Verification:** TypeScript build passes clean, all tests pass
- **Committed in:** b1963a0

**2. [Rule 3 - Blocking] Fixed tsdav version**
- **Found during:** Task 1 (npm install)
- **Issue:** Plan specified tsdav ^2.2.0, but latest version is 2.1.8
- **Fix:** Changed to tsdav ^2.1.8
- **Files modified:** packages/jarvis-calendar/package.json
- **Verification:** npm install succeeds
- **Committed in:** 6f64021

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct tsdav integration. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None - all MCP tools are wired to real backend methods with full iCalendar parsing.

## User Setup Required
None - uses same JARVIS_MAILBOX_EMAIL and JARVIS_MAILBOX_PASSWORD as jarvis-email plugin.

## Next Phase Readiness
- Calendar plugin complete, ready for integration with jarvis-core daemon heartbeat
- Same credential set as email plugin (no additional secrets needed)

---
*Phase: 02-remaining-tools*
*Completed: 2026-03-31*
