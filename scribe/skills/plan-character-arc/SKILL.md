---
name: plan-character-arc
description: "Deep character arc planning: Ghost/Wound identification, Lie/Truth formulation, arc beat mapping, crisis decision design, and regression planning across one or multiple arcs."
---

# Plan Character Arc

You are helping the author plan a single character's arc in depth. This covers the full Ghost/Wound/Lie/Truth chain, arc type selection, beat mapping to specific chapters, crisis decision design, and regression planning. For multi-arc characters, each arc gets its own micro-cycle that compounds toward a macro-arc climax.

## Step 1: Load Context

Read these files (paths from `scribe.local.md`):
1. **Character file**: `{paths.characters}/original/` or `{paths.characters}/canon/` for the target character
2. **Character craft reference**: `{paths.references}/character-craft-reference.md`
3. **Story overview**: `{paths.context}/story-overview.md`
4. **Arc context files**: Read context files for every arc where this character appears

Query the knowledge graph for character relationships, power details, and AU-specific facts:
```
kg_search(query="[character name] relationships powers", scope="au", limit=10)
```

## Step 2: Identify the Character

Ask the author: **Which character? Across which arcs?**

If the character file exists, present current arc notes and any existing Lie/Truth notes. Summarize what's already established so the author sees the starting point.

If no character file exists, create a skeleton with sections for: Identity, Powers (if applicable), Ghost/Wound, Lie/Truth, Arc Trajectory, Relationships.

## Step 3: Ghost/Wound Chain

Map the full chain. Each element must be specific and articulable (one sentence, not a paragraph).

- **Ghost**: The formative event that created the wound. What happened before the story? This must be a concrete event, not a vague circumstance. "Her mother died and her father retreated into work" is specific. "She had a hard childhood" is useless.
- **Wound**: The psychological damage from the ghost. What belief does the wound create? The wound shapes how the character interprets every subsequent experience. It is the lens they cannot remove.
- **Lie**: The false belief the character holds because of the wound. State it as a proposition the character would defend if pressed. ("If I control everything, no one can hurt me." "I don't deserve help." "People always betray you.") The Lie must be **sympathetic**: born from real pain, not stupidity.
- **Truth**: What the character needs to learn. The opposite of the Lie, but nuanced (not a simple negation). The Truth should be something the character would resist if offered directly, because accepting it means confronting the Wound.
- **Want vs. Need**: What the character consciously pursues (Want, driven by the Lie) vs. what they actually need (Need, connected to the Truth). Drama lives in the gap between Want and Need.

Present the chain as:

```
Ghost → Wound → Lie → Want (driven by Lie) → Need (what would heal them)
```

Verify with the author. Adjust until the chain is tight. Every link must cause the next.

## Step 4: Arc Type Selection

Present the five arc types and guide the author to a selection:

| Type | Start | End | Engine |
|------|-------|-----|--------|
| **Positive Change** | Lie | Positive Truth | Character dismantles the Lie, embraces Truth at cost |
| **Disillusionment** | Comforting Lie | Bitter Truth | Truth is real but provides no comfort. Wiser but wounded |
| **Fall** | Lie | Worse Lie | Character encounters Truth, rejects it, doubles down. Tragedy is in the refusal |
| **Flat/Testing** | Truth | Truth (held) | Character's conviction transforms the world around them |
| **Corruption** | Truth | Lie | Character abandons Truth for power/safety/desire. Incremental compromise |

Key considerations:
- Different arcs of the story can use different types. A character might have a Positive Change arc in Arc 3 and a Corruption arc in Arc 7.
- **Flat arcs** carry tension through endurance: the world punishes the character for holding Truth. Best for stories about systemic change.
- **Fall arcs** require the reader to see the off-ramp the character drives past.
- **Corruption arcs** work through incremental moral compromise. No single step feels like villainy; the aggregate is monstrous.

Ask: "Which arc type fits this character's trajectory? Does the type shift across arcs?"

## Step 5: Arc Beat Mapping

Map the character's Lie/Truth journey to story percentages. Each beat must be translated to a specific chapter based on the arc/story structure.

| Story % | Beat | Function |
|---------|------|----------|
| 0-10% | Introduction | Show character living in the Lie. Demonstrate the wound indirectly |
| 12% | Inciting Incident | First challenge to the Lie. Can ignore it, but it plants a seed |
| 25% | First Act Turn | Forced into new situation where the Lie is tested |
| 37% | First Pinch | Lie is challenged directly. Character resists. Cost of resistance shown |
| 50% | Midpoint | Moment of Truth. Character glimpses what life without the Lie could be. Pivot from reactive to active |
| 62% | Second Pinch | Lie reasserts. Regression. Old patterns feel safe. But the cost is higher now |
| 75% | Third Act Turn | Cannot avoid the choice anymore. Lie vs. Truth, no middle ground |
| 88% | Crisis Decision | The defining moment. Character chooses (positive: Truth; negative: Lie) |
| 95-100% | Resolution | Living in the new state. Show the change (or the cost of refusing it) |

For each beat:
1. Calculate which chapter this percentage corresponds to
2. Write one sentence describing the beat in story terms (not abstract terms)
3. Note which other characters are present and how they relate to this beat

Present as a table with columns: Story %, Beat, Chapter, Description.

## Step 6: Crisis Decision Design

The most important beat in the entire arc. Design it with care.

**Five requirements:**
1. **Impossible choice**: Both options have real cost. Neither is clearly right. If the correct choice is obvious, the crisis has no teeth.
2. **Thematic resonance**: The choice dramatizes the story's central theme. The character's private decision answers the thematic question.
3. **Character-specific**: Only THIS character would face THIS choice in THIS way. Their specific Wound, Lie, and relationships create the unique configuration.
4. **Action, not declaration**: The character demonstrates the choice through behavior, not speech. The reader sees what they do, not what they say they believe.
5. **Irrevocability**: Once chosen, there is no going back. The decision permanently closes one door.

**Two crisis types:**
- **Prioritization**: Choose between competing values (loyalty vs. justice, individual vs. collective)
- **Irreconcilable Goods**: Two genuinely positive options that cannot coexist. More powerful because there is no "right answer"

Write the crisis decision as a paragraph: the situation, the choice, what each option costs, and what the character does.

## Step 7: Regression Planning

Characters do not change linearly. Plan moments where old patterns reassert.

**Rules for regression:**
- Every regression requires a **specific cause**: a pressure that triggers old patterns. Identify the trigger.
- Each regression should **cost more** than the last. The stakes of falling back increase as the character has more to lose.
- Regression makes the eventual change **more earned** (or the fall more tragic). Without it, growth feels effortless and therefore cheap.
- Never regress for no reason. That is not complexity; it is inconsistency.
- Regression must **reveal a new layer** of the Wound, not replay the old one. If the character rehearses the same doubt without visible progress, the arc feels stalled.

For each planned regression, note:
- **Trigger**: What pressure causes it?
- **Expression**: How does the old pattern manifest?
- **Cost**: What does the character lose by regressing?
- **New layer**: What does this regression reveal that previous ones did not?

## Step 8: Multi-Arc Character Evolution

If planning across multiple arcs, address each of these:

1. **Entry state per arc**: How does the character enter each arc differently? What did the previous arc change?
2. **Micro-arcs**: What is the smaller Lie/Truth cycle within each arc? Each arc should have its own internal question that connects to the macro-arc but can be resolved (or failed) independently.
3. **Compounding**: How do micro-arcs build toward the macro-arc climax? Each micro-resolution should make the final crisis both more inevitable and more difficult.
4. **Retrospective inevitability**: The character's final state should feel inevitable in retrospect but surprising in the moment. Work backward from the ending to verify the chain.

Present as a table: Arc, Entry State, Micro-Lie/Truth, Key Beat, Exit State.

## Step 9: Output

Write the character arc document with these sections:
1. **Ghost/Wound/Lie/Truth Chain** (the foundation)
2. **Arc Type** (per arc, if multiple)
3. **Beat Map** (table with chapter assignments)
4. **Crisis Decision** (paragraph form)
5. **Regression Points** (with triggers and costs)
6. **Multi-Arc Trajectory** (if applicable, table form)

Target: 120-150 lines.

Save the document to the character's file or as a companion document (ask the author for preference).

Update the knowledge graph with the arc plan:
```
kg_add_episode(content="[Character] arc plan: [Ghost/Wound/Lie/Truth summary]. Arc type: [type]. Crisis: [one-sentence crisis description]", group="union-au", source="user-input")
```

## Step 10: Suggest Next Step

Based on what was planned:
- If the character needs psychological depth for drafting, suggest `/scribe:character-psychologist [character]`
- If the arc plan affects story structure, suggest `/scribe:plan story` or `/scribe:plan arc [N]`
- If the character needs voice work for drafting, suggest `/scribe:voice [character]`
- If specific chapters need scene planning, suggest `/scribe:plan scenes [X.X]`

Update `scribe.local.md` if appropriate.
