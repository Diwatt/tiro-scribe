import type { File } from 'expo-file-system';
import type { AppLogger } from '@/Core/AppLogger';
import { InferenceModelDownloaderException } from '@/Exception';
import { FileNetworkClient } from './FileNetworkClient';
import { FileAssembler } from './FileAssembler';

/**
 * FileDownloader – High-level orchestrator for chunked file downloads.
 * Single Responsibility: Coordinate FileNetworkClient and FileAssembler, yield progress to caller.
 */
export class FileDownloader {
    public constructor(
        private readonly destinationFile: File,
        private readonly logger: AppLogger,
        private readonly chunkSize: number = 5 * 1024 * 1024, // 5 MB
    ) {}

    /**
     * Download a file from a URL with progress tracking.
     * Async generator that yields progress updates (0-1).
     * @param url - The URL to download from
     * @param totalBytes - The total file size in bytes (from API)
     * @returns Async generator that yields progress updates (0-1) and completes when download finishes
     * @throws {InferenceModelDownloaderException} If download fails
     */
    public async *download(url: string, totalBytes: number): AsyncGenerator<number, void, void> {
        this.logger.debug(`Downloading file from ${url} to ${this.destinationFile.uri} (${totalBytes} bytes)`);

        this.ensureDestinationFileExists();

        const fileNetworkClient = new FileNetworkClient();
        const fileAssembler = new FileAssembler(this.destinationFile, totalBytes);

        try {
            yield 0;

            if (totalBytes <= 0) {
                this.logger.warn(`Invalid totalBytes (${totalBytes}) for ${url}`);
                yield 1;
                return;
            }

            // Small file bypass — fetch without Range headers
            if (totalBytes <= this.chunkSize) {
                yield* this.downloadSmallFile(url, fileNetworkClient, fileAssembler);
                return;
            }

            this.logger.debug(`Large file (${totalBytes} bytes), downloading in chunks`);

            // Large file — download in chunks using Range headers
            while (!fileAssembler.isComplete()) {
                const start = fileAssembler.getBytesWritten();
                const end = Math.min(start + this.chunkSize - 1, totalBytes - 1);

                this.logger.debug(`Fetching range: bytes=${start}-${end} for ${url}`);

                const chunkBytes = await fileNetworkClient.fetchRange(url, start, end);

                fileAssembler.writeChunk(chunkBytes);

                const progress = fileAssembler.getProgress();
                this.logger.debug(`Progress: ${(progress * 100).toFixed(1)}%`);
                yield progress;
            }

            yield 1;

            this.logger.debug(`Download completed: ${url} -> ${this.destinationFile.uri}`);
        } catch (error) {
            this.logger.error(`Failed to download file from ${url}:`, error);
            throw new InferenceModelDownloaderException(
                `Failed to download file from ${url}: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        } finally {
            fileAssembler.close();
        }
    }

    private ensureDestinationFileExists(): void {
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

    private async *downloadSmallFile(
        url: string,
        fileNetworkClient: FileNetworkClient,
        fileAssembler: FileAssembler,
    ): AsyncGenerator<number, void, void> {
        this.logger.debug(`Small file, fetching without Range headers`);

        const bytes = await fileNetworkClient.fetch(url);
        fileAssembler.writeChunk(bytes);

        yield 1;
        this.logger.debug(`Download completed (small file): ${url} -> ${this.destinationFile.uri}`);
    }
}