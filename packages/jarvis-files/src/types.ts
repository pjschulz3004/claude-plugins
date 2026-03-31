import { z } from "zod";

// File management configuration
export interface FilesConfig {
	baseDir: string;
}

// Location of a file within the inbox/outbox/archive structure
export type FileLocation = "inbox" | "outbox" | "archive";

// A single file entry with metadata
export interface FileEntry {
	name: string;
	path: string; // relative to baseDir
	size: number; // bytes
	modified: string; // ISO 8601
	location: FileLocation;
}

// Zod schemas for MCP tool input validation

export const ListFilesInputSchema = z.object({});

export const SaveToInboxInputSchema = z.object({
	filename: z.string().describe("Name of the file to save"),
	content: z.string().describe("File content (text)"),
});

export const MoveToOutboxInputSchema = z.object({
	filename: z.string().describe("Name of the file to move from inbox to outbox"),
});

export const ArchiveFileInputSchema = z.object({
	filename: z.string().describe("Name of the file to archive from outbox"),
});

export const SyncWebdavInputSchema = z.object({});
