import { z } from "zod";
import { executeJs, makeError, withRetry, relayCreateEntity, relayUpdateEntity, relayDeleteEntity, } from "../client.js";
// ---------------------------------------------------------------------------
// list_journals — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listJournalsInputSchema = {};
export async function listJournalsHandler(_args = {}) {
    try {
        const result = await withRetry(() => executeJs(`return JSON.stringify(game.journal.contents.map(j => ({
          id: j.id,
          name: j.name,
          pageCount: j.pages?.size ?? j.pages?.contents?.length ?? 0
        })));`));
        const journals = (Array.isArray(result) ? result : []);
        return {
            content: [{ type: "text", text: JSON.stringify(journals, null, 2) }],
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
 * Find a journal entry id by name via execute-js (game.journal.getName).
 */
async function findJournalIdByName(name) {
    const result = await executeJs(`return JSON.stringify(game.journal.getName(${JSON.stringify(name)})?.id ?? null);`);
    return typeof result === "string" && result.length > 0 ? result : null;
}
// ---------------------------------------------------------------------------
// create_journal — upsert by name, HTML pages with @UUID support
// ---------------------------------------------------------------------------
export const createJournalInputSchema = {
    name: z.string().describe("Journal entry name (used for upsert matching)"),
    content: z
        .string()
        .describe("HTML content for the journal page. Supports @UUID[Actor.id]{Name} cross-links."),
    page_name: z
        .string()
        .optional()
        .default("Overview")
        .describe("Name of the journal page"),
};
export async function createJournalHandler(params) {
    try {
        const pageName = params.page_name ?? "Overview";
        const pages = [
            {
                name: pageName,
                type: "text",
                text: { content: params.content, format: 1 },
            },
        ];
        // Upsert check via execute-js (no list-by-type endpoint on the real relay)
        const existingId = await withRetry(() => findJournalIdByName(params.name));
        let journalId;
        if (existingId) {
            // UPDATE: replace pages wholesale on existing journal
            journalId = existingId;
            await withRetry(() => relayUpdateEntity(`JournalEntry.${journalId}`, { pages }));
        }
        else {
            // CREATE: POST /create with {entityType, data}
            const created = await withRetry(() => relayCreateEntity("JournalEntry", { name: params.name, pages }));
            journalId = created.uuid.replace(/^JournalEntry\./, "") ||
                String(created.entity._id ?? "");
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: journalId, name: params.name }),
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
// delete_journal — D-03 confirm guard
// ---------------------------------------------------------------------------
export const deleteJournalInputSchema = {
    name: z.string().describe("Journal entry name to delete (exact match)"),
    confirm: z
        .boolean()
        .describe("Must be true to confirm deletion. Prevents accidental deletion of objects with @UUID cross-references."),
};
export async function deleteJournalHandler(params) {
    if (!params.confirm) {
        return makeError("Deletion requires confirm: true. This journal may have @UUID cross-references.", "VALIDATION_FAILED");
    }
    try {
        const journalId = await withRetry(() => findJournalIdByName(params.name));
        if (!journalId) {
            return makeError(`Journal not found: "${params.name}". Run list_journals to check spelling.`, "NOT_FOUND");
        }
        await withRetry(() => relayDeleteEntity(`JournalEntry.${journalId}`));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: journalId, name: params.name, deleted: true }),
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
//# sourceMappingURL=journals.js.map