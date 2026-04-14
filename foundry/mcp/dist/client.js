import { z } from "zod";
const _RELAY_URL = process.env.FOUNDRY_RELAY_URL;
const _API_KEY = process.env.FOUNDRY_API_KEY;
if (!_RELAY_URL)
    throw new Error("FOUNDRY_RELAY_URL environment variable is required");
if (!_API_KEY)
    throw new Error("FOUNDRY_API_KEY environment variable is required");
// After the guards above, both are guaranteed to be strings
const RELAY_URL = _RELAY_URL;
const API_KEY = _API_KEY;
// ---------------------------------------------------------------------------
// WR-04: fetchWithTimeout — AbortController with 10s default
// ---------------------------------------------------------------------------
const TIMEOUT_MS = 10_000;
function fetchWithTimeout(url, init, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}
// ---------------------------------------------------------------------------
// WR-01: safeParseResponse — wraps Zod .parse() in try/catch
// ---------------------------------------------------------------------------
function safeParseResponse(schema, data, context) {
    try {
        return schema.parse(data);
    }
    catch (err) {
        throw new Error(`${context}: unexpected response shape — ${err instanceof Error ? err.message : String(err)}`);
    }
}
// ---------------------------------------------------------------------------
// Zod schema for GET /clients response
// ---------------------------------------------------------------------------
const ClientSchema = z.object({
    id: z.string(),
    instanceId: z.string().optional(),
    lastSeen: z.union([z.string(), z.number()]).optional(),
    connectedSince: z.union([z.string(), z.number()]).optional(),
    worldId: z.string().optional(),
    worldTitle: z.string().optional(),
    foundryVersion: z.string().optional(),
    systemId: z.string().optional(),
    systemTitle: z.string().optional(),
    systemVersion: z.string().optional(),
    customName: z.string().optional(),
});
const ClientsResponseSchema = z.object({
    total: z.number(),
    clients: z.array(ClientSchema),
});
// ---------------------------------------------------------------------------
// Zod schema for GET /health response
// NOTE: Custom relay returns { status, timestamp, uptime, instance, memory }
// where timestamp is a number|string and memory values are pre-formatted strings.
// (BUG-2 fix: original schema assumed string/number but values varied.)
// ---------------------------------------------------------------------------
const HealthResponseSchema = z.object({
    status: z.string().optional(),
    healthy: z.boolean().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    uptime: z.number().optional(),
    instance: z.string().optional(),
    memory: z.object({
        rss: z.union([z.string(), z.number()]),
        heapTotal: z.union([z.string(), z.number()]),
        heapUsed: z.union([z.string(), z.number()]),
    }).optional(),
});
// ---------------------------------------------------------------------------
// WR-05: Promise-cache for getClientId() — prevents duplicate concurrent fetches
// ---------------------------------------------------------------------------
let _clientIdPromise = null;
/**
 * Reset the cached clientId promise. Called on connection errors to force re-discovery.
 */
export function resetClientId() {
    _clientIdPromise = null;
}
/**
 * Discover the connected Foundry client ID via GET /clients.
 * Promise-caches the result so concurrent calls issue exactly one fetch.
 * Clears cache on failure so next call retries.
 * Throws if no Foundry world is connected.
 */
export function getClientId() {
    if (!_clientIdPromise) {
        _clientIdPromise = _fetchClientId().catch((err) => {
            _clientIdPromise = null;
            throw err;
        });
    }
    return _clientIdPromise;
}
async function _fetchClientId() {
    const response = await fetchWithTimeout(`${RELAY_URL}/clients`, {
        headers: { "x-api-key": API_KEY },
    });
    if (!response.ok) {
        throw new Error(`GET /clients failed: ${response.status} ${response.statusText}`);
    }
    const data = safeParseResponse(ClientsResponseSchema, await response.json(), "GET /clients");
    if (data.clients.length === 0) {
        throw new Error("No Foundry world connected to relay. Start a world in Foundry VTT first.");
    }
    const clientId = data.clients[0].id;
    // Log to stderr only (never stdout — stdout is JSON-RPC stream)
    console.error(`[foundry-mcp] Discovered clientId: ${clientId} (${data.clients[0].worldTitle ?? "unknown world"})`);
    return clientId;
}
// ---------------------------------------------------------------------------
// foundryFetch — authenticated relay calls with dynamic clientId
// ---------------------------------------------------------------------------
/**
 * Make an authenticated request to the Foundry relay.
 * Automatically appends the discovered clientId as a query parameter.
 * Resets clientId cache on 404/502 errors (stale client).
 */
export async function foundryFetch(path, options = {}) {
    const clientId = await getClientId();
    const separator = path.includes("?") ? "&" : "?";
    // WR-02: URL-encode clientId to handle special characters
    const url = `${RELAY_URL}${path}${separator}clientId=${encodeURIComponent(clientId)}`;
    const response = await fetchWithTimeout(url, {
        method: options.method ?? "GET",
        headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
            ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
        if (response.status === 404 || response.status === 502) {
            resetClientId();
        }
        const errorText = await response.text();
        throw new Error(`Foundry relay ${response.status}: ${errorText}`);
    }
    return response.json();
}
// ---------------------------------------------------------------------------
// checkRelayHealth — WR-03: add x-api-key header
// ---------------------------------------------------------------------------
/**
 * Check relay health (no clientId needed).
 */
export async function checkRelayHealth() {
    const response = await fetchWithTimeout(`${RELAY_URL}/api/health`, {
        headers: { "x-api-key": API_KEY },
    });
    if (!response.ok) {
        throw new Error(`Relay health check failed: ${response.status} ${response.statusText}`);
    }
    return safeParseResponse(HealthResponseSchema, await response.json(), "GET /api/health");
}
// ---------------------------------------------------------------------------
// getClients — returns all connected clients
// ---------------------------------------------------------------------------
/**
 * Get all connected clients (no clientId needed, but requires API key).
 */
export async function getClients() {
    const response = await fetchWithTimeout(`${RELAY_URL}/clients`, {
        headers: { "x-api-key": API_KEY },
    });
    if (!response.ok) {
        throw new Error(`GET /clients failed: ${response.status} ${response.statusText}`);
    }
    return safeParseResponse(ClientsResponseSchema, await response.json(), "GET /clients");
}
const ERROR_HINTS = {
    NOT_FOUND: "Run list_actors (or list_scenes/list_journals) to check the exact name.",
    RELAY_DOWN: "Run foundry_health_check to verify relay and Foundry connectivity.",
    VALIDATION_FAILED: "Check required parameters — name is always required for create operations.",
    AUTH_FAILED: "Verify FOUNDRY_API_KEY is set and valid.",
    CONFLICT: "An object with this name already exists with a different type. Use update_ tools instead.",
};
export function makeError(message, code) {
    return {
        isError: true,
        content: [{
                type: "text",
                text: JSON.stringify({ error: message, code, hint: ERROR_HINTS[code] }),
            }],
    };
}
// ---------------------------------------------------------------------------
// D-09: withRetry — auto-retry once on transient failures
// ---------------------------------------------------------------------------
export async function withRetry(fn, retries = 1, delayMs = 1000) {
    try {
        return await fn();
    }
    catch (err) {
        const isTransient = err instanceof Error && /502|503|timeout|abort/i.test(err.message);
        if (retries > 0 && isTransient) {
            await new Promise(r => setTimeout(r, delayMs));
            return withRetry(fn, retries - 1, delayMs);
        }
        throw err;
    }
}
/**
 * GET /get?uuid=X — fetch a single entity by UUID.
 * The relay returns {data, uuid} on success or {error} if not found (status 400).
 */
export async function relayGetEntity(uuid) {
    const raw = (await foundryFetch(`/get?uuid=${encodeURIComponent(uuid)}`, {
        method: "GET",
    }));
    if (raw.error) {
        throw new Error(`GET /get: ${raw.error}`);
    }
    return raw.data ?? raw;
}
/**
 * POST /create — create a new entity.
 * The relay returns {uuid, entity} on success.
 */
export async function relayCreateEntity(entityType, data, folder) {
    const body = { entityType, data };
    if (folder !== undefined)
        body.folder = folder;
    const raw = (await foundryFetch("/create", {
        method: "POST",
        body,
    }));
    if (raw.error) {
        throw new Error(`POST /create: ${raw.error}`);
    }
    return {
        uuid: String(raw.uuid ?? ""),
        entity: (raw.entity ?? {}),
    };
}
/**
 * PUT /update?uuid=X — update an existing entity.
 * Pass a partial `data` object. Nested fields use dot notation per Foundry
 * document updates (e.g., "system.alias").
 */
export async function relayUpdateEntity(uuid, data) {
    const raw = (await foundryFetch(`/update?uuid=${encodeURIComponent(uuid)}`, {
        method: "PUT",
        body: { data },
    }));
    if (raw.error) {
        throw new Error(`PUT /update: ${raw.error}`);
    }
    return raw.data ?? raw.entity ?? raw;
}
/**
 * DELETE /delete?uuid=X — delete an entity by UUID.
 */
export async function relayDeleteEntity(uuid) {
    const raw = (await foundryFetch(`/delete?uuid=${encodeURIComponent(uuid)}`, {
        method: "DELETE",
    }));
    if (raw.error) {
        throw new Error(`DELETE /delete: ${raw.error}`);
    }
}
// ---------------------------------------------------------------------------
// D-11, D-12, D-13: executeJs() — guarded execute-js helper
// ---------------------------------------------------------------------------
const DENY_LIST = [
    /deleteDocuments/,
    /deleteAll/,
    /game\.world\.delete/,
    /game\.settings\.set\(['"]core\./,
    /game\.users/,
];
/**
 * Execute a JavaScript script in Foundry VTT via the execute-js endpoint.
 * Blocks scripts matching the deny-list of destructive patterns.
 * Audit-logs all executions to console.error with ISO timestamp.
 * Parses JSON-stringified results automatically.
 */
export async function executeJs(script) {
    for (const pattern of DENY_LIST) {
        if (pattern.test(script)) {
            throw new Error(`BLOCKED: script contains denied pattern: ${pattern}`);
        }
    }
    console.error(`[foundry-mcp] execute-js at ${new Date().toISOString()}: ${script.slice(0, 100)}...`);
    const raw = await foundryFetch("/execute-js", {
        method: "POST",
        body: { script },
    });
    const response = raw;
    try {
        return JSON.parse(response.result);
    }
    catch {
        return response.result;
    }
}
//# sourceMappingURL=client.js.map