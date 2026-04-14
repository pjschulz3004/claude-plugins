---
name: prep-npc
description: Create or update a single City of Mist NPC (threat, danger, or extra) with full character sheet — mythos/logos/alias, themes, power tags, weakness tags, and GM moves. Wraps the create_actor MCP tool for upsert safety. Use when the user names ONE NPC and wants it populated in Foundry. For full case prep with multiple NPCs + scenes + journals, use /foundry:prep-case instead.
---

# prep-npc

Create or update a single City of Mist NPC in the live Foundry world.

## When to Use

- The user names ONE NPC and asks for it to be created in Foundry with CoM fields populated.
- The `/foundry:prep-case` orchestrator invokes this skill once per NPC in the case concept's NPC list.
- The user is iterating on a single NPC's themes/tags/moves and wants to re-run without duplicating.

**Do NOT use** when the user wants full case prep — use `/foundry:prep-case` instead.

## Inputs

Parse from `$ARGUMENTS` or conversation context. Minimum required:

- `name` — NPC display name (upsert key). Example: `"Gremori"`.
- `type` — one of `threat`, `character`, `crew`. Default: `threat` (matches CoM GM NPCs).

Optional but recommended for CoM threats:

- `alias` — character alias (`system.alias`). Example: `"The Possession"`.
- `mythos` — mythos identity (`system.mythos`). Example: `"Goetic Spirit"`.
- `logos` — logos identity (`system.logos`). Example: `"Lisa's Body"`.
- `short_description` — one-line hook (`system.short_description`).
- `themes` — array of `{ name, subtype ('Mythos'|'Logos'), mystery?, power_tags?, weakness_tags?, gm_moves? }`.
- `img_override` — explicit Data-root-relative path if the caller already knows where the portrait lives. Skips art path resolution.

Input example (pretty-printed for clarity — the skill body accepts it as a JSON-shaped description in conversation):

```json
{
  "name": "Gremori",
  "type": "threat",
  "alias": "The Possession",
  "mythos": "Goetic Spirit",
  "logos": "Lisa's Body",
  "short_description": "A Goetic spirit inhabiting Lisa Lauterbach's body.",
  "themes": [
    {
      "name": "Crown of Serenity",
      "subtype": "Mythos",
      "mystery": "What will I do when peace is broken?",
      "power_tags": [
        { "name": "unshakable calm" },
        { "name": "hypnotic presence" }
      ],
      "weakness_tags": [
        { "name": "cannot raise my voice" }
      ],
      "gm_moves": [
        { "name": "Silence a protest", "subtype": "soft" },
        { "name": "Paralyze with a glance", "subtype": "hard" }
      ]
    }
  ]
}
```

## Execution Steps

### Step 1 — Slugify the name

Inline the slugify rule (copy from `skills/_shared/art-path-resolver/SKILL.md` — do NOT try to `import`):

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

For `"Gremori"` this produces `"gremori"`.

### Step 2 — Resolve the portrait path (unless img_override is set)

Read `.foundry-prep/{case_slug}.json` (if it exists — when this skill is invoked standalone outside of prep-case, the state file may not exist; skip to reference-safe mode in that case).

1. Compute `basePath = "worlds/wyrd-berlin/assets/npc/" + slug + "/" + slug`
2. Call `resolveArtPath(basePath, state.art_inventory)`:
   - If it returns a `.webp` or `.png` path → use that as `img`.
   - If it returns `null` → try the fallback lookup order documented in `skills/_shared/art-path-resolver/SKILL.md`:
     - `assets/Wyrd/NPC/{slug}` (try `.png` then `.webp`)
     - `exalted-scenes/characters/{slug}/{slug}-nobg` (try `.png` then `.webp`)
     - `exalted-scenes/characters/{slug}/{slug}_portrait` (try `.png` then `.webp`)
   - If ALL return null → omit the `img` field entirely (Foundry uses default icon) AND record the slug in `state.missing_art.npc[]` for the link-references stage to surface.

If there is no prep-case state file (skill invoked standalone), skip the inventory lookup and either:
- Use `img_override` if the caller supplied one.
- Emit NO `img` field. Let Foundry default it. Do NOT hallucinate a path.

```javascript
function resolveArtPath(basePath, inventory) {
  for (const ext of ['.webp', '.png']) {
    const candidate = basePath + ext;
    if (inventory[candidate]) return candidate;
  }
  return null;
}
```

### Step 3 — Call create_actor

Invoke the `create_actor` MCP tool with the following shape:

```json
{
  "name": "<name>",
  "type": "<type>",
  "alias": "<alias>",
  "mythos": "<mythos>",
  "logos": "<logos>",
  "short_description": "<short_description>",
  "img": "<resolved_path_or_omitted>",
  "themes": [
    {
      "name": "<theme name>",
      "subtype": "Mythos",
      "mystery": "<mystery question>",
      "power_tags": [ { "name": "<tag name>", "question": "..." } ],
      "weakness_tags": [ { "name": "<tag name>" } ],
      "gm_moves": [ { "name": "<move>", "subtype": "soft", "description": "..." } ]
    }
  ]
}
```

The `create_actor` tool already handles:
- Upsert by exact name match (POST /get → find by name → PUT /update OR POST /create).
- CoM item embedding via execute_js `createEmbeddedDocuments` (theme → power_tags → weakness_tags → gm_moves).
- Validation via Zod schemas.

Do NOT try to embed themes/tags/moves via a separate execute_js call. `create_actor` already does this internally — see `mcp/src/tools/actors.ts` for the embedding loop.

### Step 4 — Record in state file

If invoked by prep-case orchestrator (state file exists), append to `state.npcs[]`:

```json
{
  "input_name": "Gremori",
  "slug": "gremori",
  "foundry_actor_id": "<returned id>",
  "foundry_actor_uuid": "Actor.<returned id>",
  "img_path": "<resolved path or null>",
  "themes_count": 1,
  "power_tags_count": 2,
  "weakness_tags_count": 1,
  "gm_moves_count": 2
}
```

Use the Bash/Edit tools to write the state file. Keep it parseable JSON — format with 2-space indent.

If invoked standalone (no state file), just print the returned `{ id, name }` to the user and STOP.

### Step 5 — Verify with list_actors

Call `list_actors` with the matching `type` filter and confirm the new actor appears in the filtered response. Expected fields in the response: `id, name, type, img, alias, mythos, logos` — NOT raw `system.*` blobs.

Print a summary:

```
prep-npc OK: "<name>" (<type>) → Actor.<id>
  themes: <n>, power_tags: <n>, weakness_tags: <n>, gm_moves: <n>
  img: <resolved path or "default">
```

## Upsert Behavior

- Re-running prep-npc with the same `name` updates the existing actor in place.
- Theme/tag/move items are RE-EMBEDDED on every run (create_actor does not de-dupe item embeddings).
- **Pitfall**: Running prep-npc twice for the same NPC will create duplicate theme items on the actor. This is a known limitation of `create_actor` — it upserts the actor but does not de-dupe embedded items. The `prep-case` orchestrator works around this by checking `state.npcs[].themes_count` before re-running. For standalone invocations, the user should `delete_actor` first if they want a clean re-run.

## Failure Modes

- **Relay down** → `create_actor` returns `RELAY_DOWN` error. Skill prints the error and exits.
- **Auth failed** → `AUTH_FAILED` error. Skill prompts user to check `FOUNDRY_API_KEY`.
- **Deny list hit** → Should not happen for prep-npc (no scripts mention deleteDocuments etc.). If it does, the theme/tag/move name contains a forbidden substring — escalate to user.
- **Missing portrait** → `img_path: null` in state file. Skill continues and logs to `missing_art.npc[]`.
- **CoM system not installed** → `createEmbeddedDocuments` throws. Skill surfaces the error — user must install City of Mist system in Foundry.

## Outputs

- New or updated Foundry actor (visible in game.actors by name).
- Appended entry in `.foundry-prep/{case_slug}.json` → `state.npcs[]` (if orchestrated).
- Printed summary with id, theme/tag/move counts, and img path.

## Anti-Patterns

- **Do NOT** call `execute_js` directly with `actor.createEmbeddedDocuments` — use `create_actor` which already does this.
- **Do NOT** hardcode the portrait path in the template. Always run it through `resolveArtPath`.
- **Do NOT** use `exalted-scenes/` as the canonical path (it is LEGACY per CONTEXT addendum §A-01′).
- **Do NOT** skip the Step 5 `list_actors` verification — it's a R-05 UAT assertion (filtered fields, no raw blobs).
