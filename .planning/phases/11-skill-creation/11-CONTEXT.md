# Phase 11: Skill Creation — Context

## Decisions

- **D-01**: Gap detection queries the task ledger for "no tool available" patterns and chat history for recurring manual requests
- **D-02**: New skills follow the existing pattern: `packages/jarvis/skills/{name}/SKILL.md` + TypeScript MCP tool in `packages/jarvis/src/tools/`
- **D-03**: Staging branch pattern: `skill/{name}` (not main)
- **D-04**: GitHub PR created via `gh pr create` with description and test results
- **D-05**: This is primarily growth prompt instructions telling claude -p HOW to create skills, plus a SkillCreator helper class

## Deferred Ideas

- Skill deprecation and usage tracking (v3+)
- Cross-model verification for skill review (v3+)

## Claude's Discretion

- SKILL.md template content
- MCP tool scaffold template
- How many failure occurrences before flagging as a gap (default 3)

## Key Context

- Existing skills live in `packages/jarvis/skills/` (brief, filing, healing, improve, triage)
- Each skill has a `SKILL.md` describing procedure, triggers, tools used
- MCP tools are TypeScript files with Zod schemas
- Growth engine already has full Bash access for git operations and gh CLI
- Growth prompt already instructs on commit patterns
