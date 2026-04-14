import { z } from "zod";
import { executeJs, makeError, withRetry } from "../client.js";
// ---------------------------------------------------------------------------
// place_token — place an actor token on a scene at specified coordinates.
//
// Implementation note: the real ThreeHats relay has no /canvas/tokens endpoint.
// We create the token via execute-js using scene.createEmbeddedDocuments('Token',
// [actor.prototypeToken.toObject()]) patched with our x/y/width/height.
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
    const width = params.width ?? 1;
    const height = params.height ?? 1;
    try {
        const script = `
      const scene = game.scenes.getName(${JSON.stringify(params.scene_name)});
      if (!scene) return JSON.stringify({ error: "scene_not_found" });
      const actor = game.actors.getName(${JSON.stringify(params.actor_name)});
      if (!actor) return JSON.stringify({ error: "actor_not_found" });
      const td = actor.prototypeToken?.toObject?.() ?? {};
      td.name = actor.name;
      td.actorId = actor.id;
      td.x = ${params.x};
      td.y = ${params.y};
      td.width = ${width};
      td.height = ${height};
      const created = await scene.createEmbeddedDocuments('Token', [td]);
      return JSON.stringify({ ok: true, tokenId: created[0]?.id ?? null, sceneId: scene.id, actorId: actor.id });
    `;
        const result = (await withRetry(() => executeJs(script)));
        if (typeof result === "object" && result !== null) {
            if (result.error === "scene_not_found") {
                return makeError(`Scene not found: "${params.scene_name}". Run list_scenes to check spelling.`, "NOT_FOUND");
            }
            if (result.error === "actor_not_found") {
                return makeError(`Actor not found: "${params.actor_name}". Run list_actors to check spelling.`, "NOT_FOUND");
            }
        }
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