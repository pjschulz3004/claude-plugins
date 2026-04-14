---
name: prep-case
description: Full City of Mist case prep from concept to Foundry. Use for /foundry:prep-case "<case name>". Orchestrates prep-npc, prep-scene, prep-sessionflow-case, prep-character-panel, link-references, and prep-markdown-handoff in dependency order — creates CoM threat actors with themes and tags, Foundry scenes with tokens, journal entries with cross-links, SessionFlow case shell with beats and scenes and widgets, and SessionFlow character panels. Manages the .foundry-prep/{case_slug}.json state file for upsert safety. Closes R13-R17 in one run. For single-NPC or single-scene work, use the sub-skills directly instead.
---

# /foundry:prep-case

Top-level orchestrator for City of Mist case prep. Takes a case concept (free text or
structured JSON) and drives the full pipeline: actor creation, scene creation, journal
creation, SessionFlow structural shell, character panels, cross-reference rewriting, and
Obsidian Bridge markdown staging.

This skill is a **workflow recipe**, not a script. Its body contains ZERO `execute_js`
templates — all Foundry writes are delegated to the six sub-skills that follow the recipe.
The orchestrator's job is to sequence those sub-skills in the correct dependency order,
manage the shared `.foundry-prep/{case_slug}.json` state file, and surface a coherent
summary to the user.

---

## When to Use

- The user says "prep case X" or "/foundry:prep-case <name>".
- The user provides a case concept (free text OR a JSON-shaped description with
  npcs/scenes/journals/sessionflow/character_panels).
- The user wants a re-run of an existing case to pick up new content (upsert-safe re-runs
  are always safe — every sub-skill has upsert-by-name semantics).

**Do NOT use** for single-NPC / single-scene iteration — invoke the relevant sub-skill
directly (`/foundry:prep-npc`, `/foundry:prep-scene`, etc.). Faster, fewer relay calls, no
state-file side effects.

---

## Case Concept Input Shape

The orchestrator accepts either free prose or this structured JSON:

```json
{
  "case_name": "Case 0 Session 2",
  "description": "Free-text case hook.",
  "npcs": [
    {
      "name": "Gremori",
      "type": "threat",
      "alias": "The Possession",
      "mythos": "Goetic Spirit",
      "logos": "Lisa's Body",
      "themes": [
        {
          "name": "Crown of Serenity",
          "subtype": "Mythos",
          "mystery": "What will I do when peace is broken?",
          "power_tags": [{ "name": "unshakable calm" }],
          "weakness_tags": [{ "name": "cannot raise my voice" }],
          "gm_moves": [{ "name": "Silence a protest", "subtype": "soft" }]
        }
      ]
    }
  ],
  "scenes": [
    {
      "name": "Späti (Night)",
      "slug_override": "spaeti",
      "variant": "night",
      "tokens": [{ "npc_name": "Gremori", "x": 1200, "y": 800 }]
    }
  ],
  "journals": [
    {
      "name": "Case 0 Notes",
      "pages": [{ "name": "Overview", "html": "<p>@NPC[Gremori] appeared at the Späti.</p>" }]
    }
  ],
  "sessionflow": {
    "beats": [
      {
        "title": "Landing",
        "text": "Players arrive at the Späti.",
        "scenes": [{ "title": "Späti (Night)", "template": "_storyteller" }]
      }
    ]
  },
  "character_panels": [
    { "npc_name": "Gremori", "template": "_dossier" }
  ]
}
```

If the user provides only free text, the orchestrator synthesizes this shape from the concept
plus any Wyrd Berlin context available. The synthesis MUST include all six top-level arrays.
If the user's input is ambiguous on NPC names or scene names, **ASK for clarification before
continuing**. Do NOT guess names — orphaned Foundry content from name typos is difficult to
clean up.

---

## Execution Recipe

### Step 1 — Parse the case concept

Parse `$ARGUMENTS` as the case name. Combine with any structured concept the user provided
in conversation context.

- Derive `case_slug` via the slugify rule documented in
  `skills/_shared/art-path-resolver/SKILL.md`.
- Validate that `npcs`, `scenes`, `sessionflow.beats`, and `character_panels` are all
  non-empty. If any are missing, synthesize them from the case concept prose OR ask the user
  which NPCs and scenes belong to this case.
- Do NOT proceed if `case_name` is empty.

### Step 2 — Read or create the state file

Path: `.foundry-prep/{case_slug}.json`

**Fresh run** (file does not exist): create it via the Write tool with the T-02 schema:

```
{
  "case_slug": "<slug>",
  "case_name": "<name>",
  "created_at": "<ISO timestamp>",
  "art_inventory": {},
  "npcs": [],
  "scenes": [],
  "journals": [],
  "sessionflow": { "session_id": null, "session_name": null, "beat_ids": {}, "scene_ids": {} },
  "character_panels": [],
  "uuid_placeholders_unresolved": [],
  "missing_art": { "npc": [], "scenes": [], "items": [] },
  "failures": []
}
```

**Re-run** (file exists): load it via the Read tool. Merge new NPC/scene/journal/beat entries
from the incoming case concept into the loaded state. Existing entries already in `state.npcs`,
`state.scenes`, `state.journals`, and `state.character_panels` are preserved — their Foundry
IDs remain valid and the sub-skills will upsert in place.

Use the Write/Edit tools to create or update the state file. Keep it valid JSON with 2-space
indent throughout the run.

### Step 3 — Precondition gate

Print to the user:

```
⚠ Before continuing: please CLOSE the SessionFlow panel in Foundry if it is open.
  Concurrent UI edits can clobber game.settings.set writes (Pitfall 3 — SessionFlow
  does not merge on concurrent writes).
  Press Enter to continue, or type "skip" if Foundry is not open.
```

Wait for user acknowledgment OR continue after a 3-second implicit pause if running
autonomously (YOLO mode).

### Step 4 — Run the one-shot art inventory scan

Run the inventory scan documented in `skills/_shared/art-path-resolver/SKILL.md` by passing
its script template through `execute_js`. This is ONE relay round-trip for the entire case —
do NOT do per-NPC or per-scene scans.

Capture the returned `{ inventory, npcRoots, sceneRoots }` JSON. Write `inventory` into
`state.art_inventory` in the state file.

Print: `✓ Art inventory: <N> paths scanned across <M> directories`

If `execute_js` returns an error (relay down, auth failure), STOP and surface the error to
the user. Do NOT continue without the inventory — downstream sub-skills depend on it for art
path resolution.

### Step 5 — Pass 1: Atomic object creation — NPCs

For each NPC in the case concept's `npcs[]`, invoke `/foundry:prep-npc` with the full NPC
data (name, type, alias, mythos, logos, themes, tags, moves, img_override if art exists in
the inventory).

**Re-run guard**: before invoking, check `state.npcs[]` for an entry with a matching
`input_name`. If found AND `foundry_actor_uuid` is non-null, the NPC already exists —
skip to the next NPC UNLESS the case concept contains updated themes/tags (in which case
re-invoke to update).

After each sub-skill completes:

1. Read the returned `{ id, name }` from prep-npc's output.
2. Append or update the entry in `state.npcs[]`:
   ```json
   {
     "input_name": "<name>",
     "slug": "<slug>",
     "foundry_actor_id": "<id>",
     "foundry_actor_uuid": "Actor.<id>",
     "img_path": "<resolved path or null>",
     "themes_count": <n>,
     "power_tags_count": <n>,
     "weakness_tags_count": <n>,
     "gm_moves_count": <n>
   }
   ```
3. Write the state file.
4. Print: `✓ NPC: <name> → Actor.<id>`

On sub-skill failure: record `{ "sub_skill": "prep-npc", "input": { "name": ... }, "error": "<message>", "timestamp": "<ISO>" }` in `state.failures[]`, print the error, and continue with the next NPC. A single NPC failure does NOT abort the run.

### Step 6 — Pass 1: Atomic object creation — Scenes

For each scene in `scenes[]`, invoke `/foundry:prep-scene` with the full scene data (name,
slug_override, variant, dimensions, tokens array).

**Re-run guard**: check `state.scenes[]` for a matching `input_name` with a non-null
`foundry_scene_uuid`. If found, skip unless the token list or background differs.

After each sub-skill completes:

1. Append or update the entry in `state.scenes[]` with the returned id + UUID.
2. Write the state file.
3. Print: `✓ Scene: <name> → Scene.<id>`

On failure: record in `state.failures[]` and continue.

### Step 7 — Pass 1: Atomic object creation — Journals

For each journal in `journals[]`, invoke the `create_journal` MCP tool directly (no
sub-skill for journals in Phase 4). Pass the journal name and pages with raw HTML including
`@NPC[...]` / `@SCENE[...]` placeholders — the actual `@UUID[...]` rewrite happens in
Step 11.

After each tool call:

1. Append or update the entry in `state.journals[]`:
   ```json
   {
     "name": "<journal name>",
     "foundry_journal_id": "<id>",
     "foundry_journal_uuid": "JournalEntry.<id>"
   }
   ```
2. Write the state file.
3. Print: `✓ Journal: <name> → JournalEntry.<id>`

On failure: record in `state.failures[]` and continue.

### Step 8 — Pass 2 precondition: verify UUID map is populated

At this point `state.npcs[]`, `state.scenes[]`, and `state.journals[]` should all have
non-null `foundry_*_uuid` entries. If any are still null (due to failures in Steps 5-7),
print a warning listing which entries are missing UUIDs and note that `link-references`
will leave the corresponding placeholders unresolved.

### Step 9 — SessionFlow structural layer

Invoke `/foundry:prep-sessionflow-case` with:

- `case_name` from state
- `case_slug` from state
- `beats[]` from the case concept (with `title`, `text`, `scenes[].title`, `scenes[].template`)
- `exalted_scene_ids: {}` (Phase 4 leaves this empty; Phase 4.5 will populate)

After completion, update `state.sessionflow`:

```json
{
  "session_id": "<returned id>",
  "session_name": "<case_name>",
  "beat_ids": { "<beat title>": "<id>", ... },
  "scene_ids": { "<scene title>": "<id>", ... }
}
```

Write the state file. Print: `✓ SessionFlow: Session.<session_id> — <n> beats, <m> scenes`

On failure: record in `state.failures[]` and continue. Character panels (Step 10) can still
be attempted even if prep-sessionflow-case fails — they use `sessionflow.characterData`
which is a separate storage key.

### Step 10 — Character panels layer

For each entry in `character_panels[]`, invoke `/foundry:prep-character-panel` with:

- `npc_name` (from entry)
- `template` (from entry)
- `foundry_actor_id` (from `state.npcs[]` matching `input_name = npc_name`)

If the actor_id is not found in state (e.g., the NPC creation failed in Step 5), skip this
panel and record the skip in `state.failures[]`.

After each sub-skill completes, append or update `state.character_panels[]`:

```json
{
  "npc_name": "<name>",
  "foundry_actor_id": "<id>",
  "es_char_id": "<ES character id>",
  "template": "<template name>",
  "widget_count": <n>
}
```

Write the state file. Print: `✓ Panel: <npc_name> (<template>) → ES char <es_char_id>`

### Step 11 — Pass 2: Cross-reference rewriting

Invoke `/foundry:link-references` with `case_slug`.

The skill reads the now-complete state file UUID map and rewrites all `@NPC[...]`,
`@SCENE[...]`, and `@JOURNAL[...]` placeholders in journals, scene widgets, and panel
widgets to real `@UUID[Actor.xxx]` / `@UUID[Scene.xxx]` / `@UUID[JournalEntry.xxx]`
references.

After completion, `state.uuid_placeholders_unresolved[]` is populated with anything that
could not be resolved (typically: NPCs or scenes whose creation failed in Pass 1).

### Step 12 — Markdown handoff

Invoke `/foundry:prep-markdown-handoff` with `case_slug`.

The skill writes `.md` files under `.foundry-prep/obsidian-staging/{case_slug}/` and prints
the R17 import instruction verbatim.

### Step 13 — Final summary

Print the consolidated run summary:

```
/foundry:prep-case "<case_name>" — COMPLETE

Pass 1 (Atomic Objects):
  NPCs:      <n> created/updated
  Scenes:    <n> created/updated
  Journals:  <n> created/updated
  Art inventory: <m> paths scanned

Layer 3 — SessionFlow:
  Session:  Session.<id>
  Beats:    <n>
  Scenes with widgets: <n>

Layer 4 — Character Panels:
  Panels populated: <n>
  ES character stubs created: <n>
  (Phase 4.5 will enrich with emotion portraits, hero poses, theme sounds)

Pass 2 — Cross-References:
  Rewrites:   <n>
  Unresolved: <n>
  <if unresolved > 0: list each @NPC[...]/@SCENE[...]/@JOURNAL[...] that remained>

Missing Art:
  npc:    <list or "none">
  scenes: <list or "none">
  items:  <list or "none">

Failures: <n>
  <if failures > 0: list each { sub_skill, input.name, error }>

<R17 handoff string from prep-markdown-handoff output — printed verbatim>

Closes: R13, R14, R15, R16, R17
Phase 2 deferred UAT items exercised by this run:
  1. list_actors filtered fields — verified by prep-npc Step 5
  2. create_actor idempotent upsert — verified by re-run stability
  3. place_token visible in Foundry — verified by prep-scene Step 4
  4. @UUID clickable cross-links — verified by link-references + Foundry UI click
  5. Windows cmd /c server startup — verified implicitly by running from Windows Claude Code
```

---

## Upsert / Re-Run Safety

Every sub-skill is upsert-safe by design (name/title is the upsert key). The state file is
the truth for "what we did last time":

- **Re-run with the same case concept**: all objects are updated in place via their upsert
  keys. No duplicates.
- **Re-run with a MODIFIED case concept** (e.g., an added NPC): the orchestrator creates the
  new NPC and skips the existing ones (re-run guard in Steps 5-6).
- **Re-run after partial failure**: objects that succeeded on the previous run are in
  `state.npcs[]` / `state.scenes[]` with non-null UUIDs. The orchestrator skips them and
  retries only the ones that failed.

**Duplicate-embedding pitfall**: `create_actor` re-embeds theme/tag/move items on every
invocation. The re-run guard in Step 5 prevents this by skipping NPC sub-skill calls when
the NPC's UUID is already in state and no theme changes are present.

---

## Failure Recovery

Sub-skill failures are isolated — they do NOT abort the orchestrator:

1. The orchestrator records every failure in `state.failures[]` with
   `{ sub_skill, input, error, timestamp }`.
2. Execution continues with the remaining steps where possible (e.g., a `prep-scene` failure
   does not block `prep-sessionflow-case` for unrelated scenes).
3. `link-references` will surface unresolved placeholders caused by upstream failures in its
   own output.
4. The state file is persistent. Re-running the orchestrator after a partial failure picks up
   from the last known-good state.

The ONLY hard stop is a relay-down or auth error during the art inventory scan (Step 4) —
all sub-skills depend on `state.art_inventory`. If the scan fails, the orchestrator prints
the error and stops without writing any Foundry objects.

---

## Phase 2 Deferred UAT Rollup

A successful `/foundry:prep-case` run exercises all five Phase 2 deferred UAT items (from
RESEARCH §R-05). The orchestrator explicitly verifies them at the summary step:

| # | Item | Verified By |
|---|------|-------------|
| 1 | `list_actors` returns filtered fields (no raw `system.*` blobs) | prep-npc Step 5 |
| 2 | `create_actor` idempotent upsert (no duplicate actors on re-run) | re-run guard in Step 5 |
| 3 | `place_token` visible in Foundry canvas | prep-scene Step 4 verification |
| 4 | `@UUID[...]` links render as clickable in Foundry journals | link-references + manual Foundry UI click |
| 5 | Windows `cmd /c` server startup (relay reachable from Windows Claude Code) | implicitly verified by any relay call succeeding |

---

## Anti-Patterns

- **Do NOT** embed `execute_js` script templates in this orchestrator — delegate to sub-skills.
  The orchestrator has no Foundry API calls of its own.
- **Do NOT** parallelize sub-skill calls — the state file is a shared mutable resource and
  concurrent writes would corrupt it. Sub-skills run strictly sequentially.
- **Do NOT** skip the art inventory scan (Step 4) — all downstream sub-skills read from
  `state.art_inventory`. Skipping it means every sub-skill will silently omit art fields.
- **Do NOT** invoke `link-references` before all atomic objects exist (Steps 5-7 complete) —
  Pass 2 requires the UUID map to be complete or it will leave placeholders unresolved.
- **Do NOT** invoke `prep-markdown-handoff` before `link-references` — the markdown files
  should contain resolved `@UUID[...]` references, not raw `@NPC[...]` placeholders.
- **Do NOT** call this skill recursively or nest one `prep-case` run inside another.
- **Do NOT** hardcode NPC or scene names — always read from the input case concept.
- **Do NOT** use `exalted-scenes/` as the canonical art root — it is a LEGACY fallback per
  CONTEXT addendum §A-01′. The canonical root is `worlds/wyrd-berlin/assets/`.
- **Do NOT** call `game.settings.set` from this orchestrator — all settings writes go through
  `prep-sessionflow-case` and `prep-character-panel`.

---

## State File Schema (T-02)

The state file at `.foundry-prep/{case_slug}.json` is the orchestrator's memory across
sub-skill invocations and across re-runs. Its top-level keys:

| Key | Written By | Read By |
|-----|-----------|---------|
| `art_inventory` | Step 4 (orchestrator) | prep-npc, prep-scene, prep-character-panel |
| `npcs[]` | Step 5 (prep-npc output) | Step 10 (prep-character-panel), link-references, prep-markdown-handoff |
| `scenes[]` | Step 6 (prep-scene output) | link-references, prep-markdown-handoff |
| `journals[]` | Step 7 (create_journal output) | link-references, prep-markdown-handoff |
| `sessionflow` | Step 9 (prep-sessionflow-case output) | link-references, prep-markdown-handoff |
| `character_panels[]` | Step 10 (prep-character-panel output) | prep-markdown-handoff |
| `uuid_placeholders_unresolved[]` | Step 11 (link-references output) | Step 13 summary, prep-markdown-handoff README |
| `missing_art` | Sub-skills on null resolve | Step 13 summary, prep-markdown-handoff README |
| `failures[]` | Steps 5-12 on any error | Step 13 summary |

Never hand-edit the state file while the orchestrator is running. It is safe to read it for
inspection or to delete it to force a clean full run.
