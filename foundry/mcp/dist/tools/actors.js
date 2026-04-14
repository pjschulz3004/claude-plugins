import { z } from "zod";
import { foundryFetch, executeJs, makeError, withRetry } from "../client.js";
function filterActor(raw) {
    const system = (raw.system ?? {});
    return {
        id: String(raw._id ?? ""),
        name: String(raw.name ?? ""),
        type: String(raw.type ?? ""),
        img: String(raw.img ?? ""),
        alias: String(system.alias ?? ""),
        mythos: String(system.mythos ?? ""),
        logos: String(system.logos ?? ""),
    };
}
// ---------------------------------------------------------------------------
// list_actors — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listActorsInputSchema = {
    type: z
        .enum(["character", "threat", "crew"])
        .optional()
        .describe("Filter by actor type. Omit to return all actors."),
};
export async function listActorsHandler({ type, }) {
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Actor" },
        }));
        const actors = (Array.isArray(raw) ? raw : []);
        let filtered = actors.map(filterActor);
        if (type) {
            filtered = filtered.filter((a) => a.type === type);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
// ---------------------------------------------------------------------------
// create_actor — D-06 upsert + D-15 CoM item embedding
// ---------------------------------------------------------------------------
const PowerTagSchema = z.object({
    name: z.string(),
    question: z.string().optional(),
    question_letter: z.string().optional(),
});
const WeaknessTagSchema = z.object({
    name: z.string(),
    question: z.string().optional(),
    question_letter: z.string().optional(),
});
const GmMoveSchema = z.object({
    name: z.string(),
    subtype: z.enum(["soft", "hard"]).default("soft"),
    description: z.string().optional(),
});
const ThemeSchema = z.object({
    name: z.string(),
    subtype: z.enum(["Mythos", "Logos"]),
    mystery: z.string().optional(),
    power_tags: z.array(PowerTagSchema).optional(),
    weakness_tags: z.array(WeaknessTagSchema).optional(),
    gm_moves: z.array(GmMoveSchema).optional(),
});
export const createActorInputSchema = {
    name: z.string().describe("Actor name (used for upsert matching)"),
    type: z
        .enum(["character", "threat", "crew"])
        .default("threat")
        .describe("Actor type. Default: threat"),
    alias: z.string().optional().describe("Character alias (system.alias)"),
    mythos: z.string().optional().describe("Mythos identity (system.mythos)"),
    logos: z.string().optional().describe("Logos identity (system.logos)"),
    short_description: z
        .string()
        .optional()
        .describe("Short description (system.short_description)"),
    img: z.string().optional().describe("Token image path"),
    themes: z
        .array(ThemeSchema)
        .optional()
        .describe("CoM themes with tags and moves. Items embedded via execute-js."),
};
export async function createActorHandler(params) {
    try {
        // Step 1: Upsert check — POST /get to find existing actor by name
        const existing = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Actor", name: params.name },
        }));
        const existingActors = (Array.isArray(existing) ? existing : []);
        const found = existingActors.find((a) => String(a.name) === params.name);
        let actorId;
        if (found) {
            // UPDATE existing actor
            actorId = String(found._id);
            await withRetry(() => foundryFetch("/update", {
                method: "PUT",
                body: {
                    uuid: actorId,
                    name: params.name,
                    ...(params.alias !== undefined && { "system.alias": params.alias }),
                    ...(params.mythos !== undefined && { "system.mythos": params.mythos }),
                    ...(params.logos !== undefined && { "system.logos": params.logos }),
                    ...(params.short_description !== undefined && {
                        "system.short_description": params.short_description,
                    }),
                    ...(params.img !== undefined && { img: params.img }),
                },
            }));
        }
        else {
            // CREATE new actor via REST
            const created = await withRetry(() => foundryFetch("/create", {
                method: "POST",
                body: {
                    type: "Actor",
                    name: params.name,
                    "data.type": params.type ?? "threat",
                    ...(params.alias !== undefined && { "data.system.alias": params.alias }),
                    ...(params.mythos !== undefined && { "data.system.mythos": params.mythos }),
                    ...(params.logos !== undefined && { "data.system.logos": params.logos }),
                    ...(params.short_description !== undefined && {
                        "data.system.short_description": params.short_description,
                    }),
                    ...(params.img !== undefined && { "data.img": params.img }),
                },
            }));
            actorId = String(created._id);
        }
        // Step 2: Embed CoM items via execute-js (D-15)
        // Order: theme → tags (power, weakness) → gm_moves
        // Each item batch needs theme_id from the previous theme creation
        if (params.themes && params.themes.length > 0) {
            for (const theme of params.themes) {
                // 2a. Create theme item
                const themeScript = `
          const actor = game.actors.get("${actorId}");
          const result = await actor.createEmbeddedDocuments('Item', [{
            name: ${JSON.stringify(theme.name)},
            type: "theme",
            system: {
              mystery: ${JSON.stringify(theme.mystery ?? "")},
              subtype: ${JSON.stringify(theme.subtype)}
            }
          }]);
          return JSON.stringify(result.map(i => ({ id: i.id, name: i.name })));
        `;
                const themeResult = await executeJs(themeScript);
                const themeItemId = Array.isArray(themeResult) && themeResult[0]
                    ? themeResult[0].id
                    : "";
                // 2b. Create power tags
                if (theme.power_tags && theme.power_tags.length > 0) {
                    for (const tag of theme.power_tags) {
                        const tagScript = `
              const actor = game.actors.get("${actorId}");
              const result = await actor.createEmbeddedDocuments('Item', [{
                name: ${JSON.stringify(tag.name)},
                type: "tag",
                system: {
                  subtype: "power",
                  theme_id: "${themeItemId}",
                  question: ${JSON.stringify(tag.question ?? "")},
                  question_letter: ${JSON.stringify(tag.question_letter ?? "")}
                }
              }]);
              return JSON.stringify({ ok: true });
            `;
                        await executeJs(tagScript);
                    }
                }
                // 2c. Create weakness tags
                if (theme.weakness_tags && theme.weakness_tags.length > 0) {
                    for (const tag of theme.weakness_tags) {
                        const tagScript = `
              const actor = game.actors.get("${actorId}");
              const result = await actor.createEmbeddedDocuments('Item', [{
                name: ${JSON.stringify(tag.name)},
                type: "tag",
                system: {
                  subtype: "weakness",
                  theme_id: "${themeItemId}",
                  question: ${JSON.stringify(tag.question ?? "")},
                  question_letter: ${JSON.stringify(tag.question_letter ?? "")}
                }
              }]);
              return JSON.stringify({ ok: true });
            `;
                        await executeJs(tagScript);
                    }
                }
                // 2d. Create GM moves
                if (theme.gm_moves && theme.gm_moves.length > 0) {
                    for (const move of theme.gm_moves) {
                        const moveScript = `
              const actor = game.actors.get("${actorId}");
              const result = await actor.createEmbeddedDocuments('Item', [{
                name: ${JSON.stringify(move.name)},
                type: "gmmove",
                system: {
                  subtype: ${JSON.stringify(move.subtype ?? "soft")},
                  description: ${JSON.stringify(move.description ?? "")},
                  theme_id: "${themeItemId}"
                }
              }]);
              return JSON.stringify({ ok: true });
            `;
                        await executeJs(moveScript);
                    }
                }
            }
        }
        // Step 3: Return {id, name} per D-05
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: actorId, name: params.name }),
                },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        if (/BLOCKED/i.test(msg))
            return makeError(msg, "VALIDATION_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
// ---------------------------------------------------------------------------
// update_actor — D-06 find by name then PUT /update
// ---------------------------------------------------------------------------
export const updateActorInputSchema = {
    name: z.string().describe("Actor name to find (exact match)"),
    updates: z
        .record(z.unknown())
        .describe("Fields to update. Use dot notation for system fields (e.g., 'system.alias')"),
};
export async function updateActorHandler(params) {
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Actor", name: params.name },
        }));
        const actors = (Array.isArray(raw) ? raw : []);
        const found = actors.find((a) => String(a.name) === params.name);
        if (!found) {
            return makeError(`Actor not found: "${params.name}". Run list_actors to check spelling.`, "NOT_FOUND");
        }
        const actorId = String(found._id);
        await withRetry(() => foundryFetch("/update", {
            method: "PUT",
            body: { uuid: actorId, ...params.updates },
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: actorId, name: params.name }),
                },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
// ---------------------------------------------------------------------------
// delete_actor — D-03 confirm guard
// ---------------------------------------------------------------------------
export const deleteActorInputSchema = {
    name: z.string().describe("Actor name to delete (exact match)"),
    confirm: z
        .boolean()
        .describe("Must be true to confirm deletion. Prevents accidental deletion of objects with @UUID cross-references."),
};
export async function deleteActorHandler(params) {
    if (!params.confirm) {
        return makeError("Deletion requires confirm: true. This actor may have @UUID cross-references in journals.", "VALIDATION_FAILED");
    }
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Actor", name: params.name },
        }));
        const actors = (Array.isArray(raw) ? raw : []);
        const found = actors.find((a) => String(a.name) === params.name);
        if (!found) {
            return makeError(`Actor not found: "${params.name}". Run list_actors to check spelling.`, "NOT_FOUND");
        }
        const actorId = String(found._id);
        await withRetry(() => foundryFetch("/delete", {
            method: "DELETE",
            body: { uuid: actorId },
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: actorId, name: params.name, deleted: true }),
                },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
//# sourceMappingURL=actors.js.map