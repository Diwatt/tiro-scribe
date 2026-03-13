/**
 * FileDownloader – Handles actual file downloading with progress tracking.
 * Single Responsibility: Download a single file from a URL to a File object with progress tracking.
 */

import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import type { AppLogger } from '@/Core/AppLogger';
import { InferenceModelDownloaderException } from '@/Exception';
import { StreamWriter } from './StreamWriter';

export class FileDownloader {
    public constructor(
        private readonly destinationFile: File,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Download a file from a URL with progress tracking.
     * Modern async generator approach that yields progress updates (0-1).
     * @param url - The URL to download from
     * @returns Async generator that yields progress updates (0-1) and completes when download finishes
     * @throws {InferenceModelDownloaderException} If download fails
     * @example
     * ```typescript
     * const downloader = new FileDownloader(destinationFile);
     * for await (const progress of downloader.download(url)) {
     *   console.log(`Progress: ${progress * 100}%`);
     * }
     * ```
     */
    public async *download(url: string): AsyncGenerator<number, void, void> {
        this.logger.debug(`Downloading file from ${url} to ${this.destinationFile.uri}`);

        const streamWriter = new StreamWriter(this.destinationFile);

        this.ensureDestinationFileExists();

        try {
            yield 0;

            // Start the fetch request
            const response = await fetch(url);
            if (!response.ok) {
                throw new InferenceModelDownloaderException(`HTTP ${response.status}: ${response.statusText}`);
            }

            const totalBytes = Math.max(0, Number.parseInt(response.headers.get('content-length') || '0', 10));

            // Initialize stream writer
            await streamWriter.initialize();

            // Get the readable stream from response body
            if (!response.body) {
                throw new InferenceModelDownloaderException('Response body is not readable');
            }

            // Process the stream and yield progress updates
            yield* this.processStream(response.body, streamWriter, totalBytes);

            // Fallback: if stream produced an empty file despite HTTP 200 response,
            // retry using the native downloader (particularly important on Android).
            const fileSize = this.destinationFile.size ?? 0;
            if (fileSize === 0) {
                await this.fallbackToNativeDownload(url);
                yield 1;
                this.logger.debug(`Download completed (fallback): ${url} -> ${this.destinationFile.uri}`);
                return;
            }

            if (totalBytes <= 0) {
                yield 1;
            }

            this.logger.debug(`Download completed: ${url} -> ${this.destinationFile.uri}`);
        } catch (error) {
            this.logger.error(`Failed to download file from ${url}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to download file from ${url}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        } finally {
            // Release writer lock
            await streamWriter.release();
        }
    }

    private async *processStream(
        body: ReadableStream<Uint8Array>,
        streamWriter: StreamWriter,
        totalBytes: number,
    ): AsyncGenerator<number, void, void> {
        const reader = body.getReader();
        let writtenBytes = 0;
        let result: ReadableStreamReadResult<Uint8Array>;

        do {
            result = await reader.read();

            if (result.done || !result.value || result.value.length === 0) {
                break;
            }

            await streamWriter.write(result.value);

            writtenBytes += result.value.length;
            if (totalBytes > 0) {
                const progress = Math.min(writtenBytes / totalBytes, 1);
                yield progress;
            }
        } while (!result.done);

        await streamWriter.close();
    }

    private ensureDestinationFileExists(): void {
        // make sure destination file exists before we try to open a stream;
        // this mirrors the previous behaviour that lived in StreamWriter.
        if (!this.destinationFile.exists) {
            try {
                this.destinationFile.create();
            } catch (err) {
                throw new InferenceModelDownloaderException(
                    `Failed to create output file ${this.destinationFile.uri}`,
                    err instanceof Error ? err : new Error(String(err)),
                );
            }
        }
    }

    private async fallbackToNativeDownload(url: string): Promise<void> {
        this.logger.warn(
            `[FileDownloader] Streamed download produced empty file; retrying with native downloader for ${url}`,
        );

        // Delete the empty file before fallback (ignore failures)
        try {
            await this.destinationFile.delete();
        } catch {
            // best-effort cleanup; if it fails we still attempt the download
        }

        // Use native download as fallback
        await File.downloadFileAsync(url, this.destinationFile);
    }
}
