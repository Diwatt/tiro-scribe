/**
 * FileDownloader – Handles actual file downloading with progress tracking.
 * Single Responsibility: Download a single file from a URL to a File object with progress tracking.
 */

import { fetch } from 'expo/fetch';
import type { File } from 'expo-file-system';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';

export class FileDownloader {
    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    /**
     * Download a single file from a URL to a File object with progress tracking.
     * Modern async generator approach that yields progress updates (0-1).
     * @param url - The URL to download from
     * @param destinationFile - The File object to write to
     * @returns Async generator that yields progress updates (0-1) and completes when download finishes
     * @throws {InferenceModelDownloaderException} If download fails
     * @example
     * ```typescript
     * for await (const progress of downloader.downloadFile(url, file)) {
     *   console.log(`Progress: ${progress * 100}%`);
     * }
     * ```
     */
    public async *downloadFile(url: string, destinationFile: File): AsyncGenerator<number, void, void> {
        this.logger.debug(`Downloading file from ${url} to ${destinationFile.uri}`);

        try {
            yield 0;

            // Start the fetch request
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get total size from Content-Length header if available
            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            let bytesWritten = 0;

            // Get a writable stream
            const writableStream = destinationFile.writableStream();
            const writer = writableStream.getWriter();

            // Get the readable stream from response body
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            // Read and write chunks
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                // Write chunk
                await writer.write(value);

                // Update progress
                bytesWritten += value.length;
                if (totalBytes > 0) {
                    const progress = bytesWritten / totalBytes;
                    yield progress;
                } else {
                    // Unknown total size, send incremental updates (0.5 indicates ongoing)
                    yield 0.5;
                }
            }

            // Close the writer
            await writer.close();

            // If total size was unknown, yield 1.0 at completion
            if (totalBytes <= 0) {
                yield 1.0;
            }

            this.logger.debug(`Download completed: ${url} -> ${destinationFile.uri}`);
        } catch (error) {
            this.logger.error(`Failed to download file from ${url}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to download file from ${url}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }
}
