---
name: _shared/art-path-resolver
description: Internal helper skill. Not user-invocable. Documents the canonical art root (worlds/wyrd-berlin/assets/), the slugify rule, the one-shot inventory scan, and the format-agnostic resolveArtPath lookup. Referenced by prep-npc, prep-scene, prep-character-panel, prep-case, link-references. Do not auto-invoke.
disable-model-invocation: true
---

# _shared/art-path-resolver

Internal reference skill. Not invoked directly by the user.

## Purpose

Every Phase 4 skill that emits an art path (portrait, scene background, widget src, item icon) MUST use the logic documented here so:

1. All paths are Data-root-relative (no absolute disk paths — satisfies CONTEXT addendum §H-01 host-topology constraint).
2. All paths live under `worlds/wyrd-berlin/assets/` (the Phase 4 canonical root per CONTEXT addendum §A-01′).
3. Format selection is automatic — `.webp` preferred, `.png` fallback (CONTEXT addendum §A-02′).
4. Legacy art roots (`assets/Wyrd/NPC/`, `exalted-scenes/characters/...`) are tolerated, not blocked, per ART-CONVENTION.md migration policy.

## Canonical Directory Shape

```
worlds/wyrd-berlin/assets/
├── npc/{slug}/
│   ├── {slug}                       (primary portrait, resolves .webp → .png)
│   ├── {slug}_{emotion}              (Phase 4.5 — emotion variants)
│   └── hero/{slug}_{pose}_{half|full} (Phase 4.5 — hero poses)
├── scenes/{slug}/
│   ├── {slug}                       (base scene image)
│   └── {slug}_{variant}              (time/mood/weather variants)
└── items/{slug}/
    ├── {slug}_handout
    ├── {slug}_icon
    └── {slug}_hero_half
```

All paths above are shown WITHOUT extensions — the resolver adds `.webp` or `.png` at lookup time.

World ID `wyrd-berlin` is hardcoded for Phase 4. Generalize via `--world-id` flag only if a second world is introduced.

## Slugify Rule (from RESEARCH §R-04)

Use this exact rule to convert an NPC name, scene name, or item name to a slug. Inline it in any execute_js template that needs slugs so the skill has zero TS imports:

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
// "Lisa Lauterbach" → "lisa_lauterbach"
// "Erik Müller"     → "erik_muller"
// "DJ Sandman (Danny)" → "dj_sandman_danny"
// "Straße der Träume"  → "strasse_der_traume"
```

Test coverage for this rule lives at `mcp/tests/helpers/slugify.test.ts`.

## Inventory Scan (run once per prep-case run)

The orchestrator (`/foundry:prep-case`) kicks off with a single `FilePicker.browse` walk that collects every file under:

- `worlds/wyrd-berlin/assets/npc` (canonical NPC root)
- `worlds/wyrd-berlin/assets/scenes` (canonical scenes root)
- `worlds/wyrd-berlin/assets/items` (canonical items root)
- `assets/Wyrd/NPC` (legacy — tolerated fallback)
- `exalted-scenes/characters` (legacy — tolerated fallback)
- `exalted-scenes/scenes/imported` (legacy — tolerated fallback)

Script template (pass through `execute_js`):

```javascript
async function walk(path) {
  try {
    const r = await FilePicker.browse('data', path);
    return { dirs: r.dirs ?? [], files: r.files ?? [] };
  } catch (e) {
    return { dirs: [], files: [], error: String(e.message ?? e) };
  }
}
const npcRoot = await walk('worlds/wyrd-berlin/assets/npc');
const sceneRoot = await walk('worlds/wyrd-berlin/assets/scenes');
const itemRoot = await walk('worlds/wyrd-berlin/assets/items');
const legacyWyrdNpc = await walk('assets/Wyrd/NPC');
const legacyExaltedChars = await walk('exalted-scenes/characters');
const legacyExaltedScenes = await walk('exalted-scenes/scenes/imported');

const npcDetail = {};
for (const slugDir of npcRoot.dirs) npcDetail[slugDir] = await walk(slugDir);
const sceneDetail = {};
for (const slugDir of sceneRoot.dirs) sceneDetail[slugDir] = await walk(slugDir);

const inventory = {};
for (const r of [npcRoot, sceneRoot, itemRoot, legacyWyrdNpc, legacyExaltedChars, legacyExaltedScenes]) {
  for (const f of (r.files ?? [])) inventory[f] = true;
}
for (const d of Object.values(npcDetail)) {
  for (const f of (d.files ?? [])) inventory[f] = true;
}
for (const d of Object.values(sceneDetail)) {
  for (const f of (d.files ?? [])) inventory[f] = true;
}
return JSON.stringify({ inventory, npcRoots: npcRoot.dirs, sceneRoots: sceneRoot.dirs });
```

Cache the returned `inventory` map in `.foundry-prep/{case_slug}.json` under the `art_inventory` key. Sub-skills read from the cache — they do NOT hit the relay for per-path checks.

## resolveArtPath Lookup (format-agnostic)

Given a base path without extension and the cached inventory map, return the first existing variant or `null`:

```javascript
function resolveArtPath(basePath, inventory) {
  for (const ext of ['.webp', '.png']) {
    const candidate = basePath + ext;
    if (inventory[candidate]) return candidate;
  }
  return null;
}
```

Unit test coverage: `mcp/tests/helpers/resolve-art-path.test.ts`.

## Legacy Fallback Lookup Order (when canonical path is null)

If `resolveArtPath('worlds/wyrd-berlin/assets/npc/gremori/gremori', inventory)` returns `null`, skills SHOULD try these fallback bases in order before giving up:

1. `assets/Wyrd/NPC/{slug}` — flat directory, legacy SessionFlow widget references live here
2. `exalted-scenes/characters/{slug}/{slug}-nobg` — early Exalted Scenes convention
3. `exalted-scenes/characters/{slug}/{slug}_portrait` — alternate early convention

If ALL fallbacks return null, the skill records an entry in `.foundry-prep/{case_slug}.json` under `missing_art: [...]` and proceeds WITHOUT an img field (Foundry uses the default actor icon). `link-references` surfaces the missing-art list in its final handoff output for the user to resolve with rsync.

## Path Shape Examples

| Input | Canonical base | Resolved path (hypothetical) |
|-------|----------------|------------------------------|
| NPC "Gremori" | `worlds/wyrd-berlin/assets/npc/gremori/gremori` | `worlds/wyrd-berlin/assets/npc/gremori/gremori.webp` |
| Scene "Späti (Night)" | `worlds/wyrd-berlin/assets/scenes/spaeti/spaeti_night` | `worlds/wyrd-berlin/assets/scenes/spaeti/spaeti_night.png` |
| Item "Blood Oath Contract" | `worlds/wyrd-berlin/assets/items/blood_oath_contract/blood_oath_contract_handout` | null (no art yet → recorded in missing_art) |

## Security Notes (CONTEXT §H-01, RESEARCH Security Domain)

- Skills MUST reject user-supplied `img` paths containing `..` (path traversal).
- Skills MUST reject absolute paths (`C:\`, `/home/`, `\\`).
- Slugs are `[a-z0-9_]` by construction — the slugify rule makes path traversal impossible from a name.

## Do NOT

- Do NOT hardcode `.webp` or `.png` in skill templates outside of this resolver.
- Do NOT call the relay's `/file-system` endpoint per-path; use the one-shot `execute_js` + `FilePicker.browse` inventory scan instead (RESEARCH §R-03 showed ~80-120ms per relay call vs ~200ms total for the whole inventory).
- Do NOT reference `exalted-scenes/` as the canonical root — it is LEGACY per CONTEXT addendum §A-01′.
- Do NOT skip the missing_art logging when the resolver returns null — silent failures break downstream @UUID rewriting.
