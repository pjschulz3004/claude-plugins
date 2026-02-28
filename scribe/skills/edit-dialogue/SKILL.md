---
name: edit-dialogue
description: "Optional dialogue quality pass. Radio Test, subtext audit, power dynamic map, voice differentiation check, tag craft audit."
---

# Edit: Dialogue Audit

You are performing an optional dialogue quality pass. This is used for dialogue-heavy chapters or when dialogue feels flat. It is NOT a required pipeline stage; invoke it when a chapter's conversations need focused attention.

## Step 1: Load Context

Read:
1. **The chapter file**: Latest edited version (check for `edited-*` files, fall back to draft)
2. **Character files**: For all speaking characters in the chapter

Load references:
- `${CLAUDE_PLUGIN_ROOT}/references/dialogue-reference.md` — subtext, power dynamics, voice differentiation, tag craft, argument architecture
- `${CLAUDE_PLUGIN_ROOT}/references/character-voices.md` — project voice guide

### Knowledge Graph Lookup

For each speaking character:
1. `kg_search(query="[character] speech patterns voice personality", scope="au", limit=5)` — voice markers
2. `kg_search(query="[character] relationship with [other character]", scope="au", limit=5)` — relationship dynamics for each conversation pair

## Step 2: Extract All Dialogue

Pull all dialogue exchanges from the chapter:
- Group by conversation (which characters are talking, where the conversation starts and ends)
- Note the scene context for each conversation (location, what just happened, stakes)
- Count: total dialogue lines, lines per character, dialogue-to-narration ratio

## Step 3: Radio Test

Cover all dialogue tags and attribution. For each conversation:

- [ ] Can you identify each speaker by voice alone?
- [ ] What distinguishes Speaker A from Speaker B?

**Score each conversation**:
- **Pass**: Clearly distinct voices. You could assign speakers without tags.
- **Partial**: Mostly distinct, but 1-2 lines could belong to either speaker.
- **Fail**: Voices are interchangeable. Could swap speakers without the reader noticing.

For failures and partials, identify which voice axes need differentiation:
1. **Vocabulary**: Education, class, profession, jargon
2. **Sentence structure**: Short declaratives vs. long recursive vs. fragments vs. trailing
3. **Rhythm**: Staccato bursts vs. flowing periods
4. **Verbal tics**: Character-specific markers at emotionally significant moments
5. **Topics**: What they gravitate toward, what they avoid
6. **Formality/register**: How they shift between contexts

## Step 4: Subtext Audit

For each dialogue exchange:

- [ ] Is the character saying what they mean directly? (Direct = on the nose = weak)
- [ ] Identify the subtext: what do they actually mean?
- [ ] Score: what percentage of lines are oblique vs. direct?
- [ ] Target: >60% oblique. Flag conversations that are mostly direct.

Seven subtext techniques (from the reference):
1. **Contradiction**: Words say one thing, body does another
2. **Deflection**: Talks about something else while the real subject throbs underneath
3. **Answering a different question**: Every redirect is a confession about what they're actually thinking
4. **Over-formality**: Register mismatch as emotional armor
5. **The unsaid reply**: Silence as answer. Non-response is the loudest response
6. **Over-explanation**: Talking too much about something trivial. The volume is the tell
7. **Pinter pause**: Three levels of silence (ellipsis, pause, silence)

For each conversation, note which techniques are present and which are missing. Recommend specific techniques for lines that are too direct.

## Step 5: Power Dynamic Map

For each conversation:

- [ ] **Entry status**: Who has power entering the conversation? (Status, knowledge, position)
- [ ] **Status moves**: Track how each line raises or lowers status (self or other)
- [ ] **The flip**: At least one status reversal should occur per significant conversation
- [ ] **Exit status**: Who has power leaving? If unchanged from entry, the conversation may be static

Apply Johnstone's status framework:

**High-status markers**: Stillness, sustained eye contact, slow movement, finishing others' sentences, comfortable silence, taking up space, short declaratives, no hedging, using first names when others use titles.

**Low-status markers**: Rapid head movement, breaking eye contact first, laughing at own jokes, over-explaining, excessive nodding, occupying less space, fidgeting, hedging, qualifiers, trailing sentences, apologizing.

Power shifts through: information revealed, emotional vulnerability, physical position, moral authority, a skill the dominant character lacks.

Assign each character a status number (1-10) entering and exiting every scene. If the numbers don't change, the scene may lack dramatic movement.

## Step 6: Tag and Beat Craft

- [ ] **"Said"/"asked" for 90%+**: Flag ornate tags ("exclaimed," "mused," "retorted," "intoned")
- [ ] **Action beats over adverbs**: Flag "he said angrily" patterns. Replace with specific action beats
- [ ] **Beat specificity**: "Crossed his arms" tells nothing. "Stacking papers, aligning each edge with his thumbnail" tells everything
- [ ] **Cut unnecessary tags**: Where speaker is already clear from context or beat, the tag is dead weight
- [ ] **Beat placement check**:
  - Before dialogue = setup (grounds the speaker)
  - After dialogue = dimension (adds what words didn't carry)
  - Interrupting dialogue = tension (forces the reader to wait)
- [ ] **Floating dialogue**: Flag lines with no attribution or beat for 3+ consecutive exchanges (except in rapid two-person exchanges with distinct voices, where 5-8 unattributed lines are acceptable)

## Step 7: Argument Architecture

For conversations that are arguments or negotiations:

- [ ] **Legitimate positions**: Does each side have a real case? (Not a strawman for the other to demolish)
- [ ] **Escalation through revelation**: Does the argument escalate because new information surfaces, not because characters repeat themselves louder?
- [ ] **The turn**: Is there a moment where the argument shifts? One character says the unsayable. Quiet, precise, devastating.
- [ ] **Someone changed**: Does the argument end with someone altered (perspective shifted, relationship damaged, decision forced)? Not just someone defeated.
- [ ] **Surface trigger**: The argument should start small (a tone, a word choice, a logistical disagreement). The real issue surfaces through escalation, not declaration.
- [ ] **Regression under pressure**: Characters under emotional strain lose articulation. Shorter sentences, simpler vocabulary, repetition. Flag characters who become MORE eloquent as they get angry.

## Step 8: Group Conversation Check

For scenes with 3+ speakers:

- [ ] **Distinct roles**: Each character brings a different mode (one drives, one deflects with humor, one asks hard questions, one watches). If two characters serve the same function, one is redundant.
- [ ] **Silent characters**: Is anyone present but silent for too long? Either give them a line, note their silence as a meaningful beat, or remove them from the scene.
- [ ] **Traffic control**: Are speaker switches clear without excessive tags? Action beats ground each speaker in physical space.
- [ ] **The chorus effect**: Is the group functioning as a character itself? Group dynamics (who gets interrupted, who gets deferred to, who speaks last) reveal the social structure.
- [ ] **Hidden hierarchy**: Who controls the room? That determines who speaks first, who gets interrupted, who gets the last word.
- [ ] **Subgrouping**: Not everyone speaks simultaneously. Foreground/background layers. Side conversations. Physical clustering.

## Output Format

Present findings as a dialogue audit report, organized by conversation:

```markdown
### Conversation: [Characters] — [Scene/Location]

**Radio Test**: Pass / Partial / Fail
**Subtext Score**: X% oblique
**Power Dynamic**: [Character A] enters high (8), exits low (4). [Character B] enters low (3), exits high (7). Flip at: "[specific line]"

#### Issues Found

**[SUBTEXT] Line [N]**
**Current**: > [quoted dialogue]
**Problem**: On-the-nose. Character directly states their emotional position.
**Fix**: > [revised line using specific subtext technique]

**[TAG] Line [N]**
**Current**: > [quoted dialogue + tag]
**Problem**: Ornate tag / adverb tag / unnecessary attribution
**Fix**: > [revised with action beat or tag removed]
```

**Severity levels**:
- **Fix**: Dialogue fails its dramatic function (no subtext, voices indistinguishable, static power dynamic)
- **Polish**: Dialogue works but could be sharper (missed subtext opportunity, generic beat, slight voice drift)
- **Consider**: Alternative approach that might land harder

Present findings in batches (one conversation at a time) for author approval before proceeding to the next.
