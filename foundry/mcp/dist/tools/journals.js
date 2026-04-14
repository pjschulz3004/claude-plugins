import { z } from "zod";
import { foundryFetch, makeError, withRetry } from "../client.js";
function filterJournal(raw) {
    return {
        id: String(raw._id ?? ""),
        name: String(raw.name ?? ""),
        pageCount: Array.isArray(raw.pages) ? raw.pages.length : 0,
    };
}
// ---------------------------------------------------------------------------
// list_journals — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listJournalsInputSchema = {};
export async function listJournalsHandler(_args = {}) {
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "JournalEntry" },
        }));
        const journals = (Array.isArray(raw) ? raw : []);
        const filtered = journals.map(filterJournal);
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
        // Upsert check
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "JournalEntry", name: params.name },
        }));
        const journals = (Array.isArray(raw) ? raw : []);
        const found = journals.find((j) => String(j.name) === params.name);
        let journalId;
        if (found) {
            // UPDATE existing journal
            journalId = String(found._id);
            await withRetry(() => foundryFetch("/update", {
                method: "PUT",
                body: { uuid: journalId, pages },
            }));
        }
        else {
            // CREATE new journal
            const created = await withRetry(() => foundryFetch("/create", {
                method: "POST",
                body: {
                    type: "JournalEntry",
                    name: params.name,
                    pages,
                },
            }));
            journalId = String(created._id);
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
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "JournalEntry", name: params.name },
        }));
        const journals = (Array.isArray(raw) ? raw : []);
        const found = journals.find((j) => String(j.name) === params.name);
        if (!found) {
            return makeError(`Journal not found: "${params.name}". Run list_journals to check spelling.`, "NOT_FOUND");
        }
        const journalId = String(found._id);
        await withRetry(() => foundryFetch("/delete", {
            method: "DELETE",
            body: { uuid: journalId },
        }));
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