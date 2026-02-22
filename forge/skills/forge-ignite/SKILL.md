---
name: forge-ignite
description: This skill should be used when the user runs "/forge" in a new project, asks to "start a new project", "set up project foundation", "forge ignite", or needs guidance through foundation decisions before coding. Guides through SPEAK → EXPLORE → SHAPE DOMAIN → FIRST 1000 LINES with Point & Call discipline.
version: 0.1.0
---

# Forge IGNITE — Foundation Phase

The most critical phase. The first few thousand lines determine everything that follows. This phase forces System 2 thinking through a Point & Call discipline before any code gets written.

**Agents map patterns, you create them.** Do not let the agent create the architecture — guide the human to create it, then let agents implement it.

## Step 1: SPEAK

Force the human to articulate what they are building. Do not suggest solutions.

Ask these questions one at a time using AskUserQuestion:

1. "What are you building? Describe it in your own words."
2. "What is the input to this system? What is the output?"
3. "Who uses this and when?"

After receiving answers, ask: "Can you summarize this in 2-3 sentences?"

If the summary is vague, ask clarifying questions. Do not proceed until the problem is sharply defined.

**Point & Call:** Ask the user to state: "The system takes [X] as input and produces [Y] for [Z]."

Update `forge.local.md`: set `step: EXPLORE`, save the summary to `ignite.speak_summary`.

## Step 2: EXPLORE

Research before solutioning. Use agents for pattern-mapping tasks only.

1. If existing codebase: spawn `forge-researcher` subagent to explore structure
2. Research dependencies using context7 MCP or WebSearch
3. Invoke the `brainstorming` skill to generate 2-3 approaches with tradeoffs
4. Present approaches. Lead with recommendation and explain why.

**Critical:** Do NOT jump to planning yet. If the human asks for a plan prematurely, explain: "A premature plan will be subtly wrong and cost more time in reprompting. Define the approach first."

**Point & Call:** Ask the user to state: "I chose approach [A] because [reason]."

Update `forge.local.md`: set `step: SHAPE_DOMAIN`, save choice to `ignite.approach_chosen`.

## Step 3: SHAPE THE DOMAIN (Types-First Decomposition)

Decompose the solution into 5 layers. Review each layer before proceeding to the next. Problems in layer 1 cascade to everything below.

For the decomposition prompt template, read `references/decomposition-prompt.md`.

### Layer 1: Data Model / Types
- Define core types, interfaces, schemas
- This is usually tiny (10-50 lines) but shapes everything
- Review carefully — if there are hundreds of lines of types, something is wrong
- **Gate:** Present types to user. Ask: "Do these types correctly model your domain?"
- Update `forge.local.md`: set `ignite.data_model_approved: true`

### Layer 2: Pure Logic / Function Signatures
- Define function signatures: name, input type, output type
- Pure functions preferred — no side effects
- These signatures ARE the architecture
- **Gate:** Present signatures. Ask: "Do these interactions make sense?"
- Update `forge.local.md`: set `ignite.pure_logic_approved: true`

### Layer 3: Edge Logic / Boundaries
- Where does the system touch the outside world? (APIs, databases, file system)
- Minimize these boundaries. Scrutinize each one.
- **Gate:** Ask: "Are these boundaries minimal and well-defined?"
- Update `forge.local.md`: set `ignite.edge_logic_approved: true`

### Layer 4: UI Components (if applicable)
- Isolated from architecture decisions
- Can be screenshot-tested independently
- **Gate:** Ask: "Does this component structure make sense?"
- Update `forge.local.md`: set `ignite.ui_approved: true`

### Layer 5: Integration
- E2E flow: does the user's complete workflow work?
- Define acceptance criteria from the user's perspective
- **Gate:** Ask: "Do these acceptance criteria cover the core workflow?"
- Update `forge.local.md`: set `ignite.integration_approved: true`

## Step 4: FIRST 1000 LINES

Now code gets written. The foundation must be solid before features pile on.

1. Generate project structure (directories, config files, CLAUDE.md)
2. Ask user for project type to determine template:
   - `web-ts`: TypeScript, package.json, tsconfig, test config
   - `web-py`: Python, pyproject.toml, pytest config
   - `python`: Python CLI/library, pyproject.toml
   - `custom`: Minimal, just CLAUDE.md and git init
3. Write the data model types from Layer 1
4. Write the function signatures from Layer 2
5. Invoke TDD skill: write tests FIRST, then implementation
6. Invoke ralph-loop: iterate until code quality passes
7. Run code review on the foundation via forge-reviewer subagent

### The 1-Shot Prompt Test

**This is the quality gate.** Ask: "Describe a simple feature you'd want to add."

Then attempt to add it in a single prompt. If it works cleanly → foundation is solid. If it requires fighting the architecture → iterate on the foundation.

**Point & Call:** Ask the user to state: "I can add a feature in 1 shot. The foundation is solid."

Update `forge.local.md`: set `ignite.foundation_passed: true`, `phase: SHAPE`, `step: GSD_HANDOFF`.

## Phase Transition

When all gates pass, announce: "IGNITE complete. Foundation is solid. Transitioning to SHAPE phase."

Invoke the `forge-shape` skill to continue.
