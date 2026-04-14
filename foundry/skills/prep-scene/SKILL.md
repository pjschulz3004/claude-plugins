---
name: prep-scene
description: Create or update a single Foundry scene with background image and optional token placements. Wraps the create_scene and place_token MCP tools for upsert safety. Resolves background path under worlds/wyrd-berlin/assets/scenes/ using the shared art-path-resolver. Use when the user names ONE scene. For full case prep with multiple scenes + NPCs, use /foundry:prep-case.
---

# prep-scene

Create or update a single Foundry scene.

## When to Use

- The user names ONE scene and asks for it in Foundry with a background and tokens.
- The `/foundry:prep-case` orchestrator invokes this skill once per scene in the case concept's scene list.
- User is iterating on a scene's token placements and wants re-run safety.

**Do NOT use** when the user wants full case prep — use `/foundry:prep-case` instead.

## Inputs

Parse from `$ARGUMENTS` or conversation context. Minimum required:

- `name` — scene display name (upsert key). Example: `"Späti (Night)"`.

Optional:

- `slug_override` — if not provided, auto-derived via slugify. Example: `"spaeti_night"`.
- `width` — scene canvas width in px. Default: `4000`.
- `height` — scene canvas height in px. Default: `3000`.
- `variant` — appended to the canonical base path (e.g., `"night"` produces `scenes/spaeti/spaeti_night`). Default: none (base scene image).
- `background_override` — explicit Data-root-relative path. Skips resolver lookup.
- `activate` — whether to activate the scene after creation. Default: `false`.
- `navigation` — whether to show in scene nav. Default: `true`.
- `tokens` — array of `{ npc_name, x, y, disposition? }` for token placement.

Input example:

```json
{
  "name": "Späti (Night)",
  "slug_override": "spaeti",
  "variant": "night",
  "width": 4000,
  "height": 3000,
  "tokens": [
    { "npc_name": "Gremori", "x": 1200, "y": 800, "disposition": -1 },
    { "npc_name": "Lisa", "x": 1400, "y": 850, "disposition": 0 }
  ]
}
```

## Execution Steps

### Step 1 — Slugify the name (or use override)

Inline the slugify rule (copy from `skills/_shared/art-path-resolver/SKILL.md`):

```javascript
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'ss')
    .replace(/[äöü]/g, c => ({ä:'a',ö:'o',ü:'u'}[c]))
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
```

If `slug_override` is provided, use it. Otherwise slugify the scene name. For `"Späti (Night)"` with default slugify this yields `"spaeti_night"`; but since we ALSO pass a `variant`, the base filename logic depends on whether the scene represents an atomic image or a variant of a base.

**Convention:** For scenes with variants (time of day, mood), use `slug_override` to separate the base slug from the variant. Example: slug = `spaeti`, variant = `night`, produces base path `scenes/spaeti/spaeti_night`. If no variant is provided, the base path is just `scenes/spaeti/spaeti`.

### Step 2 — Resolve the background path (unless background_override is set)

1. Compute `basePath`:
   - If `variant` is set: `"worlds/wyrd-berlin/assets/scenes/" + slug + "/" + slug + "_" + variant`
   - Else: `"worlds/wyrd-berlin/assets/scenes/" + slug + "/" + slug`

2. Read `.foundry-prep/{case_slug}.json` (if it exists — orchestrated mode).

3. Call `resolveArtPath(basePath, state.art_inventory)`:
   - Returns a `.webp` or `.png` path → use as `background`.
   - Returns `null` → try fallback lookup order:
     - `exalted-scenes/scenes/imported/{slug}` (try `.png` then `.webp` — legacy flat directory per RESEARCH §R-02)
     - `exalted-scenes/scenes/imported/{slug}_{variant}` (if variant is set)
   - If all fallbacks return null → omit `background` field AND record in `state.missing_art.scenes[]`.

4. If invoked standalone (no state file) and no `background_override` is set, omit the `background` field entirely. Do NOT guess paths.

```javascript
function resolveArtPath(basePath, inventory) {
  for (const ext of ['.webp', '.png']) {
    const candidate = basePath + ext;
    if (inventory[candidate]) return candidate;
  }
  return null;
}
```

### Step 3 — Call create_scene

Invoke the `create_scene` MCP tool:

```json
{
  "name": "Späti (Night)",
  "background": "worlds/wyrd-berlin/assets/scenes/spaeti/spaeti_night.webp",
  "width": 4000,
  "height": 3000,
  "activate": false,
  "navigation": true
}
```

`create_scene` handles upsert by exact name match. Capture the returned `{ id, name }`.

### Step 4 — Place tokens (if any)

For each token in the `tokens[]` input:

1. Verify the actor exists via `list_actors` with filter by name. (If invoked in orchestrated mode, check `state.npcs[]` first for the actor id.)
2. Call `place_token` with:

```json
{
  "scene_name": "Späti (Night)",
  "actor_name": "Gremori",
  "x": 1200,
  "y": 800,
  "disposition": -1
}
```

3. Record the returned `tokenId` in `state.scenes[].tokens[]`.

**Pitfall guard**: If the actor does not exist, print a clear error and skip that token — do NOT create a ghost actor. This is R-15 territory (cross-reference integrity). If this happens in orchestrated mode, record a placeholder in `state.uuid_placeholders_unresolved[]` so link-references can surface it.

### Step 5 — Record in state file

If invoked by prep-case (state file exists), append to `state.scenes[]`:

```json
{
  "input_name": "Späti (Night)",
  "slug": "spaeti",
  "variant": "night",
  "foundry_scene_id": "<returned id>",
  "foundry_scene_uuid": "Scene.<returned id>",
  "background_path": "<resolved path or null>",
  "tokens": [
    { "actor_name": "Gremori", "actor_id": "<id>", "token_id": "<id>", "x": 1200, "y": 800 }
  ]
}
```

### Step 6 — Verify

Call `list_scenes` and confirm the scene is present with the expected filtered fields: `id, name, active, thumbnail, navigation`.

Print summary:

```
prep-scene OK: "<name>" → Scene.<id>
  background: <resolved path or "default">
  tokens: <n> placed
```

## Upsert Behavior

- Re-running `prep-scene` with the same `name` updates the existing scene in place (preserves the `_id`).
- Token placements are NOT automatically de-duped by `place_token` — re-running adds additional tokens at the same coordinates. The `prep-case` orchestrator checks `state.scenes[].tokens[]` before re-placing. Standalone re-runs require the user to delete old tokens first (via `execute_js` removing from the scene's tokens collection) — this is a known Phase 4 limitation.
- Background replacement IS in-place on upsert (no duplicate scenes).

## Failure Modes

- **Relay down** → `create_scene` returns `RELAY_DOWN`. Skill prints and exits.
- **Background not found in any root** → `background: null`. Skill continues, logs to `missing_art.scenes[]`.
- **Actor not found for token placement** → token skipped, placeholder recorded in `uuid_placeholders_unresolved[]`.
- **place_token returns error** → skill continues to next token; does NOT bail out on a single token failure (scene creation is the primary deliverable).

## Outputs

- New or updated Foundry scene.
- Zero or more tokens placed on the scene.
- Appended entry in `state.scenes[]` (orchestrated mode).
- Printed summary.

## Anti-Patterns

- **Do NOT** hardcode the background path. Always run through `resolveArtPath`.
- **Do NOT** guess image formats — resolver picks `.webp` or `.png`.
- **Do NOT** use `exalted-scenes/` as canonical (it is LEGACY fallback only per CONTEXT addendum §A-01′).
- **Do NOT** call `place_token` without verifying the actor exists — this creates orphan references.
- **Do NOT** skip the Step 6 `list_scenes` verification — it proves the scene is discoverable.
