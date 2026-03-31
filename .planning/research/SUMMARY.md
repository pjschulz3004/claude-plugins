# Research Summary: Jarvis TypeScript Redesign

**Domain:** Personal AI Assistant (TypeScript plugin constellation + daemon)
**Researched:** 2026-03-31
**Overall confidence:** HIGH

## Executive Summary

The TypeScript ecosystem for building MCP servers, Claude Code plugins, and a personal assistant daemon is mature and well-suited to this project. Every library proposed in the design spec (imapflow, tsdav, ynab, telegraf, better-sqlite3) is actively maintained with recent 2026 releases, has TypeScript support (most with built-in types), and has no serious competitors in its niche. The MCP TypeScript SDK (@modelcontextprotocol/sdk v1.28.0) provides a clean `McpServer` + `StdioServerTransport` API with Zod-based tool registration that maps directly to the backend interface pattern from the design spec.

The one significant research gap is the Claude Code plugin-to-MCP-server integration pattern. The existing plugins in the repo are command/skill-based (markdown files), not MCP servers. How exactly plugin.json declares an MCP server endpoint is not clearly documented in public sources. This must be validated in Phase 1 before building additional tools.

The recommended stack replaces node-cron with croner (TypeScript-native, zero deps, timezone/DST handling), replaces Jest with vitest (5-28x faster, native TS/ESM), and replaces ESLint+Prettier with Biome (20-100x faster, single tool). These are the consensus 2026 choices for new TypeScript projects. Node.js 22 LTS with native `--env-file` support eliminates dotenv as a dependency.

The architecture -- tool plugins as MCP servers importable by the daemon, daemon dispatching to claude -p, orchestrator plugin providing the personality layer -- is sound and maps cleanly to the researched technologies. No architectural changes are needed from the design spec.

## Key Findings

**Stack:** MCP SDK v1.28 + Zod 3.25+ | imapflow 1.2.9 | tsdav 2.1.8 | ynab 4.0.0 | telegraf 4.16.3 | croner 10.0.1 (not node-cron) | better-sqlite3 12.8.0 | vitest 4.1.2 | Biome

**Architecture:** Backend interface pattern -> MCP thin wrapper -> stdio transport. Daemon imports backends directly for simple queries, dispatches claude -p for intelligence. Connection-per-operation for all external services.

**Critical pitfall:** Zod version mismatch with MCP SDK. Pin `zod@^3.25.0`, do NOT use `zod@4.x` directly. And validate the plugin.json MCP integration before building multiple tools.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** - Prove the pattern with jarvis-email + daemon skeleton
   - Addresses: MCP server creation, plugin.json integration, claude -p dispatch, health endpoint
   - Avoids: Plugin MCP integration unknown (Pitfall #2) by validating early
   - Key risk: If plugin.json MCP pattern doesn't work as expected, discover it here with one tool, not five

2. **Remaining Tools** - jarvis-calendar, jarvis-contacts, jarvis-budget, jarvis-files
   - Addresses: All tool plugins following proven pattern from Phase 1
   - Avoids: Auth method confusion (Pitfall #6) by testing each service in isolation
   - Should be fast: pattern is proven, each tool is a backend + MCP wrapper

3. **Orchestrator** - Skills, agents, voice reference
   - Addresses: Unified assistant experience, triage skill, briefing synthesis
   - Depends on: All tool plugins existing (briefing needs calendar + email + budget)

4. **Telegram + Notifications** - Bot, relay, notification abstraction
   - Addresses: User-facing output, free-text conversation, /start handler
   - Avoids: Webhook complexity (use long polling)

5. **Intelligence** - Self-healing, self-improvement, knowledge graph
   - Addresses: Autonomous learning, error recovery, cross-domain memory
   - Avoids: Building intelligence before tools are stable (needs correction data)

6. **Cutover** - Shadow mode, comparison, decommission Python
   - Addresses: Safe transition with rollback capability

**Phase ordering rationale:**
- Phase 1 must come first to validate the core pattern (MCP server + plugin + claude -p dispatch)
- Phase 2 before Phase 3 because the orchestrator needs tools to orchestrate
- Phase 4 (Telegram) can potentially run in parallel with Phase 3 since it depends on daemon, not orchestrator
- Phase 5 last because self-improvement needs weeks of operational data

**Research flags for phases:**
- Phase 1: NEEDS deeper research on plugin.json MCP server declaration format
- Phase 1: NEEDS validation of claude -p JSON output format for dispatch parsing
- Phase 2: Standard patterns, unlikely to need research (tsdav and ynab are well-documented)
- Phase 5: Knowledge graph integration (Neo4j + Graphiti TS bindings) needs its own research spike

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified with npm, active maintenance, recent releases |
| Features | HIGH | Direct port from proven Python system with known requirements |
| Architecture | HIGH | Design spec is well-thought-out, patterns verified against SDK docs |
| Pitfalls | HIGH | Most pitfalls drawn from production Python experience + SDK docs |
| Plugin MCP integration | MEDIUM | Exact plugin.json schema for MCP servers not verified in public docs |
| claude -p dispatch | MEDIUM | JSON output format stability not guaranteed across CLI versions |

## Gaps to Address

- **Plugin.json MCP server declaration:** How does a Claude Code plugin declare that it provides an MCP server? This must be resolved in Phase 1 before building more tools. May require `claude mcp add` instead of plugin.json auto-discovery.
- **Neo4j + Graphiti TypeScript bindings:** The Python version uses Graphiti Python SDK. TypeScript equivalent needs research before Phase 5.
- **claude -p model selection:** Does `claude -p --model haiku` work with Max subscription? Model tiering per agent needs validation.
- **MCP SDK v2 migration path:** v2 is expected Q1 2026. If it ships during development, assess migration scope per-plugin.
