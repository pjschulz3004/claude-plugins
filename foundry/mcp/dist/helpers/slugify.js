// Phase 4 helper — slug rule from RESEARCH §R-04.
// Also inlined in skills/*/SKILL.md script templates so skills have zero TS imports.
// Tests live at mcp/tests/helpers/slugify.test.ts.
export function slugify(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/[äöü]/g, (c) => ({ ä: "a", ö: "o", ü: "u" }[c] ?? c))
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}
//# sourceMappingURL=slugify.js.map