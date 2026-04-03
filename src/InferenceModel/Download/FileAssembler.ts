
import type { File, FileHandle } from 'expo-file-system';

/**
 * FileAssembler – Stateful file I/O manager that tracks download progress.
 * Single Responsibility: Open file handle, write bytes, track bytes written, and close.
 * Does NOT know about chunking or range calculation — that belongs to the orchestrator.
 */
export class FileAssembler {
    private readonly handle: FileHandle;
    private downloadedBytes: number;

    public constructor(
        private readonly file: File,
        private readonly totalBytes: number,
    ) {
        this.handle = this.file.open();
        this.downloadedBytes = 0;
    }

    /**
     * Close the file handle safely.
     */
    public close(): void {
        this.handle.close();
    }

    /**
     * Get the number of bytes written so far.
     */
    public getBytesWritten(): number {
        return this.downloadedBytes;
    }

    /**
     * Get current download progress as a ratio (0-1).
     */
    public getProgress(): number {
        if (this.totalBytes <= 0) {
            return 0;
        }
        return Math.min(this.downloadedBytes / this.totalBytes, 1);
    }

    /**
     * Check if the download is complete.
     */
    public isComplete(): boolean {
        return this.downloadedBytes >= this.totalBytes;
    }

    /**
     * Write a chunk of bytes to the file and update progress.
     */
    public writeChunk(bytes: Uint8Array): void {
        this.handle.writeBytes(bytes);
        this.downloadedBytes += bytes.length;
    }
}
