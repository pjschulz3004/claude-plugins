import { z } from "zod";
import { executeJs, makeError } from "../client.js";
// ---------------------------------------------------------------------------
// execute_js — D-11, D-12, D-13, D-14: guarded raw JS execution
// Deny-list, audit log, and JSON.parse are handled by executeJs() in client.ts
// ---------------------------------------------------------------------------
export const executeJsInputSchema = {
    script: z
        .string()
        .describe("JavaScript to execute in the Foundry VTT runtime. Has access to game.actors, game.scenes, game.journal, etc. Return a value with 'return JSON.stringify(result)'. BLOCKED patterns: deleteDocuments, deleteAll, game.world.delete, game.settings.set('core.*'), game.users."),
};
export async function executeJsHandler(params) {
    try {
        const result = await executeJs(params.script);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/BLOCKED/i.test(msg))
            return makeError(msg, "VALIDATION_FAILED");
        if (/401|403/i.test(msg))
            return makeError(msg, "AUTH_FAILED");
        return makeError(msg, "RELAY_DOWN");
    }
}
//# sourceMappingURL=execute.js.map