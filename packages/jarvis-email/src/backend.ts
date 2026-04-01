import { ImapFlow } from "imapflow";
import { isTransientError, sleep } from "@jarvis/shared";
import type {
	EmailFolder,
	EmailSearchQuery,
	EmailSummary,
	IMAPConfig,
} from "./types.js";

export interface EmailBackend {
	listUnread(limit?: number): Promise<EmailSummary[]>;
	search(query: EmailSearchQuery): Promise<EmailSummary[]>;
	moveEmail(uid: string, targetFolder: string): Promise<void>;
	flagEmail(uid: string, flag: string): Promise<void>;
	unflagEmail(uid: string, flag: string): Promise<void>;
	trashEmail(uid: string): Promise<void>;
	archiveEmail(uid: string): Promise<void>;
	listFolders(): Promise<EmailFolder[]>;
	setKeyword(uid: string, keyword: string): Promise<void>;
	markRead(uid: string): Promise<void>;
	markSpam(uid: string): Promise<void>;
	/** Returns current folder and flags for an email by UID. Throws if not found. */
	getMessageFlags(uid: string): Promise<{ folder: string; flags: string[] }>;
}

export class ImapFlowBackend implements EmailBackend {
	private config: IMAPConfig;
	private retryDelayMs: number;

	constructor(config: IMAPConfig, retryDelayMs = 1000) {
		this.config = config;
		this.retryDelayMs = retryDelayMs;
	}

	private async withConnection<T>(
		operation: (client: ImapFlow) => Promise<T>,
	): Promise<T> {
		let lastError: Error | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			const client = new ImapFlow({
				host: this.config.host,
				port: this.config.port,
				secure: this.config.secure,
				auth: this.config.auth,
				logger: false,
				tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
			});
			try {
				await client.connect();
				return await operation(client);
			} catch (err) {
				lastError = err as Error;
				if (!isTransientError(err)) throw err;
				if (attempt < 2) {
					await sleep(this.retryDelayMs * 2 ** attempt);
				}
			} finally {
				await client.logout().catch(() => {});
			}
		}
		throw lastError;
	}

	async listUnread(limit = 20): Promise<EmailSummary[]> {
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock("INBOX");
			try {
				const searchResult = await client.search(
					{ seen: false },
					{ uid: true },
				);
				const uids = searchResult || [];
				const limitedUids = uids.slice(0, limit);
				if (limitedUids.length === 0) return [];

				const results: EmailSummary[] = [];
				const uidRange = limitedUids.join(",");
				for await (const msg of client.fetch(uidRange, {
					uid: true,
					envelope: true,
					flags: true,
				})) {
					const from = msg.envelope?.from?.[0];
					results.push({
						uid: String(msg.uid),
						from: {
							name: from?.name ?? "",
							address: from?.address ?? "",
						},
						subject: msg.envelope?.subject ?? "",
						date: msg.envelope?.date?.toISOString() ?? "",
						flags: msg.flags ? Array.from(msg.flags) : [],
						folder: "INBOX",
					});
				}
				return results;
			} finally {
				lock.release();
			}
		});
	}

	async search(query: EmailSearchQuery): Promise<EmailSummary[]> {
		const folder = query.folder ?? "INBOX";
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock(folder);
			try {
				const searchCriteria: Record<string, unknown> = {};
				if (query.from) searchCriteria.from = query.from;
				if (query.subject) searchCriteria.subject = query.subject;
				if (query.since) searchCriteria.since = new Date(query.since);
				if (query.before) searchCriteria.before = new Date(query.before);
				if (query.flagged !== undefined) searchCriteria.flagged = query.flagged;
				if (query.seen !== undefined) searchCriteria.seen = query.seen;
				if (query.keyword) searchCriteria.keyword = query.keyword;

				const searchResult = await client.search(
					searchCriteria as Parameters<typeof client.search>[0],
					{ uid: true },
				);
				const uids = searchResult || [];
				if (uids.length === 0) return [];

				const results: EmailSummary[] = [];
				const uidRange = (uids as number[]).join(",");
				for await (const msg of client.fetch(uidRange, {
					uid: true,
					envelope: true,
					flags: true,
				})) {
					const from = msg.envelope?.from?.[0];
					results.push({
						uid: String(msg.uid),
						from: {
							name: from?.name ?? "",
							address: from?.address ?? "",
						},
						subject: msg.envelope?.subject ?? "",
						date: msg.envelope?.date?.toISOString() ?? "",
						flags: msg.flags ? Array.from(msg.flags) : [],
						folder,
					});
				}
				return results;
			} finally {
				lock.release();
			}
		});
	}

	async moveEmail(uid: string, targetFolder: string): Promise<void> {
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock("INBOX");
			try {
				await client.messageMove(uid, targetFolder, { uid: true });
			} finally {
				lock.release();
			}
		});
	}

	async flagEmail(uid: string, flag: string): Promise<void> {
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock("INBOX");
			try {
				await client.messageFlagsAdd(uid, [flag], { uid: true });
			} finally {
				lock.release();
			}
		});
	}

	async unflagEmail(uid: string, flag: string): Promise<void> {
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock("INBOX");
			try {
				await client.messageFlagsRemove(uid, [flag], { uid: true });
			} finally {
				lock.release();
			}
		});
	}

	async trashEmail(uid: string): Promise<void> {
		return this.moveEmail(uid, "Trash");
	}

	async archiveEmail(uid: string): Promise<void> {
		return this.moveEmail(uid, "Archive");
	}

	async listFolders(): Promise<EmailFolder[]> {
		return this.withConnection(async (client) => {
			const mailboxes = await client.list();
			const folders: EmailFolder[] = [];
			for (const mb of mailboxes) {
				const status = await client.status(mb.path, {
					messages: true,
					unseen: true,
				});
				folders.push({
					path: mb.path,
					name: mb.name,
					specialUse: mb.specialUse ?? undefined,
					totalMessages: status.messages ?? 0,
					unseenMessages: status.unseen ?? 0,
				});
			}
			return folders;
		});
	}

	async setKeyword(uid: string, keyword: string): Promise<void> {
		return this.flagEmail(uid, keyword);
	}

	async markRead(uid: string): Promise<void> {
		return this.flagEmail(uid, "\\Seen");
	}

	async markSpam(uid: string): Promise<void> {
		return this.moveEmail(uid, "Junk");
	}

	async getMessageFlags(
		uid: string,
	): Promise<{ folder: string; flags: string[] }> {
		return this.withConnection(async (client) => {
			const lock = await client.getMailboxLock("INBOX");
			try {
				const results: Array<{ flags: string[] }> = [];
				for await (const msg of client.fetch(uid, {
					uid: true,
					flags: true,
				})) {
					results.push({ flags: msg.flags ? Array.from(msg.flags) : [] });
				}
				if (results.length === 0) {
					throw new Error(`Email UID ${uid} not found in INBOX`);
				}
				return { folder: "INBOX", flags: results[0].flags };
			} finally {
				lock.release();
			}
		});
	}
}
