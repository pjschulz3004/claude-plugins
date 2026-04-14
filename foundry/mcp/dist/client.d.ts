import { z } from "zod";
declare const ClientSchema: z.ZodObject<{
    id: z.ZodString;
    instanceId: z.ZodOptional<z.ZodString>;
    lastSeen: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    connectedSince: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    worldId: z.ZodOptional<z.ZodString>;
    worldTitle: z.ZodOptional<z.ZodString>;
    foundryVersion: z.ZodOptional<z.ZodString>;
    systemId: z.ZodOptional<z.ZodString>;
    systemTitle: z.ZodOptional<z.ZodString>;
    systemVersion: z.ZodOptional<z.ZodString>;
    customName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    instanceId?: string | undefined;
    lastSeen?: string | number | undefined;
    connectedSince?: string | number | undefined;
    worldId?: string | undefined;
    worldTitle?: string | undefined;
    foundryVersion?: string | undefined;
    systemId?: string | undefined;
    systemTitle?: string | undefined;
    systemVersion?: string | undefined;
    customName?: string | undefined;
}, {
    id: string;
    instanceId?: string | undefined;
    lastSeen?: string | number | undefined;
    connectedSince?: string | number | undefined;
    worldId?: string | undefined;
    worldTitle?: string | undefined;
    foundryVersion?: string | undefined;
    systemId?: string | undefined;
    systemTitle?: string | undefined;
    systemVersion?: string | undefined;
    customName?: string | undefined;
}>;
declare const ClientsResponseSchema: z.ZodObject<{
    total: z.ZodNumber;
    clients: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
        lastSeen: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        connectedSince: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        worldId: z.ZodOptional<z.ZodString>;
        worldTitle: z.ZodOptional<z.ZodString>;
        foundryVersion: z.ZodOptional<z.ZodString>;
        systemId: z.ZodOptional<z.ZodString>;
        systemTitle: z.ZodOptional<z.ZodString>;
        systemVersion: z.ZodOptional<z.ZodString>;
        customName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        instanceId?: string | undefined;
        lastSeen?: string | number | undefined;
        connectedSince?: string | number | undefined;
        worldId?: string | undefined;
        worldTitle?: string | undefined;
        foundryVersion?: string | undefined;
        systemId?: string | undefined;
        systemTitle?: string | undefined;
        systemVersion?: string | undefined;
        customName?: string | undefined;
    }, {
        id: string;
        instanceId?: string | undefined;
        lastSeen?: string | number | undefined;
        connectedSince?: string | number | undefined;
        worldId?: string | undefined;
        worldTitle?: string | undefined;
        foundryVersion?: string | undefined;
        systemId?: string | undefined;
        systemTitle?: string | undefined;
        systemVersion?: string | undefined;
        customName?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    total: number;
    clients: {
        id: string;
        instanceId?: string | undefined;
        lastSeen?: string | number | undefined;
        connectedSince?: string | number | undefined;
        worldId?: string | undefined;
        worldTitle?: string | undefined;
        foundryVersion?: string | undefined;
        systemId?: string | undefined;
        systemTitle?: string | undefined;
        systemVersion?: string | undefined;
        customName?: string | undefined;
    }[];
}, {
    total: number;
    clients: {
        id: string;
        instanceId?: string | undefined;
        lastSeen?: string | number | undefined;
        connectedSince?: string | number | undefined;
        worldId?: string | undefined;
        worldTitle?: string | undefined;
        foundryVersion?: string | undefined;
        systemId?: string | undefined;
        systemTitle?: string | undefined;
        systemVersion?: string | undefined;
        customName?: string | undefined;
    }[];
}>;
export type Client = z.infer<typeof ClientSchema>;
export type ClientsResponse = z.infer<typeof ClientsResponseSchema>;
declare const HealthResponseSchema: z.ZodObject<{
    healthy: z.ZodBoolean;
    timestamp: z.ZodOptional<z.ZodString>;
    uptime: z.ZodOptional<z.ZodNumber>;
    instance: z.ZodOptional<z.ZodString>;
    memory: z.ZodOptional<z.ZodObject<{
        rss: z.ZodNumber;
        heapTotal: z.ZodNumber;
        heapUsed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    }, {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    healthy: boolean;
    timestamp?: string | undefined;
    uptime?: number | undefined;
    instance?: string | undefined;
    memory?: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    } | undefined;
}, {
    healthy: boolean;
    timestamp?: string | undefined;
    uptime?: number | undefined;
    instance?: string | undefined;
    memory?: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    } | undefined;
}>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
/**
 * Reset the cached clientId promise. Called on connection errors to force re-discovery.
 */
export declare function resetClientId(): void;
/**
 * Discover the connected Foundry client ID via GET /clients.
 * Promise-caches the result so concurrent calls issue exactly one fetch.
 * Clears cache on failure so next call retries.
 * Throws if no Foundry world is connected.
 */
export declare function getClientId(): Promise<string>;
/**
 * Make an authenticated request to the Foundry relay.
 * Automatically appends the discovered clientId as a query parameter.
 * Resets clientId cache on 404/502 errors (stale client).
 */
export declare function foundryFetch(path: string, options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
}): Promise<unknown>;
/**
 * Check relay health (no clientId needed).
 */
export declare function checkRelayHealth(): Promise<HealthResponse>;
/**
 * Get all connected clients (no clientId needed, but requires API key).
 */
export declare function getClients(): Promise<ClientsResponse>;
export type ErrorCode = "NOT_FOUND" | "RELAY_DOWN" | "VALIDATION_FAILED" | "AUTH_FAILED" | "CONFLICT";
export declare function makeError(message: string, code: ErrorCode): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function withRetry<T>(fn: () => Promise<T>, retries?: number, delayMs?: number): Promise<T>;
/**
 * Execute a JavaScript script in Foundry VTT via the execute-js endpoint.
 * Blocks scripts matching the deny-list of destructive patterns.
 * Audit-logs all executions to console.error with ISO timestamp.
 * Parses JSON-stringified results automatically.
 */
export declare function executeJs(script: string): Promise<unknown>;
export {};
//# sourceMappingURL=client.d.ts.map