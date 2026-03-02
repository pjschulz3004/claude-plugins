# AI Detection: Voice & Interiority

Reference for the Voice Detector agent. Focus: metaphor quality, voice authenticity, interiority, show-don't-tell.

## Metaphor Patterns

### Cliche Clusters
AI defaults to the most statistically probable metaphor mappings:
- Light/dark for knowledge/ignorance
- Water for emotion ("wave", "flood", "tide")
- Weight/gravity for responsibility ("weight of", "burden of")
- Fabric for society ("fabric of", "tapestry of", "threads of")
- Journey for any process ("embarked on", "navigated")
- Fire for passion ("ignited", "sparked", "blazed")
- Music for harmony/discord ("symphony of", "cacophony of")

Test: is this the first comparison that comes to mind? If yes, probably cliche.
Fix: push to second or third association. Ground in character's knowledge domain.

### Metaphorical Pile-ups
Multiple unrelated metaphors stacked in a single passage. Each serviceable alone, collectively incoherent.
Human writers develop ONE metaphor with precision (Baldwin's "block of ice").
AI generates multiple because each scores as "literary" independently.
Fix: one metaphor per moment. Develop it. 2-3 motifs per scene max.

### Meaningless "Deep" Metaphors
Sound literary but don't resolve to clear image or meaning.
Test every metaphor with Fit/Map/Use:
- **Fit**: Does the vehicle belong in this character's world?
- **Map**: Do comparison details actually correspond?
- **Use**: Does it reveal something plain language couldn't?
If any test fails, cut or recast.

### Density Target
AI: 8-12+ metaphors/similes per 1000 words.
Human target: 3-5 per 1000 words (roughly 1 per 200-300 words).
Max 1 per paragraph, placed on turning points.

## Voice and Interiority

### Pronoun Deficit (Immersion Killer)
AI uses fewer personal pronouns, especially first-person ("I", "me", "my").
Directly correlates with reduced reader immersion (Nature 2025).
In first-person POV: narrator's subjectivity must be present in every paragraph.
Not "the room was dark" but "I couldn't see three feet in front of me."

### Register Oscillation
AI shifts between formal/academic and forced-casual in the same passage.
Human voices maintain consistent register (or shift deliberately under stress).
Fix: lock each character's register. Map register to character and maintain it.
Check: does the narrator's vocabulary stay consistent across the chapter?

### Emotional Flatness / Positive Bias
AI defaults to positive tone. RLHF trains toward "helpful and harmless."
Even in dark scenes, AI trends toward hope, redemption, silver linings.
Fix: let characters be ugly, bitter, petty, wrong. Don't balance every negative with positive.

### Character Voice Differentiation
AI produces all characters from a single probability distribution. Same vocabulary, sentence structure, emotional register.
Fix: each character needs a verbal fingerprint (vocabulary range, sentence length, verbal tics, topics avoided).
Test: swap dialogue attribution. If nobody notices, voices aren't differentiated.

### Omniscient POV Slips
In limited/first-person: narrator knows things they shouldn't. Describes others' internal states as fact. Reports information from scenes they weren't in.
Fix: for every piece of narration, ask: how does the POV character know this?
If they can't know it: cut, or convert to speculation ("She looked like she was about to..." not "She was about to...").

## Show-Don't-Tell Failures

### Emotional Labeling
"She felt sad." "He was angry." "A sense of dread settled over the room."
AI names emotions because it can't access the physical substrate.
Fix: delete every emotional label. Write the physical sensation, behavioral change, or environmental detail.

### Exposed Subtext
AI embeds explicit thematic statements that should remain subtextual.
If the outline says "Adelia misses her grandmother," AI writes "Adelia missed her grandmother terribly."
Fix: delete direct statements of theme, emotion, relationship. Replace with action, dialogue, detail that imply.

### Dossier-Style Assessment
Characters described through clinical labels: "She was intelligent and resourceful."
Fix: never describe traits. Show them. "Intelligent" becomes a scene where she solves a problem.

## The Uncanny Valley Mechanism

### Technical Competence Without Intentionality
Details feel random, not drawn to deepen character or resonate with theme.
Metaphors don't build a coherent field. Symbols don't connect. Everything technically accomplished but thematically inert.
Diagnostic: can you locate a reasoning mind behind the text?

### Fluency Without Understanding
Well-formed sentences that communicate minimal substantive content. Smooth but empty.
Diagnostic: does this passage advance character, plot, or theme? If not, it's filler wearing a tuxedo.

### Missing Epistemic Fingerprint
Human text: partial, situated, learning-in-progress mind.
AI text: optimization target.
Diagnostic questions:
- Does the text show learning, confusion, or revision?
- Does the narrator have knowledge gaps?
- Is there a visible reason why THIS narrator tells THIS story?

## Scoring Template

Per scene assessment:
| Pattern | Count/Rating | Target | Status |
|---------|-------------|--------|--------|
| Cliche metaphors | __ | 0 | __ |
| Metaphor pile-ups | __ | 0 | __ |
| Failed Fit/Map/Use | __ | 0 | __ |
| Total metaphors/1000w | __ | 3-5 | __ |
| Emotional labels | __ | 0-1 | __ |
| Exposed subtext | __ | 0 | __ |
| Dossier assessments | __ | 0 | __ |
| POV slips | __ | 0 | __ |
| Register breaks | __ | 0 | __ |
| Pronoun presence | low/ok/good | good | __ |
| Voice authenticity | 1-5 scale | 4+ | __ |

## Also Watch For (overlap with other agents)
- Vocabulary Tier 1/2/3: see Language agent
- Contrastive frames, tricolons: see Structure agent
- Participial clause density, burstiness: see Language agent
