// For shadow mode (Phase 6), set JARVIS_TELEGRAM_BOT_TOKEN_SHADOW as the second
// bot token to avoid 409 Conflict (Pitfall 5). No dual-bot logic needed yet.

/**
 * Split a long message into chunks that respect Telegram's message size limit.
 * Splits at paragraph boundaries (\n\n), then line boundaries (\n), then hard-cuts.
 * Adds [1/N] prefix when there are multiple chunks.
 */
export function splitMessage(text: string, maxLen = 4000): string[] {
	if (text.length <= maxLen) {
		return [text];
	}

	// Reserve space for prefix like "[1/2] " (up to ~10 chars for safety)
	const prefixReserve = 10;
	const chunkLen = maxLen - prefixReserve;

	const rawChunks: string[] = [];
	const paragraphs = text.split("\n\n");
	let current = "";

	for (const para of paragraphs) {
		const separator = current ? "\n\n" : "";
		if (current && (current + separator + para).length > chunkLen) {
			rawChunks.push(current);
			current = "";
		}
		if (para.length > chunkLen) {
			// Single paragraph exceeds limit - split at newline or hard-cut
			if (current) {
				rawChunks.push(current);
				current = "";
			}
			let remaining = para;
			while (remaining.length > chunkLen) {
				const lastNewline = remaining.lastIndexOf("\n", chunkLen);
				if (lastNewline > 0) {
					rawChunks.push(remaining.slice(0, lastNewline));
					remaining = remaining.slice(lastNewline + 1);
				} else {
					rawChunks.push(remaining.slice(0, chunkLen));
					remaining = remaining.slice(chunkLen);
				}
			}
			if (remaining) {
				current = remaining;
			}
		} else {
			current = current ? current + separator + para : para;
		}
	}
	if (current) {
		rawChunks.push(current);
	}

	if (rawChunks.length === 1) {
		return rawChunks;
	}

	// Add chunk numbering
	const total = rawChunks.length;
	return rawChunks.map((chunk, i) => `[${i + 1}/${total}] ${chunk}`);
}
