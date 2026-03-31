# Technology Stack

**Project:** Jarvis TypeScript Redesign
**Researched:** 2026-03-31

## Recommended Stack

### Core Runtime & Language

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | 5.7+ | Language | Claude Code plugin ecosystem is TS-native. All MCP SDK examples are TypeScript. No viable alternative for this project | HIGH |
| Node.js | 22 LTS | Runtime | LTS channel, required for native `--env-file` support, stable ESM | HIGH |
| tsx | latest | Dev runner | 25x faster than ts-node, zero config, native ESM support. Use for development; compile to JS for production | HIGH |

### MCP Server Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @modelcontextprotocol/sdk | ^1.28.0 | MCP server creation | Official SDK. Provides `McpServer`, `StdioServerTransport`, tool registration with Zod schemas. v1.x is production-stable; v2 expected Q1 2026 but v1 will get 6+ months of maintenance after | HIGH |
| zod | ^3.25.0 | Schema validation | Required peer dependency of MCP SDK. SDK imports from `zod/v4` internally but is backwards-compatible with 3.25+. Pin to `^3.25.0` to avoid Zod v4 compatibility edge cases with MCP tooling | HIGH |

**MCP Server Pattern (verified from SDK docs):**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "jarvis-email", version: "1.0.0" });

server.registerTool("list_unread", {
  description: "List unread emails",
  inputSchema: z.object({ limit: z.number().optional() }),
}, async ({ limit }) => {
  const emails = await backend.listUnread(limit);
  return { content: [{ type: "text", text: JSON.stringify(emails) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Libraries (Domain-Specific)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| imapflow | ^1.2.9 | IMAP email | Modern, streaming, production-ready. Built-in TypeScript types. Active maintenance (last release Feb 2026). Connection-per-operation pattern maps directly from Python version. No serious competitor in the TS IMAP space | HIGH |
| tsdav | ^2.1.8 | CalDAV + CardDAV | Single library covers both calendar and contacts protocols. TypeScript-native. Tested with multiple cloud providers including mailbox.org-compatible servers. Last release March 2026, actively maintained | HIGH |
| ynab | ^4.0.0 | YNAB budget API | Official SDK from YNAB. TypeScript-native. v4.0.0 released March 2026. No third-party alternative needed or wanted | HIGH |

### Daemon Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| telegraf | ^4.16.3 | Telegram bot | Battle-tested (537 npm dependents), handler-based architecture maps to Python aiogram patterns. TypeScript support built-in. Last publish was 2 years ago but the API is stable and feature-complete for Bot API | MEDIUM |
| croner | ^10.0.1 | Cron scheduling | Use INSTEAD of node-cron. TypeScript-native (no @types needed), zero dependencies, handles DST/timezone/leap year edge cases, provides next-run-time API, supports async handlers. node-cron's @types are 2 years stale and it lacks timezone handling | HIGH |
| better-sqlite3 | ^12.8.0 | State persistence | Synchronous API is simpler for daemon (ledger, breakers, chat history). Fastest SQLite binding for Node.js. 5288 npm dependents. Actively maintained (March 2026 release). Requires `@types/better-sqlite3` for TS | HIGH |

### Build & Dev Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| vitest | ^4.1.2 | Testing | 5-28x faster than Jest, native TypeScript/ESM support, zero config. Jest-compatible API makes it easy. De facto standard for new TS projects in 2026 | HIGH |
| Biome | latest | Lint + format | Replaces both ESLint and Prettier. 20-100x faster, single tool, TypeScript-aware with type inference (since v2). Zero dependencies. 97% Prettier-compatible output | HIGH |
| tsup | latest | Build/bundle | esbuild-powered bundler for TypeScript libraries. Produces CJS and ESM outputs. Simpler than raw esbuild config, designed for library/CLI packaging | HIGH |

### Environment & Config

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js `--env-file` | built-in | .env loading | Node 22 LTS has native `--env-file .env` flag. No dotenv dependency needed for the daemon. For MCP servers spawned by Claude Code, env vars come from plugin.json `env` block | HIGH |
| yaml | ^2.x | heartbeat.yaml parsing | Standard YAML parser for Node.js. Needed to read the heartbeat task schedule | HIGH |

### Monorepo Structure

**Do NOT use Turborepo, Nx, or Lerna.** This is a Claude Code plugins repo, not a traditional monorepo. The existing plugin structure uses flat directories with independent `.claude-plugin/plugin.json` manifests. Each tool plugin is a self-contained directory.

For shared code between tool plugins (types, utils), use TypeScript path aliases or a local `packages/shared` directory with npm workspaces if needed. Start without workspaces; add only if shared code emerges.

**Package manager: npm.** The existing repo has no package manager lock files. npm is the simplest choice for a repo that primarily contains Claude Code plugins (markdown + config), with a few TypeScript packages added. pnpm is better for large monorepos but adds complexity Paul doesn't need here.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Cron scheduler | croner | node-cron | node-cron lacks built-in TS types (stale @types), no timezone handling, no next-run-time API, no DST handling |
| Cron scheduler | croner | cron (kelektiv) | More complex API, less TypeScript-native |
| Testing | vitest | jest | Jest requires ts-jest or babel config for TypeScript, slower cold starts (5-28x), ESM support still requires flags |
| Lint/format | Biome | ESLint + Prettier | Two tools instead of one, 20-100x slower, complex config with flat config migration, plugin ecosystem overhead |
| SQLite | better-sqlite3 | drizzle-orm + better-sqlite3 | ORM is overkill for simple ledger/breaker/history tables. Raw SQL with better-sqlite3 is clearer for this use case |
| TS runner | tsx | ts-node | 25x slower startup, complex ESM config, requires explicit `--esm` flag |
| TS runner | tsx | Bun | Bun is fast but has incomplete Node.js API compatibility. better-sqlite3 native addon may not work. Stick with Node.js for production daemon |
| IMAP | imapflow | imap (deprecated) | Old callback-based API, no TypeScript types, unmaintained |
| CalDAV | tsdav | ts-caldav | Much smaller community (new package), less battle-tested than tsdav |
| Telegram | telegraf | grammy | grammY is newer and arguably better-designed, but telegraf has larger community and Paul's Python codebase used aiogram which maps more naturally to telegraf's handler patterns |
| Env loading | Node.js native | dotenv/dotenvx | Node 22 `--env-file` eliminates the dependency entirely for simple .env loading |
| Schema validation | zod | typescript-is / io-ts | Zod is required by MCP SDK. Using anything else means two validation libraries |
| Monorepo | flat + npm | pnpm workspaces + turborepo | Over-engineered for a plugins repo with 5-6 TypeScript packages. Add later if needed |

## Claude Code Plugin Structure

Based on the existing plugins in the repo (scribe, kg, forge, etc.), plugins use this manifest:

```json
// .claude-plugin/plugin.json
{
  "name": "jarvis-email",
  "version": "1.0.0",
  "description": "IMAP email tools for Jarvis",
  "author": { "name": "Paul", "email": "paul@jschulz.org" },
  "license": "MIT",
  "keywords": ["email", "imap", "jarvis"]
}
```

For MCP server plugins, the plugin.json likely needs an `mcp` field pointing to the server entry point. The MCP server runs as a stdio process spawned by Claude Code.

**IMPORTANT NOTE (MEDIUM confidence):** The exact Claude Code plugin.json schema for MCP server declarations is not fully documented in public sources. The existing plugins in the repo are command/skill-based (markdown), not MCP servers. The first tool plugin (jarvis-email) will need to validate the plugin.json MCP integration pattern. This is a research gap that Phase 1 must resolve early.

## Installation

```bash
# Core MCP SDK + validation
npm install @modelcontextprotocol/sdk zod

# Tool libraries
npm install imapflow tsdav ynab

# Daemon libraries
npm install telegraf croner better-sqlite3 yaml

# TypeScript types (for libraries without built-in types)
npm install -D @types/better-sqlite3

# Build & dev tooling
npm install -D typescript tsx tsup vitest @biomejs/biome
```

## TypeScript Configuration

```jsonc
// tsconfig.json (base)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  }
}
```

Use `"module": "Node16"` (not `"ESNext"`) for proper Node.js ESM resolution with `.js` extensions in imports.

## Version Pinning Strategy

Pin major versions (`^`) for all dependencies. The MCP SDK is the most volatile dependency -- v2 is coming. When it ships:
- v1.x gets 6+ months of maintenance
- Migration can happen per-plugin, not all at once
- Zod peer dependency may shift; watch for breaking changes

## Sources

- [imapflow on npm](https://www.npmjs.com/package/imapflow) - v1.2.9, active maintenance
- [tsdav on npm](https://www.npmjs.com/package/tsdav) - v2.1.8, active maintenance
- [tsdav on GitHub](https://github.com/natelindev/tsdav) - WebDAV/CalDAV/CardDAV client
- [ynab on npm](https://www.npmjs.com/package/ynab) - v4.0.0, official SDK
- [telegraf on npm](https://www.npmjs.com/package/telegraf) - v4.16.3, stable
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - v1.28.0
- [MCP TypeScript SDK server docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) - McpServer API
- [better-sqlite3 on npm](https://www.npmjs.com/package/better-sqlite3) - v12.8.0
- [croner on npm](https://www.npmjs.com/package/croner) - v10.0.1, zero dependencies, TS-native
- [vitest on npm](https://www.npmjs.com/package/vitest) - v4.1.2
- [Biome](https://biomejs.dev/) - Rust-based linter + formatter
- [tsx on npm](https://www.npmjs.com/package/tsx) - esbuild-powered TS runner
- [PkgPulse: node-cron vs croner comparison](https://www.pkgpulse.com/blog/node-cron-vs-node-schedule-vs-croner-task-scheduling-nodejs-2026)
- [Zod v4 release notes](https://zod.dev/v4) - backwards-compatible with v3.25+
