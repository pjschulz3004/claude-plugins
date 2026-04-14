---
name: prep-sessionflow-case
description: Create or update a SessionFlow case shell (session metadata + beats + scenes + widget-populated canvases) by writing to sessionflow.sessions via execute_js. Upsert-safe by session name, beat title, and scene title. Applies built-in scene template widget layouts (_classic, _storyteller, _combat, _exploration, _social, _intrigue, _atmosphere, _theater, _blank). Use when building SessionFlow structure for a case; for full case prep including NPCs and journals, use /foundry:prep-case.
---

# /foundry:prep-sessionflow-case

Create or update the SessionFlow structural shell for a case: session metadata, beats,
scenes, and widget-populated canvases. Writes to `sessionflow.sessions` (world-scoped
Foundry game setting) via the existing `execute_js` MCP tool. All writes are
**upsert-by-name/title** — re-running this skill is always safe.

---

## When to Use

- **Orchestrated mode**: invoked by `/foundry:prep-case` after all NPCs and scenes exist
  in Foundry (Pass 1 complete), so that `exaltedSceneId` linkages can be injected later
  by `link-references`.
- **Standalone mode**: run directly when you only need to create or refresh the SessionFlow
  shell without re-creating the underlying Foundry actors or scenes. Useful when iterating
  on beat/scene structure for a case that already exists in Foundry.

**Do NOT use** when you want full end-to-end case prep — use `/foundry:prep-case` instead.

---

## Inputs

Parse from `$ARGUMENTS` or conversation context.

### Required

| Field | Type | Description |
|-------|------|-------------|
| `case_name` | string | Upsert key — must match `session.name` in `sessionflow.sessions` exactly on re-runs. Example: `"Case 0 Session 2"`. |
| `beats` | `Beat[]` | Array of beat objects (see shape below). |

### Optional

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `case_slug` | string | slugify(case_name) | Used for the `.foundry-prep/{case_slug}.json` state file. Auto-derived via slugify if omitted. |
| `icon` | string | `'fa-solid fa-book-open'` | FontAwesome class for the SessionFlow session icon. |
| `color` | string | `'#7c5cbf'` | Hex color for the SessionFlow session row. |
| `exalted_scene_ids` | object | `{}` | Map from scene title → Exalted Scenes scene ID. Phase 4 leaves this empty; Phase 4.5 populates it via `link-references`. |

### Beat shape

```
{
  title: string,         // upsert key within session
  text?: string,         // rich text HTML (empty string is fine)
  image?: string,        // Data-root-relative art path (empty string if none)
  color?: string,        // hex color (empty string if none)
  scenes: Scene[]
}
```

### Scene shape

```
{
  title: string,          // upsert key within beat
  template: string,       // one of: _classic _storyteller _combat _exploration
                          //         _social _intrigue _atmosphere _theater _blank
  widget_overrides?: WidgetOverride[]
}
```

### WidgetOverride shape

```
{
  widget_type: string,    // e.g. 'paragraph', 'teleprompter'
  widget_index?: number,  // 0-based index if multiple widgets of the same type
  config_patch: object    // merged into the widget's config (shallow merge)
}
```

### Full input example

```json
{
  "case_name": "Case 0 Session 2",
  "case_slug": "case_0_session_2",
  "icon": "fa-solid fa-book-open",
  "color": "#7c5cbf",
  "beats": [
    {
      "title": "Act 1 — The Awakening",
      "text": "<p>Gremori surfaces in Berlin's nightlife.</p>",
      "scenes": [
        {
          "title": "Lisa's Apartment",
          "template": "_storyteller",
          "widget_overrides": [
            {
              "widget_type": "teleprompter",
              "config_patch": { "title": "Lisa's Apartment", "chipColor": "#7c5cbf" }
            },
            {
              "widget_type": "paragraph",
              "config_patch": { "content": "<p>The smell of jasmine incense. A possession in progress.</p>" }
            }
          ]
        },
        {
          "title": "Späti (Night)",
          "template": "_social"
        }
      ]
    },
    {
      "title": "Act 2 — Confrontation",
      "scenes": [
        {
          "title": "Major Arcana Club Interior",
          "template": "_classic"
        }
      ]
    }
  ]
}
```

---

## Execution Steps

### Step 1 — Precondition check via execute_js

Confirm SessionFlow is installed and active. Call `execute_js` with:

```javascript
const mod = game.modules.get('sessionflow');
if (!mod) return JSON.stringify({ error: 'sessionflow module not installed' });
if (!mod.active) return JSON.stringify({ error: 'sessionflow module installed but not active' });
return JSON.stringify({ ok: true, version: mod.version });
```

- If `error` is present, exit immediately and print the error.
- If `ok` is true but `version` is NOT `'0.5.0'` (the version Phase 4 research pinned against),
  emit a WARNING but proceed:

  ```
  WARNING: SessionFlow version is {version}, expected 0.5.0.
  Widget layouts are sourced from 0.5.0 scene-panel.js. If widgets fail to render,
  pin SessionFlow back to 0.5.0 in Foundry's module manager.
  ```

- **Pitfall 3 guard**: Print the following before continuing, so the user has a chance to close
  the SessionFlow panel before the writes begin:

  ```
  NOTE: Close the SessionFlow panel in Foundry before this skill writes to sessionflow.sessions.
  An open panel's debounced save can clobber the write. Press Enter to continue when ready.
  ```

  In orchestrated mode (invoked by `prep-case`) the user has confirmed at the plan-level
  checkpoint; skip the interactive pause.

### Step 2 — Slugify the case name

Apply the slugify rule inline (copy from `skills/_shared/art-path-resolver/SKILL.md`):

```javascript
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'ss')
    .replace(/[äöü]/g, c => ({'\u00e4': 'a', '\u00f6': 'o', '\u00fc': 'u'}[c]))
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
```

If `case_slug` was provided, use it. Otherwise `case_slug = slugify(case_name)`.

### Step 3 — Upsert the session (read-modify-write via execute_js)

Call `execute_js` with the following script. Every user-controlled string is embedded via
`JSON.stringify(...)` to prevent injection (Threat T-04-11 mitigation — mirrors the pattern
in `mcp/src/tools/actors.ts` lines 203-206 and 222-227):

```javascript
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const CASE_NAME = JSON.stringify('');
const ICON = JSON.stringify('');
const COLOR = JSON.stringify('');
let session = sessions.find(s => s.name === CASE_NAME);
const wasNew = !session;
if (!session) {
  const nextNumber = (sessions.length ? Math.max(...sessions.map(s => s.number)) : 0) + 1;
  session = {
    id: foundry.utils.randomID(),
    number: nextNumber,
    name: CASE_NAME,
    icon: ICON,
    color: COLOR,
    createdAt: Date.now(),
    beats: []
  };
  sessions.push(session);
} else {
  session.icon = ICON;
  session.color = COLOR;
}
await game.settings.set('sessionflow', 'sessions', sessions);
return JSON.stringify({ sessionId: session.id, name: session.name, wasNew, number: session.number });
```

When constructing the real script string in Claude, substitute the placeholders:

```
CASE_NAME ← ${JSON.stringify(case_name)}
ICON      ← ${JSON.stringify(icon ?? 'fa-solid fa-book-open')}
COLOR     ← ${JSON.stringify(color ?? '#7c5cbf')}
```

Capture `sessionId` from the response; pass it into Steps 4 and 5.

### Step 4 — Upsert each beat (one execute_js call per beat)

For each beat in `beats[]`, call `execute_js`:

```javascript
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const SESSION_ID = JSON.stringify('');
const BEAT_TITLE = JSON.stringify('');
const BEAT_TEXT = JSON.stringify('');
const BEAT_IMAGE = JSON.stringify('');
const BEAT_COLOR = JSON.stringify('');
const session = sessions.find(s => s.id === SESSION_ID);
if (!session) return JSON.stringify({ error: 'session not found', sessionId: SESSION_ID });
session.beats = session.beats ?? [];
let beat = session.beats.find(b => b.title === BEAT_TITLE);
const wasNew = !beat;
if (!beat) {
  beat = {
    id: foundry.utils.randomID(),
    title: BEAT_TITLE,
    text: BEAT_TEXT,
    image: BEAT_IMAGE,
    color: BEAT_COLOR,
    order: session.beats.length,
    createdAt: Date.now(),
    scenes: []
  };
  session.beats.push(beat);
} else {
  beat.text = BEAT_TEXT;
  beat.image = BEAT_IMAGE;
  beat.color = BEAT_COLOR;
}
await game.settings.set('sessionflow', 'sessions', sessions);
return JSON.stringify({ beatId: beat.id, title: beat.title, wasNew });
```

When constructing the real script, substitute:

```
SESSION_ID  ← ${JSON.stringify(sessionId)}
BEAT_TITLE  ← ${JSON.stringify(beat.title)}
BEAT_TEXT   ← ${JSON.stringify(beat.text ?? '')}
BEAT_IMAGE  ← ${JSON.stringify(beat.image ?? '')}
BEAT_COLOR  ← ${JSON.stringify(beat.color ?? '')}
```

Capture `beatId` for each beat; pass into Step 5.

### Step 5 — Upsert each scene within its beat + instantiate template widgets

This is the crown jewel of the skill. For each scene within each beat, call `execute_js`:

```javascript
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const SESSION_ID = JSON.stringify('');
const BEAT_ID = JSON.stringify('');
const SCENE_TITLE = JSON.stringify('');
const ES_SCENE_ID = JSON.stringify('');
const TEMPLATE_WIDGETS = [];
const session = sessions.find(s => s.id === SESSION_ID);
if (!session) return JSON.stringify({ error: 'session not found' });
const beat = session.beats.find(b => b.id === BEAT_ID);
if (!beat) return JSON.stringify({ error: 'beat not found' });
beat.scenes = beat.scenes ?? [];
let scene = beat.scenes.find(sc => sc.title === SCENE_TITLE);
const wasNew = !scene;
const hadWidgets = scene && Array.isArray(scene.widgets) && scene.widgets.length > 0;
if (!scene) {
  scene = {
    id: foundry.utils.randomID(),
    title: SCENE_TITLE,
    exaltedSceneId: ES_SCENE_ID,
    order: beat.scenes.length,
    createdAt: Date.now()
  };
  beat.scenes.push(scene);
} else {
  scene.exaltedSceneId = ES_SCENE_ID;
}
scene.widgets = TEMPLATE_WIDGETS.map(w => ({
  ...w,
  id: foundry.utils.randomID(),
  zIndex: (typeof w.zIndex === 'number' ? w.zIndex : 1)
}));
scene.canvasHeight = 420;
scene.nextZIndex = scene.widgets.length + 2;
await game.settings.set('sessionflow', 'sessions', sessions);
return JSON.stringify({
  sceneId: scene.id,
  title: scene.title,
  wasNew,
  hadWidgets,
  widgetCount: scene.widgets.length
});
```

When constructing the real script, substitute:

```
SESSION_ID       ← ${JSON.stringify(sessionId)}
BEAT_ID          ← ${JSON.stringify(beatId)}
SCENE_TITLE      ← ${JSON.stringify(scene.title)}
ES_SCENE_ID      ← ${JSON.stringify(exalted_scene_ids[scene.title] ?? '')}
TEMPLATE_WIDGETS ← ${JSON.stringify(resolveTemplate(scene.template, scene.widget_overrides))}
```

The `resolveTemplate` function selects the widget array from the Scene Template Widget Library
(Section 7 below) and applies any `widget_overrides`. Widget IDs are always regenerated at
instantiation via `foundry.utils.randomID()` — they are not cross-referenced externally.

**Widget merge/replace semantics (Pitfall 1):** On re-run, the widget array is **replaced
wholesale** regardless of whether the scene already had widgets from a previous run. This
is the safe default — a re-run should produce the exact template-specified layout. If the
user has manually added widgets via the SessionFlow UI, those additions are lost on re-run.

TODO(Phase 4.1): add a `--merge` flag to skip the widget replace when the scene already
has widgets (`hadWidgets === true`). The current REPLACE behaviour is intentional for Phase 4.

### Step 6 — Update prep-case state file

If invoked in orchestrated mode (`.foundry-prep/{case_slug}.json` exists), append to
`state.sessionflow`:

```json
{
  "session_id": "<sessionId>",
  "session_name": "<case_name>",
  "beats": {
    "<beat_title>": { "beat_id": "<beatId>", "scenes": { "<scene_title>": "<sceneId>" } }
  }
}
```

Use the Edit/Write tools to update the JSON file in place. Keep 2-space indentation.

If invoked standalone (no state file), skip this step.

### Step 7 — Verify via execute_js probe

Call `execute_js` to confirm the session exists and counts are correct:

```javascript
const sessions = game.settings.get('sessionflow', 'sessions') ?? [];
const CASE_NAME = JSON.stringify('');
const session = sessions.find(s => s.name === CASE_NAME);
if (!session) return JSON.stringify({ error: 'verification failed — session not found', name: CASE_NAME });
const beatCount = session.beats.length;
const sceneCount = session.beats.reduce((n, b) => n + (b.scenes?.length ?? 0), 0);
const widgetCount = session.beats.reduce(
  (n, b) => n + (b.scenes?.reduce((m, sc) => m + (sc.widgets?.length ?? 0), 0) ?? 0),
  0
);
return JSON.stringify({ sessionId: session.id, name: session.name, beatCount, sceneCount, widgetCount });
```

Substitute `CASE_NAME ← ${JSON.stringify(case_name)}`.

Print summary:

```
prep-sessionflow-case OK: "<case_name>" → SessionFlow session <sessionId>
  beats: <n>, scenes: <n>, widgets: <n> total
```

---

## Section 7 — Scene Template Widget Library

All 9 built-in scene templates extracted verbatim from SessionFlow 0.5.0
`sessionflow/scripts/scene-panel.js` lines 117-215. [CITED: RESEARCH §R-01, source + live probe 2026-04-14]

Use `resolveTemplate(templateId, widgetOverrides)` to get the widget array for Step 5.

### Helper: resolveTemplate

```javascript
function resolveTemplate(templateId, widgetOverrides) {
  const base = TEMPLATES[templateId] ?? TEMPLATE_BLANK;
  if (!widgetOverrides || widgetOverrides.length === 0) return base;
  const result = base.map(w => ({ ...w, config: { ...w.config } }));
  for (const ov of widgetOverrides) {
    const idx = (ov.widget_index != null)
      ? ov.widget_index
      : result.findIndex(w => w.type === ov.widget_type);
    if (idx >= 0 && idx < result.length) {
      result[idx].config = { ...result[idx].config, ...ov.config_patch };
    }
  }
  return result;
}

const TEMPLATES = {
  '_classic':     TEMPLATE_CLASSIC,
  '_storyteller': TEMPLATE_STORYTELLER,
  '_combat':      TEMPLATE_COMBAT,
  '_exploration': TEMPLATE_EXPLORATION,
  '_social':      TEMPLATE_SOCIAL,
  '_intrigue':    TEMPLATE_INTRIGUE,
  '_atmosphere':  TEMPLATE_ATMOSPHERE,
  '_theater':     TEMPLATE_THEATER,
  '_blank':       TEMPLATE_BLANK
};
```

### TEMPLATE_CLASSIC — Scene + cast

Scene image left, fade divider, character list right.

```javascript
const TEMPLATE_CLASSIC = [
  { id: '', type: 'scene-image',  x: 20,  y: 20, width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',      x: 520, y: 20, width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'fade' } },
  { id: '', type: 'characters',   x: 560, y: 20, width: 240, height: 340, zIndex: 3, collapsed: false, config: {} }
];
```

### TEMPLATE_STORYTELLER — Narrative-heavy scene

Scene image left, ornamental divider, teleprompter + dotted divider + paragraph right.

```javascript
const TEMPLATE_STORYTELLER = [
  { id: '', type: 'scene-image',  x: 20,  y: 20,  width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',      x: 520, y: 20,  width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'ornamental' } },
  { id: '', type: 'teleprompter', x: 560, y: 20,  width: 210, height: 44,  zIndex: 3, collapsed: false, config: { content: '', title: '', chipColor: '#7c5cbf', fontSize: 14, scrollSpeed: 40 } },
  { id: '', type: 'divider',      x: 560, y: 80,  width: 360, height: 20,  zIndex: 4, collapsed: false, config: { orientation: 'horizontal', style: 'dotted' } },
  { id: '', type: 'paragraph',    x: 560, y: 120, width: 360, height: 280, zIndex: 5, collapsed: false, config: { content: '' } }
];
```

### TEMPLATE_COMBAT — Live combat

Scene image left, solid divider, character list + timer right.

```javascript
const TEMPLATE_COMBAT = [
  { id: '', type: 'scene-image', x: 20,  y: 20, width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',     x: 520, y: 20, width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'solid' } },
  { id: '', type: 'characters',  x: 560, y: 20, width: 240, height: 340, zIndex: 3, collapsed: false, config: {} },
  { id: '', type: 'timer',       x: 560, y: 380, width: 300, height: 260, zIndex: 4, collapsed: false, config: { duration: 0, mode: 'countdown', isRunning: false, isBroadcasting: false, color: '#c0392b', elapsedAtPause: 0, runEffectiveStart: 0 } }
];
```

### TEMPLATE_EXPLORATION — Investigation / exploration

Scene image left, fade divider, checklist + time-tracker right.

```javascript
const TEMPLATE_EXPLORATION = [
  { id: '', type: 'scene-image',  x: 20,  y: 20,  width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',      x: 520, y: 20,  width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'fade' } },
  { id: '', type: 'checklist',    x: 560, y: 20,  width: 280, height: 300, zIndex: 3, collapsed: false, config: { items: [] } },
  { id: '', type: 'time-tracker', x: 560, y: 340, width: 320, height: 240, zIndex: 4, collapsed: false, config: { label: 'Time', count: 0, secondaryLabel: '', secondaryCount: 0, step: 1, conversionRate: 1, history: [] } }
];
```

### TEMPLATE_SOCIAL — RP / social scene

Scene image left, ornamental divider, characters + inspiration chip + paragraph right.

```javascript
const TEMPLATE_SOCIAL = [
  { id: '', type: 'scene-image',  x: 20,  y: 20,  width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',      x: 520, y: 20,  width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'ornamental' } },
  { id: '', type: 'characters',   x: 560, y: 20,  width: 240, height: 340, zIndex: 3, collapsed: false, config: {} },
  { id: '', type: 'inspiration',  x: 560, y: 380, width: 210, height: 44,  zIndex: 4, collapsed: false, config: { items: [], title: '', chipColor: '#7c5cbf' } },
  { id: '', type: 'paragraph',    x: 560, y: 440, width: 360, height: 280, zIndex: 5, collapsed: false, config: { content: '' } }
];
```

### TEMPLATE_INTRIGUE — Investigation board (no scene image)

Leads with progress clocks, dotted dividers, journal board, paragraph. No scene-image widget.

```javascript
const TEMPLATE_INTRIGUE = [
  { id: '', type: 'progress-clock', x: 20,  y: 20,  width: 280, height: 240, zIndex: 1, collapsed: false, config: { clocks: [], broadcastingClockIds: [] } },
  { id: '', type: 'divider',        x: 320, y: 20,  width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'dotted' } },
  { id: '', type: 'journal-board',  x: 360, y: 20,  width: 360, height: 340, zIndex: 3, collapsed: false, config: { entries: [], viewMode: 'board' } },
  { id: '', type: 'divider',        x: 740, y: 20,  width: 20,  height: 340, zIndex: 4, collapsed: false, config: { orientation: 'vertical', style: 'dotted' } },
  { id: '', type: 'paragraph',      x: 780, y: 20,  width: 360, height: 280, zIndex: 5, collapsed: false, config: { content: '' } }
];
```

### TEMPLATE_ATMOSPHERE — Audio-heavy scene

Scene image left, fade divider, music + ambience + soundboard stacked right.

```javascript
const TEMPLATE_ATMOSPHERE = [
  { id: '', type: 'scene-image', x: 20,  y: 20,  width: 480, height: 340, zIndex: 1, collapsed: false, config: {} },
  { id: '', type: 'divider',     x: 520, y: 20,  width: 20,  height: 340, zIndex: 2, collapsed: false, config: { orientation: 'vertical', style: 'fade' } },
  { id: '', type: 'music',       x: 560, y: 20,  width: 240, height: 260, zIndex: 3, collapsed: false, config: { sourceType: null, sourceId: null, sourceName: null, volume: 1.0 } },
  { id: '', type: 'ambience',    x: 560, y: 300, width: 240, height: 260, zIndex: 4, collapsed: false, config: { sourceType: null, sourceId: null, sourceName: null, sourceLayerCount: 0, sourceTrackIds: [], trackId: null, trackName: null, volume: 1.0 } },
  { id: '', type: 'soundboard',  x: 560, y: 580, width: 240, height: 260, zIndex: 5, collapsed: false, config: { soundId: null, soundName: null, volume: 1.0 } }
];
```

### TEMPLATE_THEATER — Theater of Mind (no scene image)

Pure prose — teleprompter + inspiration + ornamental divider + paragraph. No scene-image widget.

```javascript
const TEMPLATE_THEATER = [
  { id: '', type: 'teleprompter', x: 20,  y: 20,  width: 210, height: 44,  zIndex: 1, collapsed: false, config: { content: '', title: '', chipColor: '#7c5cbf', fontSize: 14, scrollSpeed: 40 } },
  { id: '', type: 'inspiration',  x: 20,  y: 80,  width: 210, height: 44,  zIndex: 2, collapsed: false, config: { items: [], title: '', chipColor: '#7c5cbf' } },
  { id: '', type: 'divider',      x: 20,  y: 140, width: 360, height: 20,  zIndex: 3, collapsed: false, config: { orientation: 'horizontal', style: 'ornamental' } },
  { id: '', type: 'paragraph',    x: 20,  y: 180, width: 360, height: 280, zIndex: 4, collapsed: false, config: { content: '' } }
];
```

### TEMPLATE_BLANK — Empty canvas

User builds from scratch; no widgets pre-placed.

```javascript
const TEMPLATE_BLANK = [];
```

---

## Widget Overrides

The `widget_overrides` field on a scene input lets callers patch specific widget configs
without needing to know all widget coordinates. Overrides are applied by `resolveTemplate`
before the widget array is embedded in the Step 5 script.

**Override by type (most common):** Set `widget_type` to target the first widget of that type:

```json
{
  "widget_type": "paragraph",
  "config_patch": { "content": "<p>Custom scene description here.</p>" }
}
```

**Override by index (when the same type appears multiple times):** Set `widget_index`:

```json
{
  "widget_type": "divider",
  "widget_index": 1,
  "config_patch": { "style": "solid" }
}
```

**Common override recipes:**

| Goal | widget_type | config_patch |
|------|-------------|--------------|
| Set teleprompter title to scene name | `teleprompter` | `{ "title": "<scene name>" }` |
| Pre-fill paragraph with description | `paragraph` | `{ "content": "<p>HTML prose here.</p>" }` |
| Seed checklist items | `checklist` | `{ "items": [{"id": "...", "text": "Find the key", "done": false}] }` |
| Seed inspiration chips | `inspiration` | `{ "items": ["The Gremori persona", "Possession symptoms"] }` |
| Pre-configure progress clocks | `progress-clock` | `{ "clocks": [{"id": "...", "label": "Clock", "segments": 4, "filled": 0}] }` |

---

## Upsert Behavior

| Entity | Upsert key | On re-run |
|--------|------------|-----------|
| Session | `name` (stable across runs) | Metadata (`icon`, `color`) updated; `id` and `beats[]` preserved. |
| Beat | `title` within session (stable) | `text`, `image`, `color` updated; `id` and `scenes[]` preserved. |
| Scene | `title` within beat (stable) | `exaltedSceneId` updated; widget array **replaced wholesale** (Phase 4 default — see Pitfall 1 below). |
| Widget IDs | N/A | Regenerated on every re-run via `foundry.utils.randomID()`. Widget IDs are not cross-referenced externally. |

**Pitfall 1 — Widget wholesale replace:** If the user has manually added or rearranged widgets
in the SessionFlow UI since the last `prep-sessionflow-case` run, those changes will be lost on
re-run. Phase 4 default is intentionally destructive to guarantee the template-specified layout
is always authoritative. A `--merge` flag (Phase 4.1 TODO) will allow skipping the replace when
`hadWidgets === true`.

**Pitfall 3 — Concurrent UI write:** If the SessionFlow panel is open while this skill writes
to `sessionflow.sessions`, the panel's debounced auto-save may fire and clobber the write. Step 1
prompts the user to close the panel before continuing.

---

## Failure Modes

| Failure | Behaviour |
|---------|-----------|
| SessionFlow module not installed | Step 1 check returns `error: 'sessionflow module not installed'` → skill exits immediately. |
| SessionFlow module installed but not active | Step 1 check returns `error: 'sessionflow module installed but not active'` → skill exits immediately. |
| Wrong SessionFlow version | WARNING printed; execution continues. If widgets fail to render, user must pin to 0.5.0. |
| execute_js DENY_LIST hit | Should not occur — all templates hand-reviewed to exclude forbidden substrings. If hit, a widget config string contains a forbidden substring — escalate to user for inspection. |
| `game.settings.set` throws | Skill surfaces the error and exits Step 3/4/5. State file is NOT updated. Re-run reconciles on next attempt (upsert safety). |
| Session not found at verify (Step 7) | Verification probe returns `error` → skill prints failure and reports write did not persist. Check for concurrent panel write (Pitfall 3). |
| execute_js returns `null` or empty body | `execute_js` relay returned malformed response. Retry once; if still failing, check relay health. |

---

## Outputs

- `sessionflow.sessions` updated in the live Foundry world with the case shell.
- `.foundry-prep/{case_slug}.json` → `state.sessionflow` populated with `session_id`, `beats`
  (keyed by title → `{ beat_id, scenes: { title → scene_id } }`).
- Printed summary showing beat count, scene count, and total widget count.

---

## Anti-Patterns

- **Do NOT** write SessionFlow data via `game.scenes.get(id).flags['sessionflow']` — SessionFlow
  uses a world-scoped game setting (`sessionflow.sessions`), NOT scene flags. This is a critical
  finding from RESEARCH §R-01.
- **Do NOT** hand-roll widget arrays per scene — always start from a template via `resolveTemplate`
  and override only the fields that differ.
- **Do NOT** use any of the execute_js DENY_LIST patterns in script templates — see `mcp/src/client.ts`
  for the full list. Templates in this file have been hand-reviewed and are DENY_LIST-clean.
- **Do NOT** call `execute_js` with a `code:` field — the relay expects `script:` (Phase 3 finding,
  PITFALLS.md).
- **Do NOT** use `Array.from(game.modules)` — use `game.modules.contents` (Phase 3 finding).
- **Do NOT** skip `JSON.stringify(...)` when embedding any user-supplied string inside a script
  template — raw string concatenation creates injection risk (Threat T-04-11).
- **Do NOT** assume `sessionflow.sessions` exists — always use `?? []` fallback on `game.settings.get`.
