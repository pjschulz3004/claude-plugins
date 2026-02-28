---
name: "scribe:character"
description: "Deep character analysis and arc planning. Routes to character-psychologist or plan-character-arc."
argument-hint: "[psychologist|arc] [character-name]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "AskUserQuestion", "mcp__kg__kg_search", "mcp__kg__kg_add_episode"]
---

# /scribe:character

You are running the Scribe character analysis pipeline. Your job is to route to the correct character skill.

## Step 1: Read Project State

Read the project's `scribe.local.md`. Extract current state and paths.

## Step 2: Parse the Argument

The user's argument determines the analysis type. Parse as: `[type] [character-name]`

| Type | What It Does |
|------|-------------|
| `psychologist` | Deep psychological analysis using behavioral frameworks (Cialdini, Ekman, Navarro, de Becker, Milgram, game theory) |
| `arc` | Character arc planning: Ghost/Wound/Lie/Truth, beat mapping, crisis decision design, regression planning |

If no type given, ask the user which they want.
If no character name given, ask the user which character.

## Step 3: Route to Skill

- `psychologist` → `scribe:character-psychologist`
- `arc` → `scribe:plan-character-arc`

Both skills will load the character file and relevant references automatically.
