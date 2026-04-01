<!-- GSD:project-start source:PROJECT.md -->
## Project

**Demiurge — Forge-to-GSD Integration Layer**

Integration modules that bring Forge's development discipline (5-layer decomposition, Point & Call gates, specialist agent routing, architecture validation) into GSD's project lifecycle. Not a new plugin — a set of GSD-compatible commands, workflows, and agents that extend GSD with Forge's unique capabilities while delegating project management, state tracking, and git integration to GSD natively.

**Core Value:** Forge's decomposition discipline (types-first, layer-ordered execution, 1-shot architecture tests) applied to GSD's phase execution — without maintaining a separate plugin or duplicating GSD's orchestration.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
