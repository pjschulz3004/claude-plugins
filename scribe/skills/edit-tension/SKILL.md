---
name: edit-tension
description: "Optional pacing and tension audit. Micro-tension density, compression/expansion mapping, nested question audit, time dilation, paradoxical pacing."
---

# Edit: Tension & Pacing Audit

You are performing an optional tension and pacing audit. This is used when a chapter feels flat, when pacing drags, or when the reader has no reason to keep reading. It is NOT a required pipeline stage; invoke it when a chapter's forward momentum needs diagnosis.

## Step 1: Load Context

Read:
1. **The chapter file**: Latest edited version (check for `edited-*` files, fall back to draft)

Load reference:
- `${CLAUDE_PLUGIN_ROOT}/references/tension-reference.md` — micro-tension, paradoxical pacing, nested questions, ratchet technique, compression/expansion, voice compression ladder

## Step 2: Micro-Tension Density Test (Maass)

Apply the Randomized Page Test. Select 5 points spread across the chapter (roughly evenly spaced, not all from action sequences):

For each point, answer:
- Is there tension? (Conflicting desires, unresolved questions, competing pressures)
- What specific competing forces create the tension?
- If there is no tension: what SHOULD the competing forces be?

**Score**:
- 5/5 = Excellent. Every page crackles.
- 4/5 = Good. One soft spot to address.
- 3/5 = Needs work. Multiple dead zones.
- 2/5 or below = Restructure. The chapter is coasting.

Remember: tension comes from internal conflict (competing desires), not from events. A character who fights while doubting the fight creates tension. A fight scene with no internal conflict is just choreography.

**Sources of micro-tension**:
- **Dialogue**: Friction between speakers, not events. Allies disagreeing > enemies threatening.
- **Action**: Emotions in conflict with the action that follows.
- **Interiority**: Conflicting emotions about the same event. Contrary word pairs.
- **Setting**: Environment that feels wrong > environment that feels dangerous.

## Step 3: Nested Question Audit

Map all active questions at each major point in the chapter:

- [ ] **Chapter-level question**: The big question the chapter asks. Must be identifiable in the opening pages and answered (or transformed) by the close.
- [ ] **Scene-level questions**: What's at stake in each scene. Each scene should have its own question, distinct from the chapter question.
- [ ] **Micro-questions**: Moment-to-moment uncertainty. "Will she answer?" "What's behind the door?" "Will he notice?"

**At any given point, 3-5 questions should be stacked.** Never drop below 2 active questions.

**Question types** (layer simultaneously):
- **Plot**: What happens next?
- **Mystery**: Why did this happen?
- **Emotional**: What do they feel about it?
- **Decision**: What will they do?
- **Thematic**: What does it mean?

**Flag "question deserts"**: Passages where no question is active. The reader has no reason to keep reading. These are the most dangerous dead zones in a chapter.

**Pull-and-release**: Questions should accumulate, resolve several at once in a burst, brief exhale, then immediately open new questions.

## Step 4: Compression/Expansion Mapping

Map the chapter's pacing rhythm section by section:

Mark each section (roughly per paragraph cluster or beat) as:
- **Compressed**: Fast. Action, summary, clipped sentences, time passes quickly.
- **Expanded**: Slow. Detail, intimacy, long sentences, time dilates.

Check for rhythm:
- [ ] Compression and expansion alternate. Neither dominates for long stretches.
- [ ] Flag: >500 words of unbroken compression (exhausting, the reader can't process).
- [ ] Flag: >500 words of unbroken expansion (dragging, the reader's attention wanders).

**Chapter type ratios**:
- Battle chapters: compression favored (3:1)
- Reflection/character chapters: expansion favored (1:2)
- Mixed chapters: roughly balanced (1:1) with variation

Produce a visual rhythm map:

```
Scene 1: [====---==--===] (= compressed, - expanded)
Scene 2: [--==---=====--]
Scene 3: [====-----------===]
```

This makes the pacing shape visible at a glance.

## Step 5: Ratchet Technique Check

Does tension only increase within sequences? The ratchet should never release prematurely.

Map tension level (1-10) at the start and end of each scene:

```
Scene 1: 3 → 5
Scene 2: 5 → 7
Scene 3: 6 → 9  (brief dip at start is acceptable after a peak)
Scene 4: 8 → 10
```

Rules:
- [ ] Each scene's ending tension should be >= its starting tension (preferably higher)
- [ ] Exception: deliberate tension drops after a major climax. These must be brief, and the next scene starts higher than the drop point.
- [ ] Flag: scenes where tension decreases from start to end without dramatic justification.
- [ ] Flag: scenes that start at the same tension level as the previous scene ended (plateau, no momentum).

### Escalation Strategies (check which are in use)
- **Bridge-burning**: Each attempt closes off a previous option. No going back.
- **Ally-costing**: Solving one problem sacrifices a resource needed later.
- **Leverage-handing**: Each fix gives the antagonist new information or advantage.
- **False respites**: Small wins punctuate losses (so the reader still believes victory is possible), but each respite introduces a new, worse problem.

## Step 6: Time Dilation Verification

Check that prose length matches emotional weight:

- [ ] Crisis moments should expand (more words per minute of story time). The most important decision gets the most prose real estate.
- [ ] Routine moments should compress (fewer words per minute). Walking to the building: efficient, clipped.
- [ ] The Lee Child principle: write the slow parts fast and the fast parts slow. Three pages for a half-second decision. Two sentences for a week of routine.

**Flag inversions**:
- Long passages on unimportant moments (the chapter spends 500 words on logistics that don't create tension)
- Rushed treatment of crucial moments (a pivotal decision resolved in a single paragraph when it deserves a full scene)
- Action that reads fast (reader races through, retains nothing) instead of slow (reader inhabits each moment)

## Step 7: Paradoxical Pacing Check

Check for Lee Child's insight: tension often comes from delay, not action.

- [ ] **The pause before the storm**: Before the most dramatic moment, is there a delay? A digression? A moment of quiet? Anticipation beats > surprise beats for sustained tension.
- [ ] **The gun under the table**: Does the reader know something the character doesn't? (Hitchcock's bomb.) The ordinary conversation becomes unbearable when the reader knows what's coming.
- [ ] **Information asymmetry**: Is it exploited?
  - Reader knows more than character = dread, dramatic irony, protective anxiety
  - Character knows more than reader = curiosity, trust in narrator's competence
  - Neither knows = authentic fear, helplessness
- [ ] **Partial information**: Enough to worry, not enough to understand. This generates maximum tension.
- [ ] **Pace contrast**: A 15,000-word battle at constant breakneck pace reads as zero pace. Impact requires contrast.

## Step 8: Voice Compression Ladder (if applicable)

For chapters with escalating tension, check that prose style tracks with tension level:

1. **Composed Analysis**: Full recursive sentences, parentheticals, qualifications, digressions. Normal operating voice.
2. **Clipped Efficiency**: Sentences shorten. Parentheticals become brief. Theory drops away. Qualifications thin.
3. **Sensory Fragments**: Verbs without subjects. Sensory data dominates. Analytical voice reduced to flashes.
4. **Present-Tense Survival**: Near-wordless. Single-word reactions. Intellect overwhelmed by body.
5. **Post-Event Numbness**: Voice returns slowly. Sentences rebuild, shakier, less certain.

- [ ] Does the prose style degrade as tension climbs?
- [ ] Does the transition from long to short mirror the shift from plan to action?
- [ ] After peak tension, does the voice recover gradually (not snap back to full composure)?

## Output Format

Present findings as a tension audit report:

```markdown
## Tension Audit: [Chapter Title]

### Micro-Tension Score: X/5
[Summary of which points passed/failed, what's missing at dead zones]

### Question Map
| Point | Active Questions | Count | Status |
|-------|-----------------|-------|--------|
| Opening | [list] | 4 | Good |
| Scene 1 mid | [list] | 2 | Borderline |
| Scene 2 open | [list] | 1 | DESERT |
| ... | ... | ... | ... |

### Compression/Expansion Rhythm
[Visual rhythm map]
[Flags for overlong stretches]

### Ratchet Analysis
[Scene-by-scene tension map with scores]
[Flags for drops or plateaus]

### Time Dilation Issues
[List of inversions: important moments rushed, unimportant moments expanded]

### Paradoxical Pacing
[Assessment of delay/anticipation usage]

### Priority Fixes (highest impact first)
1. [Most critical tension fix]
2. [Second most critical]
3. ...
```

**Severity levels**:
- **Fix**: Chapter loses the reader (question desert, extended tension drop, no micro-tension at random pages)
- **Polish**: Forward momentum exists but could be stronger (missed ratchet opportunity, compression/expansion imbalance)
- **Consider**: Alternative pacing approach that might create more dread or urgency
