// Phase 4 helper — format-agnostic art path resolver per CONTEXT §A-02′.
// Probes .webp first (Foundry/Exalted Scenes preference), then .png (legacy assets/Wyrd/NPC).
// Inventory is a map of Data-root-relative paths → true/false.
// Tests live at mcp/tests/helpers/resolve-art-path.test.ts.
export function resolveArtPath(basePath, inventory) {
    for (const ext of [".webp", ".png"]) {
        const candidate = basePath + ext;
        if (inventory[candidate])
            return candidate;
    }
    return null;
}
//# sourceMappingURL=resolve-art-path.js.map