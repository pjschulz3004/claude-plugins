import { describe, expect, it, vi, beforeEach } from "vitest";
import { TsdavContactsBackend } from "./backend.js";
import type { CardDAVConfig } from "./types.js";

// Mock tsdav
vi.mock("tsdav", () => {
	return {
		DAVClient: vi.fn().mockImplementation(function mockDAV() {
			return {
				login: vi.fn().mockResolvedValue(undefined),
				fetchAddressBooks: vi.fn().mockResolvedValue([]),
				fetchVCards: vi.fn().mockResolvedValue([]),
				createVCard: vi.fn().mockResolvedValue(undefined),
				updateVCard: vi.fn().mockResolvedValue(undefined),
			};
		}),
	};
});

// biome-ignore lint/suspicious/noExplicitAny: test mocking
const { DAVClient } = (await import("tsdav")) as any;

const TEST_CONFIG: CardDAVConfig = {
	serverUrl: "https://dav.mailbox.org/carddav/",
	username: "test@mailbox.org",
	password: "secret",
};

const SAMPLE_VCARD = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
EMAIL:john@example.com
EMAIL:john.doe@work.com
TEL:+49123456789
TEL:+49987654321
ORG:ACME Corp
ADR:;;123 Main St;Berlin;;10115;Germany
NOTE:Important contact
UID:uid-john-doe
END:VCARD`;

const SAMPLE_VCARD_MINIMAL = `BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
N:Smith;Jane;;;
EMAIL:jane@example.com
UID:uid-jane-smith
END:VCARD`;

function makeMockClient(overrides: Record<string, unknown> = {}) {
	return {
		login: vi.fn().mockResolvedValue(undefined),
		fetchAddressBooks: vi.fn().mockResolvedValue([]),
		fetchVCards: vi.fn().mockResolvedValue([]),
		createVCard: vi.fn().mockResolvedValue(undefined),
		updateVCard: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("TsdavContactsBackend", () => {
	let backend: TsdavContactsBackend;

	beforeEach(() => {
		vi.clearAllMocks();
		backend = new TsdavContactsBackend(TEST_CONFIG, 0);
	});

	describe("searchContacts", () => {
		it("returns matching contacts by name (case-insensitive)", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD },
						{ url: "/addr/jane.vcf", data: SAMPLE_VCARD_MINIMAL },
					]),
				});
			});

			const results = await backend.searchContacts("john");
			expect(results).toHaveLength(1);
			expect(results[0].fullName).toBe("John Doe");
			expect(results[0].primaryEmail).toBe("john@example.com");
			expect(results[0].id).toBe("/addr/john.vcf");
		});

		it("matches by email", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD },
					]),
				});
			});

			const results = await backend.searchContacts("work.com");
			expect(results).toHaveLength(1);
			expect(results[0].fullName).toBe("John Doe");
		});

		it("matches by organization", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD },
						{ url: "/addr/jane.vcf", data: SAMPLE_VCARD_MINIMAL },
					]),
				});
			});

			const results = await backend.searchContacts("acme");
			expect(results).toHaveLength(1);
			expect(results[0].organization).toBe("ACME Corp");
		});

		it("returns empty array when no matches", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD },
					]),
				});
			});

			const results = await backend.searchContacts("nonexistent");
			expect(results).toHaveLength(0);
		});

		it("returns empty when no address books", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([]),
				});
			});

			const results = await backend.searchContacts("anyone");
			expect(results).toHaveLength(0);
		});
	});

	describe("getContact", () => {
		it("returns full contact details with multi-value fields", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD, etag: '"etag1"' },
					]),
				});
			});

			const contact = await backend.getContact("/addr/john.vcf");
			expect(contact.id).toBe("/addr/john.vcf");
			expect(contact.fullName).toBe("John Doe");
			expect(contact.emails).toEqual(["john@example.com", "john.doe@work.com"]);
			expect(contact.phones).toEqual(["+49123456789", "+49987654321"]);
			expect(contact.organization).toBe("ACME Corp");
			expect(contact.addresses).toHaveLength(1);
			expect(contact.notes).toBe("Important contact");
		});

		it("throws when contact not found", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([]),
				});
			});

			await expect(backend.getContact("/addr/missing.vcf")).rejects.toThrow("not found");
		});
	});

	describe("createContact", () => {
		it("creates a valid vCard 3.0 with all fields", async () => {
			let capturedData = "";
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					createVCard: vi.fn().mockImplementation((opts: { vCardString: string }) => {
						capturedData = opts.vCardString;
					}),
				});
			});

			await backend.createContact({
				fullName: "New Person",
				emails: ["new@example.com"],
				phones: ["+491111"],
				organization: "NewCo",
				addresses: ["456 Oak Ave"],
				notes: "Brand new",
			});

			expect(capturedData).toContain("BEGIN:VCARD");
			expect(capturedData).toContain("VERSION:3.0");
			expect(capturedData).toContain("FN:New Person");
			expect(capturedData).toContain("EMAIL:new@example.com");
			expect(capturedData).toContain("TEL:+491111");
			expect(capturedData).toContain("ORG:NewCo");
			expect(capturedData).toContain("NOTE:Brand new");
			expect(capturedData).toContain("END:VCARD");
		});

		it("creates minimal vCard with only fullName", async () => {
			let capturedData = "";
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					createVCard: vi.fn().mockImplementation((opts: { vCardString: string }) => {
						capturedData = opts.vCardString;
					}),
				});
			});

			await backend.createContact({ fullName: "Minimal Person" });

			expect(capturedData).toContain("FN:Minimal Person");
			expect(capturedData).not.toContain("EMAIL:");
			expect(capturedData).not.toContain("TEL:");
		});

		it("throws when no address books found", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([]),
				});
			});

			await expect(backend.createContact({ fullName: "Test" })).rejects.toThrow(
				"No address books",
			);
		});
	});

	describe("updateContact", () => {
		it("updates specified fields and preserves others", async () => {
			let capturedData = "";
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([
						{ url: "/addr/john.vcf", data: SAMPLE_VCARD, etag: '"etag1"' },
					]),
					updateVCard: vi
						.fn()
						.mockImplementation((opts: { vCard: { data: string } }) => {
							capturedData = opts.vCard.data;
						}),
				});
			});

			await backend.updateContact("/addr/john.vcf", {
				fullName: "John Updated",
				phones: ["+49555"],
			});

			expect(capturedData).toContain("FN:John Updated");
			expect(capturedData).toContain("TEL:+49555");
			// Should preserve existing emails
			expect(capturedData).toContain("EMAIL:john@example.com");
			expect(capturedData).toContain("EMAIL:john.doe@work.com");
		});

		it("throws when contact not found", async () => {
			DAVClient.mockImplementation(function mockDAV() {
				return makeMockClient({
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([]),
				});
			});

			await expect(
				backend.updateContact("/addr/missing.vcf", { fullName: "X" }),
			).rejects.toThrow("not found");
		});
	});

	describe("retry logic", () => {
		it("retries on transient error", async () => {
			let callCount = 0;
			DAVClient.mockImplementation(function mockDAV() {
				return {
					login: vi.fn().mockImplementation(() => {
						callCount++;
						if (callCount === 1) {
							const err = new Error("connection reset") as NodeJS.ErrnoException;
							err.code = "ECONNRESET";
							throw err;
						}
						return Promise.resolve();
					}),
					fetchAddressBooks: vi.fn().mockResolvedValue([{ url: "/addr/" }]),
					fetchVCards: vi.fn().mockResolvedValue([]),
					createVCard: vi.fn(),
					updateVCard: vi.fn(),
				};
			});

			const results = await backend.searchContacts("test");
			expect(results).toHaveLength(0);
			expect(callCount).toBe(2);
		});

		it("does not retry on auth error", async () => {
			let callCount = 0;
			DAVClient.mockImplementation(function mockDAV() {
				return {
					login: vi.fn().mockImplementation(() => {
						callCount++;
						throw new Error("401 Unauthorized");
					}),
					fetchAddressBooks: vi.fn(),
					fetchVCards: vi.fn(),
					createVCard: vi.fn(),
					updateVCard: vi.fn(),
				};
			});

			await expect(backend.searchContacts("test")).rejects.toThrow("Unauthorized");
			expect(callCount).toBe(1);
		});
	});
});
