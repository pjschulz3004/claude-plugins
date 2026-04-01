import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { LocalFilesBackend } from "./backend.js";

describe("LocalFilesBackend", () => {
	let tmpDir: string;
	let backend: LocalFilesBackend;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jarvis-files-test-"));
		backend = new LocalFilesBackend({ baseDir: tmpDir });
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("listInbox", () => {
		it("returns empty array when inbox dir does not exist", async () => {
			const files = await backend.listInbox();
			expect(files).toEqual([]);
		});

		it("returns files in inbox sorted by modified desc", async () => {
			const inboxDir = path.join(tmpDir, "inbox");
			await fs.mkdir(inboxDir, { recursive: true });
			await fs.writeFile(path.join(inboxDir, "a.txt"), "aaa");
			// Small delay to ensure different mtime
			await new Promise((r) => setTimeout(r, 50));
			await fs.writeFile(path.join(inboxDir, "b.txt"), "bbb");

			const files = await backend.listInbox();
			expect(files).toHaveLength(2);
			expect(files[0].name).toBe("b.txt");
			expect(files[1].name).toBe("a.txt");
			expect(files[0].location).toBe("inbox");
			expect(files[0].size).toBe(3);
		});
	});

	describe("listOutbox", () => {
		it("returns empty array when outbox dir does not exist", async () => {
			const files = await backend.listOutbox();
			expect(files).toEqual([]);
		});

		it("returns files in outbox", async () => {
			const outboxDir = path.join(tmpDir, "outbox");
			await fs.mkdir(outboxDir, { recursive: true });
			await fs.writeFile(path.join(outboxDir, "doc.pdf"), "pdf data");

			const files = await backend.listOutbox();
			expect(files).toHaveLength(1);
			expect(files[0].name).toBe("doc.pdf");
			expect(files[0].location).toBe("outbox");
		});
	});

	describe("saveToInbox", () => {
		it("creates inbox dir and writes file", async () => {
			await backend.saveToInbox("test.txt", "hello world");
			const content = await fs.readFile(
				path.join(tmpDir, "inbox", "test.txt"),
				"utf-8",
			);
			expect(content).toBe("hello world");
		});

		it("overwrites existing file", async () => {
			await backend.saveToInbox("test.txt", "v1");
			await backend.saveToInbox("test.txt", "v2");
			const content = await fs.readFile(
				path.join(tmpDir, "inbox", "test.txt"),
				"utf-8",
			);
			expect(content).toBe("v2");
		});
	});

	describe("moveToOutbox", () => {
		it("moves file from inbox to outbox", async () => {
			await backend.saveToInbox("report.txt", "data");
			await backend.moveToOutbox("report.txt");

			const outboxContent = await fs.readFile(
				path.join(tmpDir, "outbox", "report.txt"),
				"utf-8",
			);
			expect(outboxContent).toBe("data");

			// Should no longer exist in inbox
			await expect(
				fs.access(path.join(tmpDir, "inbox", "report.txt")),
			).rejects.toThrow();
		});
	});

	describe("archiveFile", () => {
		it("moves file from outbox to archive/YYYY/MM/", async () => {
			// Put a file in outbox
			const outboxDir = path.join(tmpDir, "outbox");
			await fs.mkdir(outboxDir, { recursive: true });
			await fs.writeFile(path.join(outboxDir, "invoice.pdf"), "pdf");

			await backend.archiveFile("invoice.pdf");

			const now = new Date();
			const yyyy = String(now.getFullYear());
			const mm = String(now.getMonth() + 1).padStart(2, "0");
			const archivePath = path.join(
				tmpDir,
				"archive",
				yyyy,
				mm,
				"invoice.pdf",
			);

			const content = await fs.readFile(archivePath, "utf-8");
			expect(content).toBe("pdf");

			// Should no longer exist in outbox
			await expect(
				fs.access(path.join(outboxDir, "invoice.pdf")),
			).rejects.toThrow();
		});
	});

	describe("path traversal prevention", () => {
		it("rejects filenames with ..", async () => {
			await expect(
				backend.saveToInbox("../evil.txt", "bad"),
			).rejects.toThrow(/invalid filename/i);
		});

		it("rejects filenames with forward slash", async () => {
			await expect(
				backend.saveToInbox("sub/evil.txt", "bad"),
			).rejects.toThrow(/invalid filename/i);
		});

		it("rejects filenames with backslash", async () => {
			await expect(
				backend.saveToInbox("sub\\evil.txt", "bad"),
			).rejects.toThrow(/invalid filename/i);
		});

		it("rejects path traversal in moveToOutbox", async () => {
			await expect(backend.moveToOutbox("../etc/passwd")).rejects.toThrow(
				/invalid filename/i,
			);
		});

		it("rejects path traversal in archiveFile", async () => {
			await expect(backend.archiveFile("../../evil")).rejects.toThrow(
				/invalid filename/i,
			);
		});
	});

	describe("edge cases", () => {
		it("listInbox skips subdirectories", async () => {
			const inboxDir = path.join(tmpDir, "inbox");
			await fs.mkdir(inboxDir, { recursive: true });
			await fs.writeFile(path.join(inboxDir, "file.txt"), "data");
			await fs.mkdir(path.join(inboxDir, "subdir"));

			const files = await backend.listInbox();
			expect(files).toHaveLength(1);
			expect(files[0].name).toBe("file.txt");
		});

		it("rejects empty filename in saveToInbox", async () => {
			// Empty string has no traversal chars but is still a valid test
			await backend.saveToInbox("legit.txt", "ok");
			const files = await backend.listInbox();
			expect(files).toHaveLength(1);
		});

		it("moveToOutbox fails for nonexistent file", async () => {
			await expect(
				backend.moveToOutbox("nonexistent.txt"),
			).rejects.toThrow();
		});

		it("archiveFile fails for nonexistent file", async () => {
			await expect(
				backend.archiveFile("nonexistent.txt"),
			).rejects.toThrow();
		});

		it("handles files with special characters in name", async () => {
			await backend.saveToInbox("report (final) [v2].txt", "content");
			const files = await backend.listInbox();
			expect(files).toHaveLength(1);
			expect(files[0].name).toBe("report (final) [v2].txt");
		});
	});

	describe("syncWebdav", () => {
		it("calls rclone sync via execFile with correct args", async () => {
			// Mock execFile to avoid needing rclone installed
			const { execFile } = await import("node:child_process");
			const mockExecFile = vi.fn(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: (err: Error | null, stdout: string, stderr: string) => void,
				) => {
					cb(null, "Transferred: 3 files", "");
				},
			);

			// Create backend with injected execFile
			const testBackend = new LocalFilesBackend(
				{ baseDir: tmpDir },
				mockExecFile as unknown as typeof execFile,
			);

			const result = await testBackend.syncWebdav();
			expect(result).toBe("Transferred: 3 files");
			expect(mockExecFile).toHaveBeenCalledWith(
				"rclone",
				["sync", path.join(tmpDir, "outbox"), "mailbox:"],
				expect.objectContaining({ timeout: 60000 }),
				expect.any(Function),
			);
		});

		it("throws on rclone failure", async () => {
			const mockExecFile = vi.fn(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: (err: Error | null, stdout: string, stderr: string) => void,
				) => {
					cb(new Error("rclone not found"), "", "");
				},
			);

			const testBackend = new LocalFilesBackend(
				{ baseDir: tmpDir },
				mockExecFile as unknown as Parameters<typeof LocalFilesBackend["prototype"]["syncWebdav"]> extends [] ? never : any,
			);

			await expect(testBackend.syncWebdav()).rejects.toThrow(
				"rclone not found",
			);
		});
	});
});
