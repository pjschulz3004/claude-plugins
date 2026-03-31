---
phase: 01-foundation-email
plan: 01
subsystem: infra
tags: [typescript, npm-workspaces, monorepo, vitest, biome, circuit-breaker, credentials]

# Dependency graph
requires: []
provides:
  - npm workspaces monorepo scaffold with TypeScript project references
  - "@jarvis/shared package with types, credential loader, and circuit breaker"
  - Biome lint/format config for all packages
  - vitest test infrastructure for workspace-wide testing
affects: [01-02, 01-03, all-future-packages]

# Tech tracking
tech-stack:
  added: [typescript 5.7+, vitest 4.1.2, biome 2.4.10, zod 3.25+, better-sqlite3 12.8+]
  patterns: [npm-workspaces, tsc-project-references, connection-per-operation-types, injectable-clock-pattern]

key-files:
  created:
    - package.json
    - tsconfig.json
    - biome.json
    - vitest.config.ts
    - packages/jarvis-shared/package.json
    - packages/jarvis-shared/tsconfig.json
    - packages/jarvis-shared/src/types.ts
    - packages/jarvis-shared/src/credentials.ts
    - packages/jarvis-shared/src/circuit-breaker.ts
    - packages/jarvis-shared/src/index.ts
    - packages/jarvis-shared/src/types.test.ts
    - packages/jarvis-shared/src/credentials.test.ts
    - packages/jarvis-shared/src/circuit-breaker.test.ts
    - .gitignore
  modified: []

key-decisions:
  - "Root tsconfig only references jarvis-shared (not yet-created packages) to avoid build errors"
  - "Biome VCS disabled because .git is on VPS not local (Mutagen excludes .git)"
  - "Biome files.includes targets src/package.json/tsconfig.json to exclude dist/ from checks"
  - "CircuitBreaker accepts injectable nowFn for deterministic time-based tests"

patterns-established:
  - "TDD flow: write failing tests, implement, verify green, biome fix, commit"
  - "Biome auto-fix for import ordering and formatting after implementation"
  - "Git operations via SSH to VPS (ssh paul@188.245.108.247)"
  - "npm workspaces with tsc --build for incremental compilation"

requirements-completed: [MONO-01, MONO-02, MONO-03, MONO-04, MONO-05]

# Metrics
duration: 4min
completed: 2026-03-31
---

# Phase 1 Plan 01: Monorepo Scaffold and jarvis-shared Summary

**npm workspaces monorepo with TypeScript project references, Biome linting, vitest testing, and @jarvis/shared package exporting types, credential loader, and circuit breaker**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T12:14:57Z
- **Completed:** 2026-03-31T12:19:17Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Working npm workspaces monorepo with `tsc --build` compiling jarvis-shared to dist/
- @jarvis/shared exports: ToolResult, CredentialConfig, BreakerState, BreakerConfig, LedgerEntry, toolResult, LedgerEntrySchema, loadCredentials, requireCredentials, CircuitBreaker
- 24 tests passing across 3 test suites (types, credentials, circuit-breaker)
- Biome lint and format checks pass on all package source code

## Task Commits

Each task was committed atomically:

1. **Task 1: Monorepo scaffold** - `ceebcc0` (feat)
2. **Task 2 RED: Failing tests** - `e038c6c` (test)
3. **Task 2 GREEN: Implementation** - `321835b` (feat)

## Files Created/Modified
- `package.json` - Root workspace config with npm workspaces and build/test/lint scripts
- `tsconfig.json` - Root TypeScript project references for `tsc --build`
- `biome.json` - Biome v2.4.10 lint+format (tabs, double quotes, semicolons)
- `vitest.config.ts` - Workspace-wide test discovery in packages/*/src/**/*.test.ts
- `.gitignore` - Excludes node_modules, dist, tsbuildinfo
- `packages/jarvis-shared/package.json` - @jarvis/shared package with zod and better-sqlite3 deps
- `packages/jarvis-shared/tsconfig.json` - Composite build config (nodenext, es2022, strict)
- `packages/jarvis-shared/src/types.ts` - ToolResult, CredentialConfig, BreakerState, LedgerEntry, BreakerConfig, toolResult, LedgerEntrySchema
- `packages/jarvis-shared/src/credentials.ts` - loadCredentials and requireCredentials functions
- `packages/jarvis-shared/src/circuit-breaker.ts` - CircuitBreaker class (3 failures, 60s cooldown, injectable clock)
- `packages/jarvis-shared/src/index.ts` - Re-exports all public API
- `packages/jarvis-shared/src/types.test.ts` - 8 tests for types and Zod schema
- `packages/jarvis-shared/src/credentials.test.ts` - 7 tests for credential loading
- `packages/jarvis-shared/src/circuit-breaker.test.ts` - 9 tests for state transitions

## Decisions Made
- Root tsconfig references only jarvis-shared (future packages added when created) to avoid TS5083 errors
- Biome VCS disabled because .git lives on VPS, not accessible locally via Mutagen
- Biome includes pattern targets src/ and config files to naturally exclude dist/ from checks
- CircuitBreaker uses injectable `nowFn` parameter for deterministic time-based testing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root tsconfig referenced non-existent packages**
- **Found during:** Task 1 (Monorepo scaffold)
- **Issue:** Plan specified jarvis-email and jarvis-daemon in root tsconfig references, but those packages don't exist yet, causing TS5083 build error
- **Fix:** Only reference jarvis-shared in root tsconfig; other packages will be added in their respective plans
- **Files modified:** tsconfig.json
- **Verification:** `npm run build` succeeds
- **Committed in:** ceebcc0

**2. [Rule 3 - Blocking] Biome VCS config fails without local .git**
- **Found during:** Task 1 (Monorepo scaffold)
- **Issue:** biome.json had `vcs.enabled: true` and `useIgnoreFile: true` but .git directory is only on VPS (Mutagen excludes it), causing Biome to error
- **Fix:** Disabled VCS in biome config, used `files.includes` pattern to target only source files
- **Files modified:** biome.json
- **Verification:** `npx biome check packages/` passes
- **Committed in:** ceebcc0

**3. [Rule 3 - Blocking] Biome schema version mismatch**
- **Found during:** Task 1 (Monorepo scaffold)
- **Issue:** Plan specified biome schema 2.0.0 but installed version is 2.4.10, with different config keys (`ignore` renamed, schema URL different)
- **Fix:** Updated schema URL to 2.4.10 and used `files.includes` instead of deprecated `files.ignore`
- **Files modified:** biome.json
- **Verification:** `npx biome check packages/` passes
- **Committed in:** ceebcc0

---

**Total deviations:** 3 auto-fixed (3 blocking issues)
**Impact on plan:** All auto-fixes necessary for build/lint tooling to function. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None - all exports are fully implemented with real logic.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo scaffold ready for jarvis-email (Plan 01-02) and jarvis-daemon (Plan 01-03)
- @jarvis/shared importable as workspace dependency via `"@jarvis/shared": "*"` in sibling package.json
- Future packages need their tsconfig.json path added to root tsconfig.json references array

## Self-Check: PASSED

- All 14 created files verified present on disk
- All 3 commits verified in git log (ceebcc0, e038c6c, 321835b)

---
*Phase: 01-foundation-email*
*Completed: 2026-03-31*
