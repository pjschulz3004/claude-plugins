import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { checkRelayHealth, getClients } from "./client.js";
// Actor handlers and schemas
import { listActorsHandler, listActorsInputSchema, createActorHandler, createActorInputSchema, updateActorHandler, updateActorInputSchema, deleteActorHandler, deleteActorInputSchema, } from "./tools/actors.js";
// Scene handlers and schemas
import { listScenesHandler, listScenesInputSchema, createSceneHandler, createSceneInputSchema, deleteSceneHandler, deleteSceneInputSchema, } from "./tools/scenes.js";
// Token handler and schema
import { placeTokenHandler, placeTokenInputSchema } from "./tools/tokens.js";
// Journal handlers and schemas
import { listJournalsHandler, listJournalsInputSchema, createJournalHandler, createJournalInputSchema, deleteJournalHandler, deleteJournalInputSchema, } from "./tools/journals.js";
// Playlist handlers and schemas
import { listPlaylistsHandler, listPlaylistsInputSchema, createPlaylistHandler, createPlaylistInputSchema, assignPlaylistHandler, assignPlaylistInputSchema, deletePlaylistHandler, deletePlaylistInputSchema, } from "./tools/playlists.js";
// Execute JS handler and schema
import { executeJsHandler, executeJsInputSchema } from "./tools/execute.js";
const server = new McpServer({
    name: "foundry",
    version: "0.2.0",
});
// ---------------------------------------------------------------------------
// Tool 1: foundry_health_check
// ---------------------------------------------------------------------------
server.tool("foundry_health_check", "Verify relay connectivity and Foundry world connection. Returns relay health status, connected world name, and clientId.", {}, async () => {
    const parts = [];
    // 1. Check relay health (no auth needed)
    try {
        const health = await checkRelayHealth();
        parts.push(`Relay: ${health.healthy ? "healthy" : "unhealthy"} (uptime: ${health.uptime ?? "unknown"}s)`);
    }
    catch (err) {
        parts.push(`Relay: UNREACHABLE (${err instanceof Error ? err.message : String(err)})`);
        return {
            content: [{ type: "text", text: parts.join("\n") }],
            isError: true,
        };
    }
    // 2. Check connected clients (requires API key)
    try {
        const clientsData = await getClients();
        if (clientsData.clients.length === 0) {
            parts.push("Foundry: No world connected. Start a world in Foundry VTT.");
        }
        else {
            const client = clientsData.clients[0];
            parts.push(`Foundry: ${client.worldTitle ?? "Unknown World"}`);
            parts.push(`  clientId: ${client.id}`);
            parts.push(`  system: ${client.systemTitle ?? client.systemId ?? "unknown"} ${client.systemVersion ?? ""}`);
            parts.push(`  foundry: ${client.foundryVersion ?? "unknown"}`);
            if (clientsData.clients.length > 1) {
                parts.push(`  (${clientsData.clients.length} worlds connected, using first)`);
            }
        }
    }
    catch (err) {
        parts.push(`Foundry: Client discovery failed (${err instanceof Error ? err.message : String(err)})`);
        return {
            content: [{ type: "text", text: parts.join("\n") }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: parts.join("\n") }],
    };
});
// ---------------------------------------------------------------------------
// Tools 2-5: Actor tools
// ---------------------------------------------------------------------------
server.tool("list_actors", "List all actors in the Foundry world. Returns filtered fields: id, name, type, img, alias, mythos, logos. Optionally filter by actor type.", listActorsInputSchema, listActorsHandler);
server.tool("create_actor", "Create or update an actor (upsert by exact name match). Optionally embed City of Mist themes, power/weakness tags, and GM moves.", createActorInputSchema, createActorHandler);
server.tool("update_actor", "Update specific fields on an existing actor found by exact name match.", updateActorInputSchema, updateActorHandler);
server.tool("delete_actor", "Delete an actor by exact name match. Requires confirm: true to prevent accidental deletion of objects with @UUID cross-references.", deleteActorInputSchema, deleteActorHandler);
// ---------------------------------------------------------------------------
// Tools 6-8: Scene tools
// ---------------------------------------------------------------------------
server.tool("list_scenes", "List all scenes in the Foundry world. Returns filtered fields: id, name, active, thumbnail, navigation.", listScenesInputSchema, listScenesHandler);
server.tool("create_scene", "Create or update a scene (upsert by exact name match). Optionally activate after creation.", createSceneInputSchema, createSceneHandler);
server.tool("delete_scene", "Delete a scene by exact name match. Requires confirm: true to prevent accidental deletion of objects with @UUID cross-references.", deleteSceneInputSchema, deleteSceneHandler);
// ---------------------------------------------------------------------------
// Tool 9: Token tool
// ---------------------------------------------------------------------------
server.tool("place_token", "Place an actor's token on a scene at specified coordinates. Resolves actor and scene by name.", placeTokenInputSchema, placeTokenHandler);
// ---------------------------------------------------------------------------
// Tools 10-12: Journal tools
// ---------------------------------------------------------------------------
server.tool("list_journals", "List all journal entries in the Foundry world. Returns filtered fields: id, name, pageCount.", listJournalsInputSchema, listJournalsHandler);
server.tool("create_journal", "Create or update a journal entry (upsert by exact name match). Content is HTML with @UUID cross-link support.", createJournalInputSchema, createJournalHandler);
server.tool("delete_journal", "Delete a journal entry by exact name match. Requires confirm: true to prevent accidental deletion of objects with @UUID cross-references.", deleteJournalInputSchema, deleteJournalHandler);
// ---------------------------------------------------------------------------
// Tools 13-16: Playlist tools
// ---------------------------------------------------------------------------
server.tool("list_playlists", "List all playlists in the Foundry world. Returns filtered fields: id, name, playing, sounds count.", listPlaylistsInputSchema, listPlaylistsHandler);
server.tool("create_playlist", "Create or update a playlist (upsert by exact name match). Optionally add sound tracks.", createPlaylistInputSchema, createPlaylistHandler);
server.tool("assign_playlist", "Assign a playlist to a scene for automatic playback on scene activation.", assignPlaylistInputSchema, assignPlaylistHandler);
server.tool("delete_playlist", "Delete a playlist by exact name match. Requires confirm: true to prevent accidental deletion.", deletePlaylistInputSchema, deletePlaylistHandler);
// ---------------------------------------------------------------------------
// Tool 17: Execute JS escape hatch
// ---------------------------------------------------------------------------
server.tool("execute_js", "Execute JavaScript in the Foundry VTT runtime. For advanced operations not covered by other tools (e.g., module APIs, embedded document creation). BLOCKED: deleteDocuments, deleteAll, game.world.delete, game.settings.set('core.*'), game.users.", executeJsInputSchema, executeJsHandler);
// ---------------------------------------------------------------------------
// Start server with stdio transport
// ---------------------------------------------------------------------------
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[foundry-mcp] Server started on stdio transport");
}
main().catch((err) => {
    console.error("[foundry-mcp] Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map