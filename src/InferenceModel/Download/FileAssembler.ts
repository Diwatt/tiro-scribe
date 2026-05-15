
import type { File, FileHandle } from 'expo-file-system';
import type { AppLogger } from '@/Core/AppLogger';

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
        private readonly logger?: AppLogger,
    ) {
        // Ensure a clean slate: delete any stale file from a previous
        // failed download so we never append to or overwrite partial data.
        if (file.exists) {
            file.delete();
        }
        file.create();

        this.handle = file.open();
        this.downloadedBytes = 0;

        if (this.logger) {
            this.logger.debug(`FileAssembler: opened ${file.uri}, handle offset=${this.handle.offset}, file size=${file.size}`);
        }
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
        // Defensive: ensure the handle offset matches our tracked position.
        // This catches any silent offset drift caused by the platform.
        if (this.handle.offset !== this.downloadedBytes) {
            this.handle.offset = this.downloadedBytes;
        }
        this.handle.writeBytes(bytes);
        this.downloadedBytes += bytes.length;
    }
}
