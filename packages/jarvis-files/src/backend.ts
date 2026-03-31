import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execFile as defaultExecFile } from "node:child_process";
import type { FilesConfig, FileEntry, FileLocation } from "./types.js";

export interface FilesBackend {
	listInbox(): Promise<FileEntry[]>;
	listOutbox(): Promise<FileEntry[]>;
	saveToInbox(filename: string, content: string): Promise<void>;
	moveToOutbox(filename: string): Promise<void>;
	archiveFile(filename: string): Promise<void>;
	syncWebdav(): Promise<string>;
}

export class LocalFilesBackend implements FilesBackend {
	private config: FilesConfig;
	private execFileFn: typeof defaultExecFile;

	constructor(config: FilesConfig, execFileFn?: typeof defaultExecFile) {
		this.config = config;
		this.execFileFn = execFileFn ?? defaultExecFile;
	}

	private validateFilename(name: string): void {
		if (
			name.includes("..") ||
			name.includes("/") ||
			name.includes("\\")
		) {
			throw new Error(
				`Invalid filename: "${name}" — must not contain "..", "/", or "\\"`,
			);
		}
	}

	private async ensureDir(dirPath: string): Promise<void> {
		await fs.mkdir(dirPath, { recursive: true });
	}

	private async listDir(location: FileLocation): Promise<FileEntry[]> {
		const dirPath = path.join(this.config.baseDir, location);
		let entries: string[];
		try {
			entries = await fs.readdir(dirPath);
		} catch {
			// Directory doesn't exist yet — that's fine
			return [];
		}

		const files: FileEntry[] = [];
		for (const name of entries) {
			const filePath = path.join(dirPath, name);
			const stat = await fs.stat(filePath);
			if (stat.isFile()) {
				files.push({
					name,
					path: path.join(location, name),
					size: stat.size,
					modified: stat.mtime.toISOString(),
					location,
				});
			}
		}

		// Sort by modified descending (newest first)
		files.sort(
			(a, b) =>
				new Date(b.modified).getTime() - new Date(a.modified).getTime(),
		);

		return files;
	}

	async listInbox(): Promise<FileEntry[]> {
		return this.listDir("inbox");
	}

	async listOutbox(): Promise<FileEntry[]> {
		return this.listDir("outbox");
	}

	async saveToInbox(filename: string, content: string): Promise<void> {
		this.validateFilename(filename);
		const inboxDir = path.join(this.config.baseDir, "inbox");
		await this.ensureDir(inboxDir);
		await fs.writeFile(path.join(inboxDir, filename), content);
	}

	async moveToOutbox(filename: string): Promise<void> {
		this.validateFilename(filename);
		const outboxDir = path.join(this.config.baseDir, "outbox");
		await this.ensureDir(outboxDir);
		await fs.rename(
			path.join(this.config.baseDir, "inbox", filename),
			path.join(outboxDir, filename),
		);
	}

	async archiveFile(filename: string): Promise<void> {
		this.validateFilename(filename);
		const now = new Date();
		const yyyy = String(now.getFullYear());
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const archiveDir = path.join(
			this.config.baseDir,
			"archive",
			yyyy,
			mm,
		);
		await this.ensureDir(archiveDir);
		await fs.rename(
			path.join(this.config.baseDir, "outbox", filename),
			path.join(archiveDir, filename),
		);
	}

	async syncWebdav(): Promise<string> {
		const outboxPath = path.join(this.config.baseDir, "outbox");
		const args = ["sync", outboxPath, "mailbox:"];

		return new Promise<string>((resolve, reject) => {
			let attempts = 0;
			const maxAttempts = 3;

			const attempt = () => {
				attempts++;
				this.execFileFn(
					"rclone",
					args,
					{ timeout: 60000 },
					(err: Error | null, stdout: string | Buffer, stderr: string | Buffer) => {
						if (err) {
							if (attempts < maxAttempts) {
								setTimeout(attempt, 1000 * 2 ** (attempts - 1));
								return;
							}
							reject(err);
							return;
						}
						resolve(String(stdout));
					},
				);
			};

			attempt();
		});
	}
}
