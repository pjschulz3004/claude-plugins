import { z } from "zod";
import { foundryFetch, executeJs, makeError, withRetry } from "../client.js";
function filterPlaylist(raw) {
    return {
        id: String(raw._id ?? ""),
        name: String(raw.name ?? ""),
        playing: Boolean(raw.playing),
        sounds: Array.isArray(raw.sounds) ? raw.sounds.length : 0,
    };
}
// ---------------------------------------------------------------------------
// list_playlists — Tool input schema and handler
// ---------------------------------------------------------------------------
export const listPlaylistsInputSchema = {};
export async function listPlaylistsHandler(_args = {}) {
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Playlist" },
        }));
        const playlists = (Array.isArray(raw) ? raw : []);
        const filtered = playlists.map(filterPlaylist);
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
// create_playlist — upsert by name, optional track embedding
// ---------------------------------------------------------------------------
export const createPlaylistInputSchema = {
    name: z.string().describe("Playlist name (used for upsert matching)"),
    description: z.string().optional().describe("Playlist description"),
    sounds: z
        .array(z.object({
        name: z.string().describe("Track name"),
        path: z.string().describe("Audio file path relative to Foundry data"),
        repeat: z.boolean().optional().default(true),
        volume: z
            .number()
            .optional()
            .default(0.5)
            .describe("Volume 0.0-1.0"),
    }))
        .optional()
        .describe("Tracks to add to the playlist"),
};
export async function createPlaylistHandler(params) {
    try {
        // Upsert check
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Playlist", name: params.name },
        }));
        const playlists = (Array.isArray(raw) ? raw : []);
        const found = playlists.find((p) => String(p.name) === params.name);
        let playlistId;
        if (found) {
            // UPDATE existing playlist
            playlistId = String(found._id);
            await withRetry(() => foundryFetch("/update", {
                method: "PUT",
                body: {
                    uuid: playlistId,
                    ...(params.description !== undefined && {
                        description: params.description,
                    }),
                },
            }));
        }
        else {
            // CREATE new playlist
            const created = await withRetry(() => foundryFetch("/create", {
                method: "POST",
                body: {
                    type: "Playlist",
                    name: params.name,
                    ...(params.description !== undefined && {
                        description: params.description,
                    }),
                },
            }));
            playlistId = String(created._id);
        }
        // Add sounds via execute-js (PlaylistSound embedded documents)
        if (params.sounds && params.sounds.length > 0) {
            const soundsScript = `
        const playlist = game.playlists.get("${playlistId}");
        const sounds = ${JSON.stringify(params.sounds.map((s) => ({
                name: s.name,
                path: s.path,
                repeat: s.repeat ?? true,
                volume: s.volume ?? 0.5,
            })))};
        const result = await playlist.createEmbeddedDocuments('PlaylistSound', sounds);
        return JSON.stringify(result.map(s => ({ id: s.id, name: s.name })));
      `;
            await executeJs(soundsScript);
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: playlistId, name: params.name }),
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
// assign_playlist — link a playlist to a scene
// ---------------------------------------------------------------------------
export const assignPlaylistInputSchema = {
    playlist_name: z.string().describe("Playlist name to assign"),
    scene_name: z.string().describe("Scene name to assign playlist to"),
};
export async function assignPlaylistHandler(params) {
    try {
        // Find playlist by name
        const playlistsRaw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Playlist", name: params.playlist_name },
        }));
        const playlists = (Array.isArray(playlistsRaw) ? playlistsRaw : []);
        const playlist = playlists.find((p) => String(p.name) === params.playlist_name);
        if (!playlist) {
            return makeError(`Playlist not found: "${params.playlist_name}". Run list_playlists to check spelling.`, "NOT_FOUND");
        }
        // Find scene by name
        const scenesRaw = await withRetry(() => foundryFetch("/scene?all=true", { method: "GET" }));
        const scenes = (Array.isArray(scenesRaw) ? scenesRaw : []);
        const scene = scenes.find((s) => String(s.name) === params.scene_name);
        if (!scene) {
            return makeError(`Scene not found: "${params.scene_name}". Run list_scenes to check spelling.`, "NOT_FOUND");
        }
        const playlistId = String(playlist._id);
        const sceneId = String(scene._id);
        // Assign playlist to scene via PUT /scene
        await withRetry(() => foundryFetch("/scene", {
            method: "PUT",
            body: {
                sceneId,
                playlist: playlistId,
                playlistSound: null,
            },
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        playlist: params.playlist_name,
                        scene: params.scene_name,
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
// ---------------------------------------------------------------------------
// delete_playlist — D-03 confirm guard
// ---------------------------------------------------------------------------
export const deletePlaylistInputSchema = {
    name: z.string().describe("Playlist name to delete (exact match)"),
    confirm: z
        .boolean()
        .describe("Must be true to confirm deletion. Prevents accidental deletion."),
};
export async function deletePlaylistHandler(params) {
    if (!params.confirm) {
        return makeError("Deletion requires confirm: true.", "VALIDATION_FAILED");
    }
    try {
        const raw = await withRetry(() => foundryFetch("/get", {
            method: "POST",
            body: { type: "Playlist", name: params.name },
        }));
        const playlists = (Array.isArray(raw) ? raw : []);
        const found = playlists.find((p) => String(p.name) === params.name);
        if (!found) {
            return makeError(`Playlist not found: "${params.name}". Run list_playlists to check spelling.`, "NOT_FOUND");
        }
        const playlistId = String(found._id);
        await withRetry(() => foundryFetch("/delete", {
            method: "DELETE",
            body: { uuid: playlistId },
        }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ id: playlistId, name: params.name, deleted: true }),
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
//# sourceMappingURL=playlists.js.map