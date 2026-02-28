---
name: worldbuild-exposition
description: "Plan worldbuilding exposition delivery. Incluing, environmental storytelling, progressive revelation, Turkey City violations."
---

# Worldbuilding: Exposition Planning

You are planning how to reveal world information in a chapter without info-dumping. This skill applies incluing (Jo Walton), environmental storytelling, nested expertise, and progressive revelation to ensure world details serve the dramatic moment rather than lecturing the reader.

## Step 1: Load Context

Read:
1. **The chapter file**: Either the beats file (pre-draft) or latest edited version (post-draft)
2. **Relevant worldbuilding files**: From the project's `worldbuilding/` directory (factions, locations, world rules pertinent to this chapter)

### Knowledge Graph Lookup

Query the KG for world facts relevant to this chapter:
1. `kg_search(query="[location/faction/event in chapter] world details", scope="canon", limit=5)` — canon Worm facts
2. `kg_search(query="[location/faction/event in chapter] AU changes", scope="au", limit=5)` — Union-specific divergences
3. `kg_search(query="[power/technology/organization in chapter]", scope="all", limit=5)` — anything the chapter references that has established lore

## Step 2: Identify Exposition Needs

List all world information the reader needs for this chapter to land. For each item, classify:

| Information | Classification | Notes |
|-------------|---------------|-------|
| [fact] | **Essential** | Reader cannot follow the scene without this |
| [fact] | **Enriching** | Reader's experience deepens with this |
| [fact] | **Optional** | Interesting but not necessary |

**Prioritize**: Essential items must be delivered. Enriching items go where they fit naturally. Optional items earn their space only if they serve the dramatic moment (create tension, deepen character, or foreshadow).

For each Essential item, also note:
- Does the reader already know this from previous chapters?
- If yes, does it need reinforcement (complex detail, long gap since last mention)?
- If no, this is a first introduction and needs careful delivery.

## Step 3: Delivery Method Selection

For each piece of exposition, choose the delivery method that best fits the scene's dramatic needs:

| Method | Best For | Risk | Example |
|--------|----------|------|---------|
| **Incluing** (Jo Walton) | World details embedded in natural narration. Character uses a term casually; context clarifies meaning | Confusion if too subtle. Reader must be able to infer from surrounding context | "She triggered the containment foam, the pressurized canister hissing as gray sludge expanded to fill the doorway." (Function clear from action) |
| **Environmental storytelling** | Physical details that imply history or culture. A burned building says more than a paragraph of backstory | Too subtle if the reader doesn't know to look | Graffiti, architecture, damage patterns, what people carry, what's absent |
| **Character expertise** | Character explains to someone who genuinely doesn't know (newcomer, outsider, child, civilian) | "As you know, Bob" if the listener already knows | Works when the listening character has a genuine reason to ask, and the expert has a reason to explain NOW |
| **Conflict-driven** | Information revealed because characters argue about it or compete using it | Requires natural conflict context | Two characters disagree about how a power works; the argument reveals the rules |
| **Discovery** | POV character encounters something new and processes it through their own lens | Only works for genuinely new experiences | Taylor entering a new faction's territory, seeing how they've organized |
| **Contrast** | Compare this world to something the reader or character already understands | Breaks immersion if heavy-handed | "The PRT building looked like a bank that had been designed by someone who thought banks should be scarier." |
| **Document/artifact** | Letter, sign, broadcast, newspaper, phone notification that naturally contains information | Can feel like an excuse to dump exposition | Works when the document creates tension or reveals something the character wasn't supposed to see |

**Selection rules**:
- Never use the same method twice in a row for different facts.
- Incluing and environmental storytelling are the default. Other methods are for when these can't carry the weight.
- If you find yourself choosing "character expertise" for more than one item, check whether you're writing an "As you know, Bob" scene.

## Step 4: Turkey City Lexicon Check

Scan for common worldbuilding exposition failures:

- [ ] **"As you know, Bob"**: Characters telling each other things they already know. The test: would this character actually say this to this person in this moment?
- [ ] **"I've suffered a lot, Bob"**: Character monologuing their backstory. Backstory should leak through behavior, not narration.
- [ ] **Infodump**: Narration stopping the story to explain. If you can draw a line where the story pauses and the textbook begins, cut everything between those lines.
- [ ] **Incluing failure**: A world term used without enough context to infer meaning. The reader should be able to triangulate from the surrounding sentence, not need a glossary.
- [ ] **The maid and butler**: Two characters discussing their shared world for the reader's benefit. ("Isn't it terrible how the Endbringers have been attacking cities for twenty years?" "Yes, ever since Behemoth first appeared in 1992.")
- [ ] **Tour guide**: Character walks through a location while the narrator describes everything they see. Breaks deep POV. Characters don't mentally narrate familiar environments.
- [ ] **Pushback test**: Would the POV character naturally think about this information in this moment? If they've lived in Brockton Bay for years, they don't mentally explain what the Boardwalk is.

## Step 5: Progressive Revelation Plan

Design how information layers across multiple chapters (not just this one):

**Three-touch principle**:
1. **First mention**: Hint or partial reveal. The reader is curious but doesn't fully understand. A term used in passing, a detail noticed without explanation.
2. **Second mention**: More context. The reader starts to assemble the picture. A different angle on the same fact, or a consequence that illuminates.
3. **Full reveal**: Complete picture. The reader feels satisfied, not lectured. Often delivered through a dramatic moment where the full understanding matters.

Never reveal everything at once. Incomplete information creates questions. Questions create tension.

**For this chapter, map each exposition item**:
- Is this a first mention, second mention, or full reveal?
- If first mention: what's withheld? What question does the partial reveal create?
- If second mention: what new angle or consequence illuminates?
- If full reveal: does the dramatic moment require the reader to understand this NOW?
- What's the next chapter where this information will deepen?

## Step 6: Integration Check

For each piece of exposition in the chapter, verify:

- [ ] **Serves the dramatic moment**: The information matters to what's happening RIGHT NOW, not just to the reader's general education about the world.
- [ ] **Embedded in action, dialogue, or thought**: Not standalone narration. The information emerges through a character doing something, saying something, or processing something.
- [ ] **POV-appropriate**: The POV character is the right person to notice, know, or reveal this information. Taylor wouldn't explain union terminology to herself. She would use it naturally and the context would clarify.
- [ ] **Earns its space**: If the story could continue without this information, does the information create enough interest, tension, or texture to justify its presence?
- [ ] **No double-delivery**: The same fact isn't conveyed through both action and narration. Show OR tell. If a character's trembling hands reveal fear, don't also write "She was afraid."
- [ ] **Timing check**: Is this the latest possible moment to deliver this information? Exposition delivered too early is forgotten. Exposition delivered at the moment it matters is electric.

## Output Format

Present the exposition plan as a structured table followed by specific placement notes:

```markdown
## Exposition Plan: [Chapter Title]

### Information Inventory

| # | Information | Class | Method | Placement | Revelation Stage |
|---|-------------|-------|--------|-----------|-----------------|
| 1 | [fact] | Essential | Incluing | Scene 2, para 3 | First mention |
| 2 | [fact] | Essential | Conflict-driven | Scene 1, dialogue between X and Y | Full reveal |
| 3 | [fact] | Enriching | Environmental | Scene 3, opening description | Second mention |
| ... | ... | ... | ... | ... | ... |

### Placement Notes

**Item 1**: [How exactly this information integrates into the scene. What action/dialogue/thought carries it. Why this placement works.]

**Item 2**: [Same detail.]

### Turkey City Violations Found
- [List any current or potential violations with specific locations and fixes]

### Progressive Revelation Map
- [For first mentions: what's withheld and when it pays off]
- [For full reveals: what earlier setup makes this land]

### Unresolved Questions Created
- [New questions the chapter's exposition opens for later chapters]
```

**Severity levels for violations**:
- **Fix**: Active info-dump or "As you know, Bob." The story stops to lecture. Must be restructured.
- **Polish**: Exposition delivered through a weaker method than necessary (narration instead of action, direct instead of inclued).
- **Consider**: Alternative placement or method that might integrate more naturally.
