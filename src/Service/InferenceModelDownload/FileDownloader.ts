/**
 * FileDownloader – Handles actual file downloading with progress tracking.
 * Single Responsibility: Download a single file from a URL to a File object with progress tracking.
 */

import { fetch } from 'expo/fetch';
import type { File } from 'expo-file-system';
import type { LoggerInterface } from '@/Container';
import { Container } from '@/Container';
import { InferenceModelDownloaderException } from '@/Exception';
import { StreamWriter } from './StreamWriter';

export class FileDownloader {
    public constructor(
        private readonly destinationFile: File,
        private readonly logger: LoggerInterface = Container.logger,
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
            const reader = response.body.getReader();

            // Stream and write chunks with progress tracking
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
}
