import { z } from "zod";
import { foundryFetch, makeError, withRetry } from "../client.js";
function filterScene(raw) {
    return {
        id: String(raw._id ?? ""),
        name: String(raw.name ?? ""),
        active: Boolean(raw.active),
        thumbnail: String(raw.thumb ?? ""),
        navigation: Boolean(raw.navigation),
    };
}
// ---------------------------------------------------------------------------
// list_scenes — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listScenesInputSchema = {};
export async function listScenesHandler(_args = {}) {
    try {
        const raw = await withRetry(() => foundryFetch("/scene?all=true", {
            method: "GET",
        }));
        const scenes = (Array.isArray(raw) ? raw : []);
        const filtered = scenes.map(filterScene);
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
        // Upsert check — GET /scene?all=true, find by name
        const raw = await withRetry(() => foundryFetch("/scene?all=true", { method: "GET" }));
        const scenes = (Array.isArray(raw) ? raw : []);
        const found = scenes.find((s) => String(s.name) === params.name);
        let sceneId;
        if (found) {
            // UPDATE existing scene
            sceneId = String(found._id);
            await withRetry(() => foundryFetch("/scene", {
                method: "PUT",
                body: {
                    sceneId,
                    ...(params.background !== undefined && { img: params.background }),
                    ...(params.width !== undefined && { width: params.width }),
                    ...(params.height !== undefined && { height: params.height }),
                    ...(params.grid_size !== undefined && { "grid.size": params.grid_size }),
                    ...(params.padding !== undefined && { padding: params.padding }),
                },
            }));
        }
        else {
            // CREATE new scene
            const created = await withRetry(() => foundryFetch("/scene", {
                method: "POST",
                body: {
                    name: params.name,
                    ...(params.background !== undefined && { img: params.background }),
                    width: params.width ?? 4000,
                    height: params.height ?? 3000,
                    grid: { size: params.grid_size ?? 100 },
                    padding: params.padding ?? 0.25,
                },
            }));
            sceneId = String(created._id);
        }
        // Activate scene if requested
        if (params.active === true) {
            await withRetry(() => foundryFetch("/switch-scene", {
                method: "POST",
                body: { name: params.name },
            }));
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
        const raw = await withRetry(() => foundryFetch("/scene?all=true", { method: "GET" }));
        const scenes = (Array.isArray(raw) ? raw : []);
        const found = scenes.find((s) => String(s.name) === params.name);
        if (!found) {
            return makeError(`Scene not found: "${params.name}". Run list_scenes to check spelling.`, "NOT_FOUND");
        }
        const sceneId = String(found._id);
        await withRetry(() => foundryFetch("/delete", {
            method: "DELETE",
            body: { uuid: sceneId },
        }));
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