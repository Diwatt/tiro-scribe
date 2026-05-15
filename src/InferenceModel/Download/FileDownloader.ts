import { Directory, File } from 'expo-file-system';
import type { AppLogger } from '@/Core/AppLogger';
import { InferenceModelDownloaderException } from '@/Exception';

/**
 * FileDownloader – Downloads files using native expo-file-system downloadFileAsync.
 *
 * Uses `File.downloadFileAsync()` which performs the download entirely at the
 * native layer, bypassing the buggy `expo/fetch` ReadableStream on Android
 * (Hermes) that silently drops 8192 bytes per 5 MB chunk.
 *
 * Single Responsibility: Download a file from URL to disk, yield progress.
 */
export class FileDownloader {
    public constructor(
        private readonly destinationFile: File,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Download a file from a URL using native download.
     * Async generator that yields progress updates (0-1).
     * @param url - The URL to download from
     * @param totalBytes - The total file size in bytes (from API, used for progress)
     * @returns Async generator that yields progress updates (0-1) and completes when download finishes
     * @throws {InferenceModelDownloaderException} If download fails
     */
    public async *download(url: string, totalBytes: number): AsyncGenerator<number, void, void> {
        this.logger.debug(`Downloading file from ${url} to ${this.destinationFile.uri} (${totalBytes} bytes)`);

        try {
            yield 0;

            if (totalBytes <= 0) {
                this.logger.warn(`Invalid totalBytes (${totalBytes}) for ${url}`);
                yield 1;
                return;
            }

            // Ensure destination is clean (delete stale file from previous attempt)
            if (this.destinationFile.exists) {
                this.destinationFile.delete();
            }

            // Get parent directory and ensure it exists
            const parentDir = this.destinationFile.parentDirectory;
            if (parentDir && !parentDir.exists) {
                parentDir.create();
            }

            this.logger.debug(`Starting native download: ${url}`);

            // Use the native download API — downloads directly to disk without
            // going through the JS ReadableStream that drops bytes on Android.
            const downloadedFile = await File.downloadFileAsync(
                url,
                parentDir ?? new Directory(this.destinationFile.uri.substring(0, this.destinationFile.uri.lastIndexOf('/'))),
            );

            // Native download creates a file with the remote filename.
            // If the name differs from our destination, rename/move it.
            if (downloadedFile.uri !== this.destinationFile.uri) {
                this.logger.debug(`Renaming ${downloadedFile.uri} -> ${this.destinationFile.uri}`);
                // Copy the downloaded file to our destination path
                downloadedFile.copy(this.destinationFile);
                // Delete the original
                if (downloadedFile.exists) {
                    downloadedFile.delete();
                }
            }

            // Verify the file exists and has content
            if (!this.destinationFile.exists) {
                throw new InferenceModelDownloaderException(
                    `Download completed but file does not exist: ${this.destinationFile.uri}`,
                );
            }

            const actualSize = this.destinationFile.size;
            this.logger.debug(`Download completed: ${url} -> ${this.destinationFile.uri} (${actualSize} bytes)`);

            if (actualSize !== totalBytes) {
                this.logger.warn(
                    `Size mismatch after native download: expected ${totalBytes}, got ${actualSize} (delta ${totalBytes - actualSize})`,
                );
            }

            yield 1;
        } catch (error) {
            if (error instanceof InferenceModelDownloaderException) {
                throw error;
            }
            this.logger.error(`Failed to download file from ${url}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to download file from ${url}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }
}
