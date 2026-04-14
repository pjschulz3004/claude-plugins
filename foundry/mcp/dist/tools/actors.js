import { z } from "zod";
import { executeJs, makeError, withRetry, relayCreateEntity, relayUpdateEntity, relayDeleteEntity, } from "../client.js";
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
        const result = await withRetry(() => executeJs(`return JSON.stringify(game.actors.contents.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          img: a.img ?? "",
          alias: a.system?.alias ?? "",
          mythos: a.system?.mythos ?? "",
          logos: a.system?.logos ?? ""
        })));`));
        let actors = (Array.isArray(result) ? result : []);
        if (type) {
            actors = actors.filter((a) => a.type === type);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(actors, null, 2) }],
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
/**
 * Find an actor id by name via execute-js (game.actors.getName).
 * Returns the actor id or null if not found.
 */
async function findActorIdByName(name) {
    const result = await executeJs(`return JSON.stringify(game.actors.getName(${JSON.stringify(name)})?.id ?? null);`);
    return typeof result === "string" && result.length > 0 ? result : null;
}
export async function createActorHandler(params) {
    try {
        // Step 1: Upsert check — find existing actor by name via execute-js
        const existingId = await withRetry(() => findActorIdByName(params.name));
        let actorId;
        if (existingId) {
            // UPDATE existing actor
            actorId = existingId;
            const updates = { name: params.name };
            if (params.alias !== undefined)
                updates["system.alias"] = params.alias;
            if (params.mythos !== undefined)
                updates["system.mythos"] = params.mythos;
            if (params.logos !== undefined)
                updates["system.logos"] = params.logos;
            if (params.short_description !== undefined) {
                updates["system.short_description"] = params.short_description;
            }
            if (params.img !== undefined)
                updates.img = params.img;
            await withRetry(() => relayUpdateEntity(`Actor.${actorId}`, updates));
        }
        else {
            // CREATE new actor — POST /create with {entityType, data}
            const data = {
                name: params.name,
                type: params.type ?? "threat",
            };
            const system = {};
            if (params.alias !== undefined)
                system.alias = params.alias;
            if (params.mythos !== undefined)
                system.mythos = params.mythos;
            if (params.logos !== undefined)
                system.logos = params.logos;
            if (params.short_description !== undefined) {
                system.short_description = params.short_description;
            }
            if (Object.keys(system).length > 0)
                data.system = system;
            if (params.img !== undefined)
                data.img = params.img;
            const created = await withRetry(() => relayCreateEntity("Actor", data));
            // Relay returns uuid as "Actor.xxx"; strip the prefix for actorId.
            actorId = created.uuid.replace(/^Actor\./, "") ||
                String(created.entity._id ?? "");
        }
        // Step 2: Embed CoM items via execute-js (D-15)
        // Order: theme → tags (power, weakness) → gm_moves
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
                const themeResult = (await executeJs(themeScript));
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
// update_actor — find by name then PUT /update
// ---------------------------------------------------------------------------
export const updateActorInputSchema = {
    name: z.string().describe("Actor name to find (exact match)"),
    updates: z
        .record(z.unknown())
        .describe("Fields to update. Use dot notation for system fields (e.g., 'system.alias')"),
};
export async function updateActorHandler(params) {
    try {
        const actorId = await withRetry(() => findActorIdByName(params.name));
        if (!actorId) {
            return makeError(`Actor not found: "${params.name}". Run list_actors to check spelling.`, "NOT_FOUND");
        }
        await withRetry(() => relayUpdateEntity(`Actor.${actorId}`, params.updates));
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
        const actorId = await withRetry(() => findActorIdByName(params.name));
        if (!actorId) {
            return makeError(`Actor not found: "${params.name}". Run list_actors to check spelling.`, "NOT_FOUND");
        }
        await withRetry(() => relayDeleteEntity(`Actor.${actorId}`));
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