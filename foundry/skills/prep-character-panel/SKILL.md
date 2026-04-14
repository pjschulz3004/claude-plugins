---
name: prep-character-panel
description: Populate a SessionFlow character panel for a single NPC with widget layouts. Creates a minimal Exalted Scenes character stub (id + name + actorId only — no emotions/poses/audio — per CONTEXT addendum §C-01) as a prerequisite since SessionFlow character panels are keyed by ES character ID, not Foundry actor UUID. Use when the user wants a character dossier/notes/connections/chronicle canvas for ONE NPC. For full case prep, use /foundry:prep-case.
---

# prep-character-panel

Populate a SessionFlow character panel canvas for a single NPC, creating a minimal Exalted Scenes character stub as a prerequisite.

## When to Use

- The user names ONE NPC and wants a character panel populated in SessionFlow.
- The `/foundry:prep-case` orchestrator (Plan 07) invokes this skill once per NPC after `prep-sessionflow-case` for each NPC that needs a panel.
- User wants a single NPC's dossier/notes/connections/chronicle widget canvas without running full case prep.

**Do NOT use** for full case prep — use `/foundry:prep-case` instead.

## Architectural Note — The Actor ↔ Character Panel Mapping Problem (Pitfall 2)

**SessionFlow character panels are keyed by Exalted Scenes character ID, not Foundry actor UUID.**

`sessionflow.characterData` is stored as `{ [esCharId]: CharacterCanvas, ... }` — where `esCharId` is the Exalted Scenes character's internal `id` (an opaque random string like `"Glx4yMDbbaTzyQUB"`). Passing a Foundry actor UUID (e.g., `"Actor.abc123"`) as the key creates a panel that is silently invisible — no error is raised, the data is stored, but SessionFlow never renders it.

**Phase 4 resolution via CONTEXT addendum §C-01:** This skill creates a **minimal ES character stub** — `{ name, image?, tags: [], actorId }` — as the prerequisite step to obtain the correct `esCharId` key. The full Exalted Scenes character layer (emotion portraits, hero poses, theme sounds, cast permissions, favorites/slideshows) is deferred to Phase 4.5. The stub is the minimum viable footprint: identity + actor link only.

The stub creation is **upsert-safe** — the skill checks whether an ES character already exists for this Foundry actor before calling `create`. Re-running never duplicates the ES character.

## Inputs

Parse from `$ARGUMENTS` or conversation context.

**Required:**

- `npc_name` — Foundry actor name (upsert key — same name used by `prep-npc`). Example: `"Gremori"`.
- `template` — one of `_dossier`, `_notes`, `_connections`, `_chronicle`, `_blank`.

**Optional:**

- `foundry_actor_id` — skip `list_actors` lookup when the orchestrator already has the id from `state.npcs[]`.
- `panel_width` — panel width in px. Default: `580`. Minimum: `380`.
- `widget_overrides` — object with widget-type keys for patching default widget configs:
  - `paragraph.content` — HTML string to set in the paragraph widget.
  - `checklist.items` — array of `{ id, text, done }` to set in the checklist widget.
- `journal_entries` — array of `{ title, body, pinned? }` pre-populated journal-board entries (used by `_dossier` template's journal-board widget).
- `relationships` — array of `{ characterId, level, note }` where `characterId` is another ES char ID. Leave empty in Phase 4 and resolve in the `link-references` pass.
- `img_path` — Data-root-relative image path for the ES character stub (optional — stub is valid without an image).

Input example (for `_dossier` template with journal pre-population):

```json
{
  "npc_name": "Gremori",
  "template": "_dossier",
  "foundry_actor_id": "XyZ1ab2cDefGHijk",
  "journal_entries": [
    { "title": "First Encounter", "body": "<p>Lisa's possession manifests in public at the bar.</p>", "pinned": true },
    { "title": "Theme: Crown of Serenity", "body": "<p>What will she do when peace is broken?</p>" }
  ]
}
```

## Execution Steps

### Step 1 — Precondition: Verify SessionFlow AND Exalted Scenes are active

Via `execute_js` — both modules must be installed and active before any other step:

```javascript
const sf = game.modules.get('sessionflow');
const es = game.modules.get('exalted-scenes');
if (!sf?.active) return JSON.stringify({ error: 'sessionflow not active — install and enable sessionflow module' });
if (!es?.active) return JSON.stringify({ error: 'exalted-scenes not active — required for ES character stub (C-01). Install and enable exalted-scenes module.' });
const esApi = es.api;
if (!esApi || typeof esApi.characters !== 'object') return JSON.stringify({ error: 'exalted-scenes api.characters not available — check module version' });
return JSON.stringify({
  sessionflow: sf.version ?? 'unknown',
  exaltedScenes: es.version ?? 'unknown',
  esApiPresent: true
});
```

If either module is not active, stop and surface the error to the user. Do not proceed.

### Step 2 — Resolve the Foundry actor

If `foundry_actor_id` was supplied, use it directly. Otherwise call `list_actors` with a name filter and capture the `id`.

```json
{ "name_filter": "Gremori" }
```

Extract `foundry_actor_id` from the first matching result. If no actor is found, stop and report:
`prep-character-panel ERROR: actor "Gremori" not found in Foundry — run prep-npc first.`

### Step 3 — Resolve or create the ES character stub

This is the critical step that obtains the correct `esCharId` key. Via `execute_js`:

```javascript
const esApi = game.modules.get('exalted-scenes').api;
if (!esApi || !esApi.characters) return JSON.stringify({ error: 'Exalted Scenes API not available' });

const ACTOR_ID = "FOUNDRY_ACTOR_ID_PLACEHOLDER";
const ACTOR_UUID = "Actor." + ACTOR_ID;
const NPC_NAME = "NPC_NAME_PLACEHOLDER";
const IMG_PATH = "IMG_PATH_PLACEHOLDER";

// Upsert: search existing ES characters for one linked to this Foundry actor.
// ES stores actorId as either the raw id or the "Actor.<id>" UUID form — check both.
const all = esApi.characters.getAll ? esApi.characters.getAll() : (esApi.characters.contents ?? []);
let existing = all.find(c => c.actorId === ACTOR_ID || c.actorId === ACTOR_UUID);

let esCharId;
let wasNew = false;
if (existing) {
  esCharId = existing.id;
} else {
  // C-01 minimal stub — name + optional image + empty tags + actorId link.
  // NO emotions, poses, audio, cast permissions, favorites, or slideshows.
  const stub = {
    name: NPC_NAME,
    tags: [],
    actorId: ACTOR_ID
  };
  if (IMG_PATH) stub.image = IMG_PATH;
  const created = await esApi.characters.create(stub);
  esCharId = created.id;
  wasNew = true;
}

return JSON.stringify({ esCharId, wasNew, actorId: ACTOR_ID });
```

**Substitution required before calling execute_js:**
- Replace `"FOUNDRY_ACTOR_ID_PLACEHOLDER"` with the actual `foundry_actor_id`.
- Replace `"NPC_NAME_PLACEHOLDER"` with the actual NPC name (JSON-escaped).
- Replace `"IMG_PATH_PLACEHOLDER"` with the resolved image path or `""` (empty string if none).

Use `JSON.stringify(value)` to escape user-supplied strings before embedding in the script — this satisfies T-04-16 injection guard.

Capture the returned `esCharId`. If the result contains `error`, stop and report.

### Step 4 — Select template and apply widget overrides

The 5 built-in character-panel template layouts are inlined below. All are derived from `sessionflow/scripts/character-panel.js` lines 93-142 [VERIFIED: live source probe 2026-04-14].

Select the template by the `template` input value. Then apply widget overrides as documented per template.

**Template definitions:**

```javascript
// _dossier — character reference card (canvasHeight: 740)
// Widgets: relationships (social graph), ornamental divider, journal-board (dossier entries)
const TEMPLATE_DOSSIER = [
  { id: '', type: 'relationships', x: 20, y: 20, width: 360, height: 320, zIndex: 1, collapsed: false,
    config: { ownerCharacterId: '', relationships: [] } },
  { id: '', type: 'divider', x: 20, y: 360, width: 360, height: 20, zIndex: 2, collapsed: false,
    config: { orientation: 'horizontal', style: 'ornamental' } },
  { id: '', type: 'journal-board', x: 20, y: 400, width: 360, height: 340, zIndex: 3, collapsed: false,
    config: { entries: [], viewMode: 'board' } }
];
const CANVAS_HEIGHT_DOSSIER = 740;

// _notes — quick session notes (canvasHeight: 580)
// Widgets: paragraph (rich text), fade divider, checklist (beats/tasks), sticky (quick note)
const TEMPLATE_NOTES = [
  { id: '', type: 'paragraph', x: 20, y: 20, width: 360, height: 280, zIndex: 1, collapsed: false,
    config: { content: '' } },
  { id: '', type: 'divider', x: 20, y: 320, width: 360, height: 20, zIndex: 2, collapsed: false,
    config: { orientation: 'horizontal', style: 'fade' } },
  { id: '', type: 'checklist', x: 20, y: 360, width: 280, height: 300, zIndex: 3, collapsed: false,
    config: { items: [] } },
  { id: '', type: 'sticky', x: 320, y: 360, width: 220, height: 180, zIndex: 4, collapsed: false,
    config: { text: '', colorIndex: 0 } }
];
const CANVAS_HEIGHT_NOTES = 580;

// _connections — social web (canvasHeight: 760)
// Widgets: faction (org membership), ornamental divider, relationships (social graph)
const TEMPLATE_CONNECTIONS = [
  { id: '', type: 'faction', x: 20, y: 20, width: 360, height: 320, zIndex: 1, collapsed: false,
    config: { factionId: '', name: '', image: '', levels: {}, members: {} } },
  { id: '', type: 'divider', x: 20, y: 360, width: 360, height: 20, zIndex: 2, collapsed: false,
    config: { orientation: 'horizontal', style: 'ornamental' } },
  { id: '', type: 'relationships', x: 20, y: 400, width: 360, height: 320, zIndex: 3, collapsed: false,
    config: { ownerCharacterId: '', relationships: [] } }
];
const CANVAS_HEIGHT_CONNECTIONS = 760;

// _chronicle — temporal state tracking (canvasHeight: 620)
// Widgets: time-tracker (resource/time), dotted divider, progress-clock (Blades-style), paragraph (notes)
const TEMPLATE_CHRONICLE = [
  { id: '', type: 'time-tracker', x: 20, y: 20, width: 320, height: 240, zIndex: 1, collapsed: false,
    config: { label: '', count: 0, secondaryLabel: '', secondaryCount: 0, step: 1, conversionRate: 60, history: [] } },
  { id: '', type: 'divider', x: 20, y: 280, width: 360, height: 20, zIndex: 2, collapsed: false,
    config: { orientation: 'horizontal', style: 'dotted' } },
  { id: '', type: 'progress-clock', x: 20, y: 320, width: 280, height: 240, zIndex: 3, collapsed: false,
    config: { clocks: [], broadcastingClockIds: [] } },
  { id: '', type: 'paragraph', x: 320, y: 320, width: 360, height: 280, zIndex: 4, collapsed: false,
    config: { content: '' } }
];
const CANVAS_HEIGHT_CHRONICLE = 620;

// _blank — empty canvas (canvasHeight: 420)
// No widgets — user builds from scratch
const TEMPLATE_BLANK = [];
const CANVAS_HEIGHT_BLANK = 420;

const PANEL_TEMPLATES = {
  '_dossier':     { widgets: TEMPLATE_DOSSIER,     canvasHeight: CANVAS_HEIGHT_DOSSIER },
  '_notes':       { widgets: TEMPLATE_NOTES,       canvasHeight: CANVAS_HEIGHT_NOTES },
  '_connections': { widgets: TEMPLATE_CONNECTIONS, canvasHeight: CANVAS_HEIGHT_CONNECTIONS },
  '_chronicle':   { widgets: TEMPLATE_CHRONICLE,   canvasHeight: CANVAS_HEIGHT_CHRONICLE },
  '_blank':       { widgets: TEMPLATE_BLANK,       canvasHeight: CANVAS_HEIGHT_BLANK }
};

function resolvePanelTemplate(id) {
  return PANEL_TEMPLATES[id] ?? PANEL_TEMPLATES['_blank'];
}
```

**Widget override logic (apply in order after template selection):**

1. **`journal_entries[]` → `journal-board` widget config:**
   For the selected template's `journal-board` widget (if present), replace `config.entries` with the provided array. Each entry must have an `id` generated via `foundry.utils.randomID()` before serializing — add it if not already present:
   ```javascript
   entries = journal_entries.map(e => ({
     id: foundry.utils.randomID(),
     title: e.title,
     body: e.body,
     pinned: e.pinned ?? false
   }));
   ```

2. **`widget_overrides.paragraph.content` → `paragraph` widget:**
   Set the paragraph widget's `config.content` to the provided HTML string.

3. **`widget_overrides.checklist.items` → `checklist` widget:**
   Replace `config.items` with the provided array. Ensure each item has an `id` field.

4. **`_dossier` and `_connections` templates — set `relationships` widget `ownerCharacterId`:**
   After obtaining `esCharId` from Step 3, set `config.ownerCharacterId = esCharId` on the `relationships` widget. This is the self-reference that allows the social graph to display correctly.

5. **`relationships[]` input (Phase 4 — deferred wire-up):**
   If `relationships[]` was supplied, set `config.relationships` on the first `relationships` widget. In Phase 4, `characterId` values in this array may still be placeholder strings like `@NPC[lisa]` — record them in `state.uuid_placeholders_unresolved[]` for the `link-references` pass to resolve.

**Regenerate widget IDs before serializing:**

Every widget in the final array must have a unique `id`. Replace every `id: ''` placeholder with a fresh ID:

```javascript
const widgetsWithIds = templateWidgets.map(w => ({
  ...w,
  id: foundry.utils.randomID()
}));
```

This ensures each widget instance is uniquely addressable within SessionFlow.

### Step 5 — Upsert the character canvas in sessionflow.characterData

Via `execute_js` — substitute actual values before calling:

```javascript
const data = game.settings.get('sessionflow', 'characterData') ?? {};
const ES_CHAR_ID = "ES_CHAR_ID_PLACEHOLDER";
const TEMPLATE_WIDGETS = WIDGETS_JSON_PLACEHOLDER;
const CANVAS_HEIGHT = CANVAS_HEIGHT_PLACEHOLDER;
const PANEL_WIDTH = PANEL_WIDTH_PLACEHOLDER;

const existed = !!data[ES_CHAR_ID];
data[ES_CHAR_ID] = {
  widgets: TEMPLATE_WIDGETS,
  canvasHeight: CANVAS_HEIGHT,
  nextZIndex: TEMPLATE_WIDGETS.length + 2,
  panelWidth: PANEL_WIDTH
};
await game.settings.set('sessionflow', 'characterData', data);
return JSON.stringify({ esCharId: ES_CHAR_ID, existed, widgetCount: TEMPLATE_WIDGETS.length });
```

**Substitution required:**
- `ES_CHAR_ID_PLACEHOLDER` → the `esCharId` captured in Step 3 (JSON.stringify-escaped).
- `WIDGETS_JSON_PLACEHOLDER` → the fully-resolved widget array with IDs (serialize with `JSON.stringify(widgetsWithIds)`).
- `CANVAS_HEIGHT_PLACEHOLDER` → integer from the template's `canvasHeight`.
- `PANEL_WIDTH_PLACEHOLDER` → `panel_width` input or `580`.

Capture the returned `{ esCharId, existed, widgetCount }`. A `widgetCount` of 0 with a `_blank` template is expected.

### Step 6 — Record in state file

If invoked in orchestrated mode (`.foundry-prep/{case_slug}.json` exists), append to `state.character_panels[]`:

```json
{
  "npc_name": "Gremori",
  "foundry_actor_id": "XyZ1ab2cDefGHijk",
  "es_char_id": "Glx4yMDbbaTzyQUB",
  "es_char_was_new": true,
  "template": "_dossier",
  "widget_count": 3,
  "panel_width": 580
}
```

Also check `state.uuid_placeholders_unresolved[]` — if `relationships[]` input contained unresolved placeholder strings (e.g., `@NPC[lisa]`), append them to this array so `link-references` can resolve them in pass 2.

### Step 7 — Verify the character canvas was written

Via `execute_js`:

```javascript
const data = game.settings.get('sessionflow', 'characterData') ?? {};
const ES_CHAR_ID = "ES_CHAR_ID_PLACEHOLDER";
const canvas = data[ES_CHAR_ID];
if (!canvas) return JSON.stringify({ verified: false, error: 'esCharId not found in characterData' });
return JSON.stringify({
  verified: true,
  esCharId: ES_CHAR_ID,
  widgetCount: canvas.widgets?.length ?? 0,
  canvasHeight: canvas.canvasHeight,
  panelWidth: canvas.panelWidth
});
```

Print summary:

```
prep-character-panel OK: "Gremori" → esCharId=Glx4yMDbbaTzyQUB (new ES stub)
  template: _dossier, widgets: 3, canvasHeight: 740, panelWidth: 580
  stored in sessionflow.characterData
```

## Excluded Widget Types

The following 6 widget types are **never valid in a character panel canvas** and must never appear in the `widgets` array of any character panel this skill creates. They are excluded by SessionFlow's `character-panel.js` (line 33 allow-list check):

| Excluded Type | Reason |
|---|---|
| `scene-image` | MAX_INSTANCES=1 scene-level display; no meaning in character context |
| `characters` | Scene cast display; no meaning in character context |
| `timer` | Live countdown; excluded from character panels |
| `scene-link` | Links to SessionFlow scene by ES scene ID; excluded |
| `sequence` | Exalted Scenes sequence reference; excluded |
| `slideshow` | Exalted Scenes slideshow reference; excluded |

This skill's TEMPLATE arrays have been designed to contain none of these types. The acceptance criteria grep verifies zero occurrences of these types in all TEMPLATE_ arrays.

**Note on ambiguity:** The word `characters` in art paths (e.g., `worlds/wyrd-berlin/assets/npc/`) and in `esApi.characters` is unrelated to the `type: 'characters'` widget (scene cast display widget). Only the widget type string `'characters'` is excluded.

## Upsert Behavior

- Re-running `prep-character-panel` with the same `npc_name` / `foundry_actor_id` is idempotent.
- **ES character stub upsert:** Step 3 looks up an existing ES character by `actorId` before calling `create`. Running twice for the same NPC never creates a duplicate ES character.
- **Character canvas upsert:** Step 5 writes `data[esCharId] = ...` unconditionally (overwrite), which is the correct behavior — `prep-character-panel` always resets the canvas to the chosen template + overrides. The `existed` flag distinguishes create vs update.
- **Panel width preservation:** If the user later adjusts `panelWidth` manually in SessionFlow, re-running this skill will reset it to the `panel_width` input value. This is intentional — the skill owns the initial scaffold.

## Failure Modes

- **SessionFlow not active** → error in Step 1. User must install and enable the `sessionflow` module.
- **Exalted Scenes not active** → error in Step 1. C-01 requires ES for the character stub prerequisite. User must enable `exalted-scenes`.
- **ES API not available** (`esApi.characters` undefined) → error in Step 3. May indicate an older version of Exalted Scenes that doesn't expose the `api` object. Check module version.
- **Actor not found** → error in Step 2. Run `prep-npc` first to create the Foundry actor.
- **ES character creation fails** (API contract changed) → Step 3 surfaces the error. Log the raw JS error and stop.
- **characterData write silently keyed wrong** → Step 7 verification detects this — `verified: false` if `esCharId` is absent. This is Pitfall 2 made observable. Re-check the `esCharId` returned in Step 3.
- **Relay down** → execute_js returns `RELAY_DOWN`. Skill prints error and exits.

## Outputs

- A new or updated SessionFlow character panel canvas in `sessionflow.characterData`, keyed by `esCharId`.
- A new or existing ES character stub in the Exalted Scenes module (minimal — name + actorId only).
- Appended entry in `.foundry-prep/{case_slug}.json` → `state.character_panels[]` (orchestrated mode).
- Printed summary with `esCharId`, template name, widget count, and panel dimensions.

## Anti-Patterns

- **Do NOT key `sessionflow.characterData` by Foundry actor UUID.** The key MUST be the Exalted Scenes character ID (`esCharId`). Passing `Actor.xxxx` as the key creates a silently invisible panel (Pitfall 2).
- **Do NOT populate emotion/pose/audio fields on the ES character stub.** The stub is Phase 4 minimal surface only — `{ name, image?, tags: [], actorId }`. Emotion portraits, hero poses, theme sounds, cast permissions, and favorites are Phase 4.5 territory.
- **Do NOT emit character-panel-excluded widget types** (`scene-image`, `characters`, `timer`, `scene-link`, `sequence`, `slideshow`) in any character canvas widget array.
- **Do NOT use a `_blank` template** unless the user explicitly requests it — the other 4 templates provide meaningful default layouts for character prep.
- **Do NOT skip Step 1 module checks.** A missing Exalted Scenes module causes a silent stub failure; failing early produces a clear error message.
- **Do NOT skip Step 7 verification.** The `verified: false` catch is the only observable signal for Pitfall 2 (wrong key type silently stored).
- **Do NOT use DENY_LIST patterns** in any execute_js script. Blocked patterns include bulk-delete operations, world-level destructive calls, core settings writes, and user-data access. Check `mcp/src/client.ts` DENY_LIST for the full list.
