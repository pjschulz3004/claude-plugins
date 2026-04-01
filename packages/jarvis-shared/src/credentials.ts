export function loadCredentials(prefix: string): Record<string, string> {
	const fullPrefix = `JARVIS_${prefix.toUpperCase()}_`;
	const result: Record<string, string> = {};

	for (const [key, value] of Object.entries(process.env)) {
		if (key.startsWith(fullPrefix) && value !== undefined) {
			const shortKey = key.slice(fullPrefix.length).toLowerCase();
			result[shortKey] = value;
		}
	}

	return result;
}

export function requireCredentials(
	prefix: string,
	required: string[],
): Record<string, string> {
	const creds = loadCredentials(prefix);
	const fullPrefix = `JARVIS_${prefix.toUpperCase()}_`;
	const missing = required.filter((key) => !creds[key.toLowerCase()]);

	if (missing.length > 0) {
		throw new Error(
			`Missing ${missing.length} required credential(s) for ${prefix}`,
		);
	}

	return creds;
}
