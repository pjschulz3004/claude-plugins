import { z } from "zod";
import { foundryFetch, makeError, withRetry } from "../client.js";
// ---------------------------------------------------------------------------
// place_token — place an actor token on a scene at specified coordinates
// ---------------------------------------------------------------------------
export const placeTokenInputSchema = {
    scene_name: z.string().describe("Scene name to place token on"),
    actor_name: z.string().describe("Actor name whose token to place"),
    x: z.number().describe("X coordinate on the canvas (pixels)"),
    y: z.number().describe("Y coordinate on the canvas (pixels)"),
    width: z
        .number()
        .optional()
        .default(1)
        .describe("Token width in grid units"),
    height: z
        .number()
        .optional()
        .default(1)
        .describe("Token height in grid units"),
};
export async function placeTokenHandler(params) {
    try {
        // 1. Find scene by name
        const scenesRaw = await withRetry(() => foundryFetch("/scene?all=true", { method: "GET" }));
        const scenes = (Array.isArray(scenesRaw) ? scenesRaw : []);
        const scene = scenes.find((s) => String(s.name) === params.scene_name);
        if (!scene) {
            return makeError(`Scene not found: "${params.scene_name}". Run list_scenes to check spelling.`, "NOT_FOUND");
        }
        // 2. Find actor by name
        const actorsRaw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Actor", name: params.actor_name },
        }));
        const actors = (Array.isArray(actorsRaw) ? actorsRaw : []);
        const actor = actors.find((a) => String(a.name) === params.actor_name);
        if (!actor) {
            return makeError(`Actor not found: "${params.actor_name}". Run list_actors to check spelling.`, "NOT_FOUND");
        }
        const sceneId = String(scene._id);
        const actorId = String(actor._id);
        // 3. Place token via POST /canvas/tokens
        await withRetry(() => foundryFetch("/canvas/tokens", {
            method: "POST",
            body: {
                sceneId,
                actorId,
                x: params.x,
                y: params.y,
                width: params.width ?? 1,
                height: params.height ?? 1,
            },
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        scene: params.scene_name,
                        actor: params.actor_name,
                        x: params.x,
                        y: params.y,
                    }),
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
//# sourceMappingURL=tokens.js.map