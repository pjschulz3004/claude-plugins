---
name: "scribe:voice"
description: "Character voice quick-reference. Look up a character's speech patterns, verbal tics, and dialogue samples."
argument-hint: "[character-name]"
allowed-tools: ["Read", "Glob", "Grep"]
---

# /scribe:voice

Quick-reference lookup for character voice and speech patterns.

## Step 1: Read Project State

Read `scribe.local.md` for the characters path.

## Step 2: Find Character File

Search `{paths.characters}/` for the named character using Glob and Grep.
Also check for voice-specific files in `{paths.style_guides}/` (e.g., editing prompts, voice guides).

If no argument given, list available character files and ask which one.

## Step 3: Extract Voice Information

From the character file, extract and present:
- **Speech patterns**: Vocabulary, sentence structure, rhythm
- **Verbal tics**: Repeated words, hedge phrases, interjections
- **Dialogue samples**: Casual, under pressure, with authority
- **Subtext patterns**: Says X / Means Y
- **Physical tells**: Body language by emotional state

Also load `${CLAUDE_PLUGIN_ROOT}/references/character-voices.md` for the Radio Test checklist.

## Step 4: Present as Quick Reference

Format as a concise reference card the user can keep in mind while writing:

```
## [Character Name] — Voice Card
Vocabulary: [level and type]
Structure: [sentence patterns]
Rhythm: [pace and feel]
Tics: [3-5 markers]
Under pressure: [how speech changes]
Subtext: [key says/means patterns]
```

If multiple characters requested, present side-by-side for contrast.
