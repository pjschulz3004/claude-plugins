import { DAVClient } from "tsdav";
import { isTransientError, isAuthError, sleep } from "@jarvis/shared";
import type { CardDAVConfig, Contact, ContactSummary } from "./types.js";

/**
 * Unfold vCard lines (RFC 6350 section 3.2):
 * Lines starting with a space or tab are continuations of the previous line.
 */
function unfoldVCard(data: string): string {
	return data.replace(/\r?\n[ \t]/g, "");
}

/**
 * Extract all values for a given vCard property (handles multi-value).
 * Returns array of raw values.
 */
function extractVCardProps(data: string, prop: string): string[] {
	const unfolded = unfoldVCard(data);
	const results: string[] = [];
	const regex = new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, "gm");
	let match = regex.exec(unfolded);
	while (match) {
		results.push(match[1].trim());
		match = regex.exec(unfolded);
	}
	return results;
}

/**
 * Extract single vCard property value.
 */
function extractVCardProp(data: string, prop: string): string | undefined {
	const values = extractVCardProps(data, prop);
	return values.length > 0 ? values[0] : undefined;
}

/**
 * Format ADR field components into readable address string.
 * ADR format: PO Box;Extended;Street;City;Region;PostalCode;Country
 */
function formatAddress(adrValue: string): string {
	const parts = adrValue.split(";").map((p) => p.trim()).filter(Boolean);
	return parts.join(", ");
}

/**
 * Build a vCard 3.0 string from contact data.
 */
function buildVCard(data: {
	fullName: string;
	emails?: string[];
	phones?: string[];
	organization?: string;
	addresses?: string[];
	notes?: string;
	uid?: string;
}): string {
	const uid = data.uid ?? crypto.randomUUID();
	const nameParts = data.fullName.includes(" ")
		? `${data.fullName.split(" ").slice(1).join(" ")};${data.fullName.split(" ")[0]};;;`
		: `${data.fullName};;;;`;
	const lines: string[] = [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`FN:${data.fullName}`,
		`N:${nameParts}`,
	];

	if (data.emails) {
		for (const email of data.emails) {
			lines.push(`EMAIL:${email}`);
		}
	}

	if (data.phones) {
		for (const phone of data.phones) {
			lines.push(`TEL:${phone}`);
		}
	}

	if (data.organization) {
		lines.push(`ORG:${data.organization}`);
	}

	if (data.addresses) {
		for (const addr of data.addresses) {
			lines.push(`ADR:;;${addr};;;;`);
		}
	}

	if (data.notes) {
		lines.push(`NOTE:${data.notes}`);
	}

	lines.push(`UID:${uid}`, "END:VCARD");
	return lines.join("\r\n");
}

export interface ContactsBackend {
	searchContacts(query: string): Promise<ContactSummary[]>;
	getContact(id: string): Promise<Contact>;
	createContact(data: {
		fullName: string;
		emails?: string[];
		phones?: string[];
		organization?: string;
		addresses?: string[];
		notes?: string;
	}): Promise<void>;
	updateContact(
		id: string,
		fields: {
			fullName?: string;
			emails?: string[];
			phones?: string[];
			organization?: string;
			addresses?: string[];
			notes?: string;
		},
	): Promise<void>;
}

export class TsdavContactsBackend implements ContactsBackend {
	private config: CardDAVConfig;
	private retryDelayMs: number;

	constructor(config: CardDAVConfig, retryDelayMs = 1000) {
		this.config = config;
		this.retryDelayMs = retryDelayMs;
	}

	private async withConnection<T>(
		operation: (client: DAVClient) => Promise<T>,
	): Promise<T> {
		let lastError: Error | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			const client = new DAVClient({
				serverUrl: this.config.serverUrl,
				credentials: {
					username: this.config.username,
					password: this.config.password,
				},
				authMethod: "Basic",
				defaultAccountType: "carddav",
			});
			try {
				await client.login();
				return await operation(client);
			} catch (err) {
				lastError = err as Error;
				if (isAuthError(err)) throw err;
				if (!isTransientError(err)) throw err;
				if (attempt < 2) {
					await sleep(this.retryDelayMs * 2 ** attempt);
				}
			}
		}
		throw lastError;
	}

	async searchContacts(query: string): Promise<ContactSummary[]> {
		return this.withConnection(async (client) => {
			const addressBooks = await client.fetchAddressBooks();
			if (addressBooks.length === 0) return [];

			const results: ContactSummary[] = [];
			const lowerQuery = query.toLowerCase();

			for (const book of addressBooks) {
				const vCards = await client.fetchVCards({ addressBook: book });

				for (const card of vCards) {
					if (!card.data) continue;

					const fn = extractVCardProp(card.data, "FN") ?? "";
					const emails = extractVCardProps(card.data, "EMAIL");
					const org = extractVCardProp(card.data, "ORG");

					const matchesName = fn.toLowerCase().includes(lowerQuery);
					const matchesEmail = emails.some((e) =>
						e.toLowerCase().includes(lowerQuery),
					);
					const matchesOrg = org
						? org.toLowerCase().includes(lowerQuery)
						: false;

					if (matchesName || matchesEmail || matchesOrg) {
						results.push({
							id: card.url,
							fullName: fn,
							primaryEmail: emails[0],
							organization: org,
						});
					}
				}
			}

			return results;
		});
	}

	async getContact(id: string): Promise<Contact> {
		return this.withConnection(async (client) => {
			const addressBooks = await client.fetchAddressBooks();

			for (const book of addressBooks) {
				const vCards = await client.fetchVCards({ addressBook: book });

				for (const card of vCards) {
					if (card.url !== id) continue;
					if (!card.data) continue;

					const fn = extractVCardProp(card.data, "FN") ?? "";
					const emails = extractVCardProps(card.data, "EMAIL");
					const phones = extractVCardProps(card.data, "TEL");
					const org = extractVCardProp(card.data, "ORG");
					const adrs = extractVCardProps(card.data, "ADR").map(formatAddress);
					const note = extractVCardProp(card.data, "NOTE");

					return {
						id: card.url,
						fullName: fn,
						emails,
						phones,
						organization: org,
						addresses: adrs,
						notes: note,
					};
				}
			}

			throw new Error(`Contact with id '${id}' not found`);
		});
	}

	async createContact(data: {
		fullName: string;
		emails?: string[];
		phones?: string[];
		organization?: string;
		addresses?: string[];
		notes?: string;
	}): Promise<void> {
		return this.withConnection(async (client) => {
			const addressBooks = await client.fetchAddressBooks();
			if (addressBooks.length === 0) {
				throw new Error("No address books found");
			}

			const uid = crypto.randomUUID();
			const vcardData = buildVCard({ ...data, uid });

			await client.createVCard({
				addressBook: addressBooks[0],
				filename: `${uid}.vcf`,
				vCardString: vcardData,
			});
		});
	}

	async updateContact(
		id: string,
		fields: {
			fullName?: string;
			emails?: string[];
			phones?: string[];
			organization?: string;
			addresses?: string[];
			notes?: string;
		},
	): Promise<void> {
		return this.withConnection(async (client) => {
			const addressBooks = await client.fetchAddressBooks();

			for (const book of addressBooks) {
				const vCards = await client.fetchVCards({ addressBook: book });

				for (const card of vCards) {
					if (card.url !== id) continue;
					if (!card.data) continue;

					// Parse existing data
					const existingFn = extractVCardProp(card.data, "FN") ?? "";
					const existingEmails = extractVCardProps(card.data, "EMAIL");
					const existingPhones = extractVCardProps(card.data, "TEL");
					const existingOrg = extractVCardProp(card.data, "ORG");
					const existingAddrs = extractVCardProps(card.data, "ADR");
					const existingNote = extractVCardProp(card.data, "NOTE");
					const existingUid = extractVCardProp(card.data, "UID");

					// Merge: use new field if provided, else keep existing
					const newData = buildVCard({
						fullName: fields.fullName ?? existingFn,
						emails: fields.emails ?? existingEmails,
						phones: fields.phones ?? existingPhones,
						organization: fields.organization ?? existingOrg,
						addresses: fields.addresses ?? existingAddrs,
						notes: fields.notes ?? existingNote,
						uid: existingUid,
					});

					await client.updateVCard({
						vCard: {
							url: card.url,
							etag: card.etag ?? undefined,
							data: newData,
						},
					});
					return;
				}
			}

			throw new Error(`Contact with id '${id}' not found`);
		});
	}
}
