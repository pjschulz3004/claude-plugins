import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { IMAPConfig } from "./types.js";

// Controllable mock behavior
let mockBehavior: {
	connectFn: () => Promise<void>;
	logoutFn: () => Promise<void>;
	searchResult: number[];
	fetchMessages: Array<{
		uid: number;
		envelope: {
			from: Array<{ name: string; address: string }>;
			subject: string;
			date: Date;
		};
		flags: Set<string>;
	}>;
	listResult: Array<{
		path: string;
		name: string;
		specialUse?: string;
	}>;
	statusResults: Array<{ messages: number; unseen: number }>;
};

// Track all created instances
let mockInstances: Array<{
	connect: Mock;
	logout: Mock;
	getMailboxLock: Mock;
	list: Mock;
	status: Mock;
	messageMove: Mock;
	messageFlagsAdd: Mock;
	messageFlagsRemove: Mock;
	search: Mock;
	fetch: Mock;
}>;

function resetMockBehavior() {
	mockBehavior = {
		connectFn: async () => {},
		logoutFn: async () => {},
		searchResult: [],
		fetchMessages: [],
		listResult: [],
		statusResults: [],
	};
}

// Mock imapflow module
vi.mock("imapflow", () => {
	class MockImapFlow {
		connect: Mock;
		logout: Mock;
		getMailboxLock: Mock;
		list: Mock;
		status: Mock;
		messageMove: Mock;
		messageFlagsAdd: Mock;
		messageFlagsRemove: Mock;
		search: Mock;
		fetch: Mock;

		constructor() {
			let statusCallIndex = 0;
			this.connect = vi.fn().mockImplementation(() => mockBehavior.connectFn());
			this.logout = vi.fn().mockImplementation(() => mockBehavior.logoutFn());
			this.getMailboxLock = vi.fn().mockResolvedValue({ release: vi.fn() });
			this.list = vi
				.fn()
				.mockImplementation(() => Promise.resolve(mockBehavior.listResult));
			this.status = vi.fn().mockImplementation(() => {
				const result = mockBehavior.statusResults[statusCallIndex] ?? {
					messages: 0,
					unseen: 0,
				};
				statusCallIndex++;
				return Promise.resolve(result);
			});
			this.messageMove = vi.fn().mockResolvedValue(true);
			this.messageFlagsAdd = vi.fn().mockResolvedValue(true);
			this.messageFlagsRemove = vi.fn().mockResolvedValue(true);
			this.search = vi
				.fn()
				.mockImplementation(() => Promise.resolve(mockBehavior.searchResult));
			this.fetch = vi.fn().mockImplementation(() => {
				let index = 0;
				return {
					[Symbol.asyncIterator]: () => ({
						next: async () => {
							if (index < mockBehavior.fetchMessages.length) {
								return {
									done: false,
									value: mockBehavior.fetchMessages[index++],
								};
							}
							return { done: true, value: undefined };
						},
					}),
				};
			});
			mockInstances.push(this);
		}
	}
	return { ImapFlow: MockImapFlow };
});

// Import after mocking
const { ImapFlowBackend } = await import("./backend.js");

const testConfig: IMAPConfig = {
	host: "imap.test.com",
	port: 993,
	secure: true,
	auth: { user: "test@test.com", pass: "password123" },
};

describe("ImapFlowBackend", () => {
	let backend: InstanceType<typeof ImapFlowBackend>;

	beforeEach(() => {
		mockInstances = [];
		resetMockBehavior();
		vi.clearAllMocks();
		backend = new ImapFlowBackend(testConfig, 0); // 0ms retry delay for tests
	});

	describe("listUnread", () => {
		it("opens connection, fetches unseen from INBOX, closes connection", async () => {
			mockBehavior.searchResult = [1];
			mockBehavior.fetchMessages = [
				{
					uid: 1,
					envelope: {
						from: [{ name: "Alice", address: "alice@example.com" }],
						subject: "Test",
						date: new Date("2026-03-31T10:00:00Z"),
					},
					flags: new Set<string>(),
				},
			];

			const results = await backend.listUnread(5);

			const inst = mockInstances[0];
			expect(inst.connect).toHaveBeenCalledOnce();
			expect(inst.logout).toHaveBeenCalledOnce();
			expect(results).toHaveLength(1);
			expect(results[0].from.address).toBe("alice@example.com");
			expect(results[0].subject).toBe("Test");
			expect(results[0].uid).toBe("1");
			expect(results[0].folder).toBe("INBOX");
		});

		it("defaults to limit 20", async () => {
			const results = await backend.listUnread();
			expect(results).toEqual([]);
		});
	});

	describe("search", () => {
		it("builds correct IMAP search criteria from query", async () => {
			await backend.search({ from: "boss@example.com", folder: "INBOX" });

			const inst = mockInstances[0];
			expect(inst.connect).toHaveBeenCalledOnce();
			expect(inst.getMailboxLock).toHaveBeenCalledWith("INBOX");
			expect(inst.search).toHaveBeenCalled();
			expect(inst.logout).toHaveBeenCalledOnce();
		});

		it("passes keyword criterion to IMAP search", async () => {
			await backend.search({ keyword: "$AutoDelete3d" });

			const inst = mockInstances[0];
			expect(inst.search).toHaveBeenCalledWith(
				expect.objectContaining({ keyword: "$AutoDelete3d" }),
				{ uid: true },
			);
		});
	});

	describe("moveEmail", () => {
		it("opens connection, moves message, closes connection", async () => {
			await backend.moveEmail("42", "Archive");

			const inst = mockInstances[0];
			expect(inst.connect).toHaveBeenCalledOnce();
			expect(inst.messageMove).toHaveBeenCalledWith("42", "Archive", {
				uid: true,
			});
			expect(inst.logout).toHaveBeenCalledOnce();
		});
	});

	describe("flagEmail", () => {
		it("adds flag to message", async () => {
			await backend.flagEmail("42", "\\Flagged");

			const inst = mockInstances[0];
			expect(inst.connect).toHaveBeenCalledOnce();
			expect(inst.messageFlagsAdd).toHaveBeenCalledWith("42", ["\\Flagged"], {
				uid: true,
			});
			expect(inst.logout).toHaveBeenCalledOnce();
		});
	});

	describe("listFolders", () => {
		it("returns folder list with special-use info", async () => {
			mockBehavior.listResult = [
				{ path: "INBOX", name: "INBOX", specialUse: "\\Inbox" },
				{ path: "Trash", name: "Trash", specialUse: "\\Trash" },
			];
			mockBehavior.statusResults = [
				{ messages: 50, unseen: 3 },
				{ messages: 10, unseen: 0 },
			];

			const folders = await backend.listFolders();

			expect(folders).toHaveLength(2);
			expect(folders[0].path).toBe("INBOX");
			expect(folders[0].specialUse).toBe("\\Inbox");
			expect(folders[0].totalMessages).toBe(50);
			expect(folders[0].unseenMessages).toBe(3);
			expect(folders[1].path).toBe("Trash");
		});
	});

	describe("setKeyword", () => {
		it("sets custom IMAP keyword", async () => {
			await backend.setKeyword("42", "$AutoDelete3d");

			const inst = mockInstances[0];
			expect(inst.messageFlagsAdd).toHaveBeenCalledWith(
				"42",
				["$AutoDelete3d"],
				{ uid: true },
			);
		});
	});

	describe("retry logic", () => {
		it("retries on transient error (ECONNRESET) up to 3 times", async () => {
			let connectCallCount = 0;
			mockBehavior.connectFn = async () => {
				connectCallCount++;
				if (connectCallCount <= 2) {
					const err = new Error("Connection reset");
					(err as NodeJS.ErrnoException).code = "ECONNRESET";
					throw err;
				}
			};

			const results = await backend.listUnread(5);
			expect(results).toEqual([]);
			// 3 ImapFlow instances created (one per attempt)
			expect(mockInstances).toHaveLength(3);
		});

		it("does NOT retry auth errors", async () => {
			mockBehavior.connectFn = async () => {
				const err = new Error("AUTHENTICATIONFAILED");
				(err as NodeJS.ErrnoException).code = "AUTHENTICATIONFAILED";
				throw err;
			};

			await expect(backend.listUnread()).rejects.toThrow(
				"AUTHENTICATIONFAILED",
			);
			// Only 1 attempt, no retries
			expect(mockInstances).toHaveLength(1);
		});
	});

	describe("logout error handling", () => {
		it("swallows logout errors (Pitfall 2)", async () => {
			mockBehavior.logoutFn = async () => {
				throw new Error("Connection not available");
			};

			// Should NOT throw despite logout error
			const results = await backend.listUnread();
			expect(results).toEqual([]);
		});
	});
});
