import { z } from "zod";
import { executeJs, makeError, withRetry, relayCreateEntity, relayUpdateEntity, relayDeleteEntity, } from "../client.js";
// ---------------------------------------------------------------------------
// list_scenes — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listScenesInputSchema = {};
export async function listScenesHandler(_args = {}) {
    try {
        const result = await withRetry(() => executeJs(`return JSON.stringify(game.scenes.contents.map(s => ({
          id: s.id,
          name: s.name,
          active: Boolean(s.active),
          thumbnail: s.thumb ?? "",
          navigation: Boolean(s.navigation)
        })));`));
        const scenes = (Array.isArray(result) ? result : []);
        return {
            content: [{ type: "text", text: JSON.stringify(scenes, null, 2) }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
/**
 * Find a scene id by name via execute-js (game.scenes.getName).
 */
async function findSceneIdByName(name) {
    const result = await executeJs(`return JSON.stringify(game.scenes.getName(${JSON.stringify(name)})?.id ?? null);`);
    return typeof result === "string" && result.length > 0 ? result : null;
}
// ---------------------------------------------------------------------------
// create_scene — upsert by name
// ---------------------------------------------------------------------------
export const createSceneInputSchema = {
    name: z.string().describe("Scene name (used for upsert matching)"),
    background: z.string().optional().describe("Background image path"),
    width: z
        .number()
        .optional()
        .default(4000)
        .describe("Scene width in pixels"),
    height: z
        .number()
        .optional()
        .default(3000)
        .describe("Scene height in pixels"),
    grid_size: z
        .number()
        .optional()
        .default(100)
        .describe("Grid size in pixels"),
    padding: z
        .number()
        .optional()
        .default(0.25)
        .describe("Padding ratio"),
    active: z
        .boolean()
        .optional()
        .describe("Activate scene after creation"),
};
export async function createSceneHandler(params) {
    try {
        // Upsert check via execute-js (there is NO /scene or list-by-type endpoint)
        const existingId = await withRetry(() => findSceneIdByName(params.name));
        let sceneId;
        if (existingId) {
            // UPDATE existing scene
            sceneId = existingId;
            const updates = {};
            if (params.background !== undefined)
                updates.background = { src: params.background };
            if (params.width !== undefined)
                updates.width = params.width;
            if (params.height !== undefined)
                updates.height = params.height;
            if (params.grid_size !== undefined)
                updates["grid.size"] = params.grid_size;
            if (params.padding !== undefined)
                updates.padding = params.padding;
            if (Object.keys(updates).length > 0) {
                await withRetry(() => relayUpdateEntity(`Scene.${sceneId}`, updates));
            }
        }
        else {
            // CREATE new scene — POST /create with {entityType: "Scene", data}
            const data = {
                name: params.name,
                width: params.width ?? 4000,
                height: params.height ?? 3000,
                grid: { size: params.grid_size ?? 100 },
                padding: params.padding ?? 0.25,
            };
            if (params.background !== undefined) {
                data.background = { src: params.background };
            }
            const created = await withRetry(() => relayCreateEntity("Scene", data));
            sceneId = created.uuid.replace(/^Scene\./, "") ||
                String(created.entity._id ?? "");
        }
        // Activate scene if requested — use execute-js since /switch-scene doesn't exist
        if (params.active === true) {
            await withRetry(() => executeJs(`const s = game.scenes.get("${sceneId}"); if (s) { await s.activate(); return "activated"; } return "missing";`));
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: sceneId, name: params.name }),
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
// delete_scene — D-03 confirm guard
// ---------------------------------------------------------------------------
export const deleteSceneInputSchema = {
    name: z.string().describe("Scene name to delete (exact match)"),
    confirm: z
        .boolean()
        .describe("Must be true to confirm deletion. Prevents accidental deletion of objects with @UUID cross-references."),
};
export async function deleteSceneHandler(params) {
    if (!params.confirm) {
        return makeError("Deletion requires confirm: true. This scene may have @UUID cross-references in journals.", "VALIDATION_FAILED");
    }
    try {
        const sceneId = await withRetry(() => findSceneIdByName(params.name));
        if (!sceneId) {
            return makeError(`Scene not found: "${params.name}". Run list_scenes to check spelling.`, "NOT_FOUND");
        }
        await withRetry(() => relayDeleteEntity(`Scene.${sceneId}`));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: sceneId, name: params.name, deleted: true }),
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
//# sourceMappingURL=scenes.js.map