---
name: link-references
description: Pass 2 cross-reference rewriter. Reads the .foundry-prep/{case_slug}.json state file and rewrites @NPC[...], @SCENE[...], and @JOURNAL[...] placeholders in journal HTML content and SessionFlow paragraph/teleprompter widget content to real @UUID[Actor.xxx] / @UUID[Scene.xxx] / @UUID[JournalEntry.xxx] references. Surfaces unresolved placeholders and missing art. Supports --dry for preview. Invoked by /foundry:prep-case after all atomic objects are created (Pass 2 of the K-04 two-pass pattern).
---

# /foundry:link-references

Pass 2 cross-reference rewriter for a prep-case run. Resolves `@NPC[...]`, `@SCENE[...]`,
and `@JOURNAL[...]` placeholders in all case-scoped content surfaces (journal HTML pages,
SessionFlow scene paragraph/teleprompter widgets, and SessionFlow character panel paragraph/
teleprompter/journal-board widgets) to real `@UUID[Actor.xxx]` / `@UUID[Scene.xxx]` /
`@UUID[JournalEntry.xxx]` Foundry cross-reference links.

Unresolved placeholders (UUID not yet in state) and missing art entries are surfaced for
user follow-up without halting the run.

---

## When to Use

- **After all prep-npc, prep-scene, prep-sessionflow-case, and prep-character-panel calls
  complete** — i.e., as the final content pass inside `/foundry:prep-case` (Pass 2 of the
  K-04 two-pass cross-reference integrity rule).
- **Standalone**: when the user adds new `@NPC[...]` / `@SCENE[...]` / `@JOURNAL[...]`
  placeholders to an existing case's journals or SessionFlow content and wants them resolved
  without re-running full case prep.
- **Preview only**: pass `--dry` to print the planned rewrites without writing to Foundry.

**Do NOT use** before all atomic objects (actors, scenes, journals) have been created — the
UUID map will be incomplete and placeholders will be left unresolved.

---

## Inputs

### Required

| Field | Type | Description |
|-------|------|-------------|
| `case_slug` | string | Identifies the state file at `.foundry-prep/{case_slug}.json`. Must match the slug used by prep-npc / prep-scene / prep-sessionflow-case / prep-character-panel. Example: `"case_0_session_2"`. |

### Optional

| Flag | Default | Description |
|------|---------|-------------|
| `--dry` | false | Dry-run mode. Prints the planned rewrites as a diff table without writing to Foundry. State file is NOT updated. Idempotent — safe to run repeatedly for inspection. |
| `--journals-only` | false | Skip SessionFlow content scan (scene widgets + character panel widgets). Useful when only journal placeholders need resolution. |
| `--sessionflow-only` | false | Skip journal scan. Useful when only SessionFlow widget content needs resolution. |

---

## Execution Steps

### Step 1 — Load and validate the state file

Read `.foundry-prep/{case_slug}.json` from the working directory using the Read tool.

If the file is missing, exit immediately with:

```
ERROR: No state file found at .foundry-prep/{case_slug}.json.
Run /foundry:prep-case first, or invoke sub-skills in orchestrator mode so the state file
is written before calling link-references.
```

Validate that `state.npcs`, `state.scenes`, and `state.journals` are present (may be empty
arrays — that is fine). If none of the three fields exist, warn:

```
WARNING: State file has no npcs[], scenes[], or journals[] arrays — UUID map will be empty.
All placeholders will be recorded as unresolved.
```

### Step 2 — Build the UUID resolution map (in-memory, local to this turn)

Construct three lookup maps from the state file data:

```javascript
function buildResolutionMaps(state) {
  const npcMap = new Map();
  for (const n of state.npcs ?? []) {
    if (n.input_name && n.foundry_actor_uuid) {
      npcMap.set(n.input_name, n.foundry_actor_uuid);
    }
  }
  const sceneMap = new Map();
  for (const sc of state.scenes ?? []) {
    if (sc.input_name && sc.foundry_scene_uuid) {
      sceneMap.set(sc.input_name, sc.foundry_scene_uuid);
    }
  }
  const journalMap = new Map();
  for (const j of state.journals ?? []) {
    if (j.name && j.uuid) {
      journalMap.set(j.name, j.uuid);
    }
  }
  return { npcMap, sceneMap, journalMap };
}
```

Maps are keyed by the human-readable `input_name` / `name` field — which is the string that
appears inside the placeholder brackets.

### Step 3 — Define the rewriter function

The rewriter operates on an HTML string and returns the rewritten string plus a list of
unresolved placeholders found during the pass:

```javascript
function rewriteReferences(html, { npcMap, sceneMap, journalMap }) {
  const unresolved = [];

  const rewrite = (placeholderType, map) => (match, name) => {
    const uuid = map.get(name);
    if (uuid) {
      // Foundry @UUID link syntax — preserves the human label as the chip display text
      return '@UUID[' + uuid + ']{' + name + '}';
    }
    unresolved.push({ type: placeholderType, name });
    return match; // leave original placeholder unchanged
  };

  let out = html;
  out = out.replace(/@NPC\[([^\]]+)\]/g, rewrite('npc', npcMap));
  out = out.replace(/@SCENE\[([^\]]+)\]/g, rewrite('scene', sceneMap));
  out = out.replace(/@JOURNAL\[([^\]]+)\]/g, rewrite('journal', journalMap));
  return { rewritten: out, unresolved };
}
```

Key properties of this implementation:

- **Idempotent**: already-rewritten `@UUID[...]` patterns do NOT match `@NPC[...]` regex —
  re-running link-references on content that was already rewritten is safe and a no-op.
- **Regex-only**: does not parse HTML — immune to malformed HTML tags around placeholders
  (Threat T-04-23 mitigation).
- **Collects all unresolved** in a single pass per surface — does not stop on the first miss.

### Step 4 — Scan journal entries (unless --sessionflow-only)

Read journal page content via `execute_js`. Only journals whose UUIDs appear in
`state.journals[]` are scanned — skill MUST NOT walk unrelated journals.

```javascript
const JOURNAL_UUIDS = ["JournalEntry.id1", "JournalEntry.id2"];
const sessions = [];
for (const jUUID of JOURNAL_UUIDS) {
  const id = jUUID.split('.')[1];
  const journal = game.journal.get(id);
  if (!journal) { sessions.push({ uuid: jUUID, error: 'not found' }); continue; }
  const pages = journal.pages?.contents ?? [];
  const pageData = [];
  for (const page of pages) {
    const content = page.text?.content ?? '';
    pageData.push({ pageId: page.id, content });
  }
  sessions.push({ uuid: jUUID, name: journal.name, pages: pageData });
}
return JSON.stringify({ journals: sessions });
```

When constructing the actual script, substitute:

```
JOURNAL_UUIDS ← JSON.stringify(state.journals.map(j => j.uuid).filter(Boolean))
```

After receiving the `execute_js` response, run `rewriteReferences` (Step 3) on each
`page.content` in Claude's reasoning context (NOT inside execute_js). Collect rewritten
pages and all unresolved entries for the final report.

### Step 5 — Write journal updates back (unless --dry)

For each journal page whose content changed after Step 4, write it back via `execute_js`:

```javascript
const UPDATES = [
  { journalId: "id1", pageId: "pid1", newContent: "<p>HTML with @UUID[Actor.xxx]{Lisa} links</p>" }
];
const results = [];
for (const u of UPDATES) {
  const journal = game.journal.get(u.journalId);
  if (!journal) { results.push({ journalId: u.journalId, error: 'not found' }); continue; }
  await journal.updateEmbeddedDocuments('JournalEntryPage', [
    { _id: u.pageId, 'text.content': u.newContent }
  ]);
  results.push({ journalId: u.journalId, pageId: u.pageId, ok: true });
}
return JSON.stringify(results);
```

When constructing the actual script, substitute:

```
UPDATES ← JSON.stringify(changedPages)
```

where `changedPages` is the array of `{ journalId, pageId, newContent }` entries whose
`newContent !== originalContent`.

In `--dry` mode: SKIP this execute_js call. Print the planned changes as a diff table
instead (see Section 5 — Dry-Run Mode).

### Step 6 — Scan SessionFlow scene paragraph/teleprompter widgets (unless --journals-only)

Read all scene widgets that may contain placeholder text:

```javascript
const CASE_NAME = "Case 0 Session 2";
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const session = sessions.find(s => s.name === CASE_NAME);
if (!session) return JSON.stringify({ error: 'session not found', name: CASE_NAME });
const widgetsToRewrite = [];
for (const beat of (session.beats ?? [])) {
  for (const scene of (beat.scenes ?? [])) {
    for (const w of (scene.widgets ?? [])) {
      if (
        (w.type === 'paragraph' || w.type === 'teleprompter') &&
        typeof w.config?.content === 'string' &&
        w.config.content.length > 0
      ) {
        widgetsToRewrite.push({
          beatId: beat.id,
          sceneId: scene.id,
          widgetId: w.id,
          field: 'content',
          value: w.config.content
        });
      }
    }
  }
}
return JSON.stringify({ sessionId: session.id, widgetsToRewrite });
```

When constructing the actual script, substitute:

```
CASE_NAME ← JSON.stringify(state.sessionflow.session_name)
```

Use `state.sessionflow.session_name` (or `state.case_slug` if `session_name` is absent) as
the lookup key. The session is found by `name` match — same key used by
`prep-sessionflow-case` during upsert.

Run `rewriteReferences` in Claude context on each widget's `value`. Collect rewrites and
any unresolved entries.

Write back any changed widgets (unless `--dry`):

```javascript
const CASE_NAME = "Case 0 Session 2";
const UPDATES = [
  { beatId: "b1", sceneId: "sc1", widgetId: "w1", field: "content", newValue: "<p>...</p>" }
];
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const session = sessions.find(s => s.name === CASE_NAME);
if (!session) return JSON.stringify({ error: 'session not found' });
let changed = 0;
for (const u of UPDATES) {
  const beat = session.beats.find(b => b.id === u.beatId);
  const scene = beat?.scenes?.find(sc => sc.id === u.sceneId);
  const widget = scene?.widgets?.find(w => w.id === u.widgetId);
  if (!widget) continue;
  widget.config[u.field] = u.newValue;
  changed++;
}
await game.settings.set('sessionflow', 'sessions', sessions);
return JSON.stringify({ changed });
```

When constructing the actual script, substitute:

```
CASE_NAME ← JSON.stringify(state.sessionflow.session_name)
UPDATES   ← JSON.stringify(changedSceneWidgets)
```

### Step 7 — Scan SessionFlow character panel widgets (unless --journals-only)

Read all character panel widgets that may contain placeholder text:

```javascript
const data = game.settings.get('sessionflow', 'characterData') ?? {};
const widgetsToRewrite = [];
for (const [esCharId, canvas] of Object.entries(data)) {
  for (const w of (canvas.widgets ?? [])) {
    if (
      (w.type === 'paragraph' || w.type === 'teleprompter') &&
      typeof w.config?.content === 'string' &&
      w.config.content.length > 0
    ) {
      widgetsToRewrite.push({
        esCharId,
        widgetId: w.id,
        field: 'content',
        value: w.config.content
      });
    }
    if (
      w.type === 'journal-board' &&
      Array.isArray(w.config?.entries)
    ) {
      for (const entry of w.config.entries) {
        if (typeof entry.body === 'string' && entry.body.length > 0) {
          widgetsToRewrite.push({
            esCharId,
            widgetId: w.id,
            entryId: entry.id,
            field: 'entry.body',
            value: entry.body
          });
        }
      }
    }
  }
}
return JSON.stringify({ widgetsToRewrite });
```

Run `rewriteReferences` in Claude context on each widget entry's `value`. Collect rewrites
and any unresolved entries.

Write back any changed character panel widgets (unless `--dry`):

```javascript
const data = game.settings.get('sessionflow', 'characterData') ?? {};
const UPDATES = [
  { esCharId: "abc", widgetId: "w1", field: "content", newValue: "<p>...</p>" },
  { esCharId: "abc", widgetId: "w2", entryId: "e1", field: "entry.body", newValue: "<p>...</p>" }
];
let changed = 0;
for (const u of UPDATES) {
  const canvas = data[u.esCharId];
  if (!canvas) continue;
  const widget = (canvas.widgets ?? []).find(w => w.id === u.widgetId);
  if (!widget) continue;
  if (u.field === 'content') {
    widget.config.content = u.newValue;
    changed++;
  } else if (u.field === 'entry.body' && u.entryId) {
    const entry = (widget.config.entries ?? []).find(e => e.id === u.entryId);
    if (entry) { entry.body = u.newValue; changed++; }
  }
}
await game.settings.set('sessionflow', 'characterData', data);
return JSON.stringify({ changed });
```

When constructing the actual script, substitute:

```
UPDATES ← JSON.stringify(changedPanelWidgets)
```

**Scope guard**: This step walks ALL `characterData` entries, not just those for case NPCs.
That is acceptable because: (a) the rewriter only replaces `@NPC[...]` / `@SCENE[...]` /
`@JOURNAL[...]` patterns — it does not touch `@UUID[...]` or any other content; (b) the
scope guard is satisfied by the regex design, not by filtering on esCharId.

### Step 8 — Finalize state file

After all surface scans (with or without `--dry`), write the collected unresolved list to
the state file. Deduplicate by `(type, name)` before writing:

```javascript
function deduplicateUnresolved(list) {
  const seen = new Set();
  return list.filter(item => {
    const key = item.type + ':' + item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

Append to the state JSON:

```json
{
  "uuid_placeholders_unresolved": [
    { "type": "npc", "name": "Konrad" },
    { "type": "scene", "name": "Police Station" }
  ],
  "link_references_stats": {
    "journals_pages_rewritten": 3,
    "scene_widgets_rewritten": 5,
    "panel_widgets_rewritten": 2,
    "ran_at": "2026-04-14T16:00:00Z",
    "dry_run": false
  }
}
```

Use the Edit tool to update the JSON file in place (do not replace unrelated keys). Keep
2-space indentation.

### Step 9 — Print summary

Print a formatted summary to the user:

```
link-references OK:
  journals rewritten:        <n> page(s)
  scene widgets rewritten:   <n>
  char panel widgets:        <n>
  ---
  unresolved @NPC[...]:      [list or "none"]
  unresolved @SCENE[...]:    [list or "none"]
  unresolved @JOURNAL[...]:  [list or "none"]
  missing art (npc):         [list or "none"]
  missing art (scenes):      [list or "none"]
  missing art (items):       [list or "none"]

Next step: /foundry:prep-markdown-handoff to write Obsidian Bridge staging files.
```

Surface `state.missing_art.npc`, `state.missing_art.scenes`, and `state.missing_art.items`
alongside unresolved references — both require user follow-up before R-05 UAT item 4
("@UUID cross-links render as clickable") can pass.

---

## Section 5 — Dry-Run Mode

When `--dry` is passed:

- Steps 5 (journal write-back), 6 write-back, and 7 write-back are **SKIPPED**.
- Step 8 state file update is **SKIPPED** (state file not mutated).
- The rewriter still runs in Steps 4, 6, and 7 — all planned rewrites are computed.

Print the planned changes as a diff table:

| Surface | Object | Page / Widget | Before | After |
|---------|--------|---------------|--------|-------|
| journal | Case 0 Notes | Page 1 | `@NPC[Lisa]` | `@UUID[Actor.xxx]{Lisa}` |
| scene widget | Act 1 / Lisa's Apartment | paragraph | `@SCENE[...]` | `@UUID[Scene.xxx]{...}` |
| panel widget | Gremori / _dossier | journal-board entry 1 | `@NPC[...]` | `@UUID[Actor.xxx]{...}` |

If no placeholders are found across all surfaces, print:
`link-references --dry: no @NPC/SCENE/JOURNAL placeholders found — nothing to rewrite.`

Dry-run exits cleanly. The state file `uuid_placeholders_unresolved` is NOT updated.

---

## Section 6 — Upsert / Re-Run Behavior

- **Idempotent regex**: `@NPC[...]`, `@SCENE[...]`, `@JOURNAL[...]` patterns do not match
  already-rewritten `@UUID[...]` content. Re-running link-references on fully-rewritten
  content is a no-op.
- **Partial resolution**: If the state file was incomplete when link-references last ran
  (e.g., some NPCs were missing UUIDs), those placeholders remain in the content. Updating
  the state file and re-running link-references gives them a second resolution attempt.
- **User edits preserved**: link-references only rewrites bracketed placeholder patterns.
  Any manual HTML edits the user has made in Foundry between runs are preserved — the
  regex does not match them.
- **Stats updated on each run**: `state.link_references_stats` is overwritten on each
  non-dry run with the latest counts and timestamp.

---

## Section 7 — Failure Modes

| Failure | Behaviour |
|---------|-----------|
| State file missing | Step 1 check — skill exits immediately with clear error message. |
| Journal UUID not found in Foundry | Step 4 records `error: 'not found'` for that UUID and continues with remaining journals. |
| Session not found in sessionflow.sessions | Step 6 `execute_js` returns `error: 'session not found'` — skill logs the error and skips scene widget scan. |
| Widget config not a string | Step 6/7 guard: `typeof w.config?.content === 'string'` — skips non-string configs with no error. |
| Journal-board entry body not a string | Step 7 guard: `typeof entry.body === 'string'` — skips non-string entries. |
| execute_js DENY_LIST hit | Should not occur — all script templates in this skill avoid DENY_LIST patterns. If it does, a placeholder value contains a forbidden substring — log and report to user. |
| Concurrent SessionFlow UI edits (Pitfall 3) | SessionFlow panel's debounced save can clobber the `game.settings.set` write. If the session read-back in Step 6 differs from expected, re-run after closing the SessionFlow panel. |
| Relay down | execute_js returns `RELAY_DOWN`. Skill prints error and stops current surface scan. Re-run when relay is healthy. |

---

## Section 8 — Anti-Patterns

- **Do NOT walk `game.journal.contents` for all journals.** The skill MUST filter to only
  those UUIDs listed in `state.journals[]`. This enforces Threat T-04-21 — unrelated journal
  entries must not be modified.
- **Do NOT expand the placeholder regex** beyond `@NPC[...]`, `@SCENE[...]`,
  `@JOURNAL[...]`. Other `@...[...]` patterns — such as `@Check[foo]`, `@Compendium[...]`,
  or `@Actor[...]` — are Foundry-native and must be preserved exactly as-is.
- **Do NOT mutate `state.npcs`, `state.scenes`, or `state.journals`** inside link-references.
  Pass 2 is read-only with respect to the UUID map. It only appends to
  `state.uuid_placeholders_unresolved` and `state.link_references_stats`.
- **Do NOT use DENY_LIST patterns** in any execute_js script template. Script templates in
  this skill have been hand-reviewed to exclude all blocked substrings. Check
  `mcp/src/client.ts` for the authoritative DENY_LIST.
- **Do NOT call `execute_js` with a `code:` field.** The relay expects `script:` (Phase 3
  finding, PITFALLS.md).
- **Do NOT assume `game.settings.get('sessionflow', 'sessions')` returns a value.** Always
  use `?? []` / `?? {}` fallback (Phase 3 finding).
- **Do NOT write to `characterData` keyed by Foundry actor UUID.** Character panels in
  SessionFlow are keyed by ES character ID (Pitfall 2 from RESEARCH §R-01). This skill
  reads characterData as-is — the keys were written correctly by `prep-character-panel`.
