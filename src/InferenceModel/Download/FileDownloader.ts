import { Directory, File } from 'expo-file-system';
import type { AppLogger } from '@/Core/AppLogger';
import { InferenceModelDownloaderException } from '@/Exception';

/**
 * FileDownloader – Downloads files using native expo-file-system downloadFileAsync.
 *
 * Uses `File.downloadFileAsync()` with the built-in `onProgress` callback.
 * The `onProgress` option is supported at runtime starting from expo-file-system
 * v56 (not yet available in v55.0.19). Until then, progress callbacks are
 * silently ignored by the native layer and downloads complete without progress.
 *
 * Single Responsibility: Download a file from URL to disk with progress.
 */
export class FileDownloader {
    public constructor(
        private readonly destinationFile: File,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Download a file from a URL using native download with optional progress reporting.
     * @param url - The URL to download from
     * @param totalBytes - The total file size in bytes (from API, used for progress)
     * @param onProgress - Optional callback receiving progress as 0-1 ratio.
     *                     Note: ignored until expo-file-system v56+.
     * @throws {InferenceModelDownloaderException} If download fails
     */
    public async download(url: string, totalBytes: number, onProgress?: (progress: number) => void): Promise<void> {
        this.logger.debug(`Downloading file from ${url} to ${this.destinationFile.uri} (${totalBytes} bytes)`);

        try {
            this.prepareDestination();

            const downloadedFile = await this.executeNativeDownload(url, onProgress);

            this.ensureFileAtDestination(downloadedFile);
            this.verifyDownloadIntegrity(url, totalBytes);

            if (onProgress) {
                onProgress(1);
            }
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

    /**
     * Delete any stale file from a previous attempt and ensure the parent directory exists.
     */
    private prepareDestination(): void {
        if (this.destinationFile.exists) {
            this.destinationFile.delete();
        }

        const parentDir = this.destinationFile.parentDirectory;
        if (parentDir && !parentDir.exists) {
            parentDir.create();
        }
    }

    /**
     * Execute the native download and return the file that the native layer produced.
     */
    private async executeNativeDownload(
        url: string,
        onProgress?: (progress: number) => void,
    ): Promise<File> {
        this.logger.debug(`Starting native download: ${url}`);

        const parentDir = this.destinationFile.parentDirectory;
        const options = this.buildDownloadOptions(onProgress);

        return await File.downloadFileAsync(
            url,
            parentDir ?? new Directory(this.destinationFile.uri.substring(0, this.destinationFile.uri.lastIndexOf('/'))),
            options as Parameters<typeof File.downloadFileAsync>[2],
        );
    }

    /**
     * Build the native download options object, including the runtime onProgress callback.
     *
     * The onProgress option is typed in the source but not yet published in v55.0.19.
     * We build the options object and cast it so the callback is passed through.
     * When expo-file-system is updated to v56+, progress will start working
     * automatically without any code changes.
     */
    private buildDownloadOptions(onProgress?: (progress: number) => void): Record<string, unknown> {
        const options: Record<string, unknown> = { idempotent: true };

        if (onProgress) {
            options.onProgress = (data: { bytesWritten: number; totalBytes: number }) => {
                const progress = data.totalBytes > 0 ? Math.min(data.bytesWritten / data.totalBytes, 0.99) : 0;
                onProgress(progress);
            };
        }

        return options;
    }

    /**
     * Ensure the downloaded file ends up at the expected destination path.
     * Native download uses the remote filename; if it differs from our target we copy it over.
     */
    private ensureFileAtDestination(downloadedFile: File): void {
        if (downloadedFile.uri !== this.destinationFile.uri) {
            this.logger.debug(`Renaming ${downloadedFile.uri} -> ${this.destinationFile.uri}`);
            downloadedFile.copy(this.destinationFile);
            if (downloadedFile.exists) {
                downloadedFile.delete();
            }
        }

        if (!this.destinationFile.exists) {
            throw new InferenceModelDownloaderException(
                `Download completed but file does not exist: ${this.destinationFile.uri}`,
            );
        }
    }

    /**
     * Log the result and warn if the on-disk size does not match the expected total.
     */
    private verifyDownloadIntegrity(url: string, expectedBytes: number): void {
        const actualSize = this.destinationFile.size;
        this.logger.debug(`Download completed: ${url} -> ${this.destinationFile.uri} (${actualSize} bytes)`);

        if (actualSize !== expectedBytes) {
            this.logger.warn(
                `Size mismatch after native download: expected ${expectedBytes}, got ${actualSize} (delta ${expectedBytes - actualSize})`,
            );
        }
    }
}
