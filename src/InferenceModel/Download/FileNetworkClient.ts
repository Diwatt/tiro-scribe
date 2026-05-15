import { fetch } from 'expo/fetch';
import { InferenceModelDownloaderException } from '@/Exception';
import type { AppLogger } from '@/Core/AppLogger';

/**
 * Simple binary semaphore that serialises async operations.
 * Used to prevent concurrent `expo/fetch` response streams from
 * cross-contaminating each other on Android (Hermes).
 */
class Semaphore {
    private queue: Array<() => void> = [];
    private locked = false;

    public acquire(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    public release(): void {
        const next = this.queue.shift();
        if (next) {
            next();
        } else {
            this.locked = false;
        }
    }
}

/**
 * FileNetworkClient – Pure, stateless network client for file downloads.
 * Single Responsibility: Send HTTP requests (full or ranged) and return raw bytes.
 *
 * All fetch+stream operations are serialised through a shared semaphore to
 * work around an Android/Hermes bug where concurrent `expo/fetch` response
 * body streams silently cross-contaminate their chunks.
 */
export class FileNetworkClient {
    private static readonly STREAM_BUFFER_SIZE = 64 * 1024; // 64KB buffer for streaming

    /** Shared semaphore — one fetch stream at a time across ALL instances. */
    private static readonly fetchSemaphore = new Semaphore();

    public constructor(private readonly logger?: AppLogger) {}

    /**
     * Fetch an entire file using a standard GET request.
     * Uses streaming to avoid loading large files into memory.
     * @param url - The URL to fetch from
     * @param onChunk - Callback invoked for each chunk of data received
     * @throws {InferenceModelDownloaderException} If response is not OK
     */
    public async fetch(url: string, onChunk: (chunk: Uint8Array) => void): Promise<void> {
        await FileNetworkClient.fetchSemaphore.acquire();
        try {
            if (this.logger) {
                this.logger.debug(`Fetching full file from ${url}`);
            }

            const response = await fetch(url);

            if (this.logger) {
                this.logger.debug(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}, content-length: ${response.headers.get('content-length')}`);
            }

            if (!response.ok) {
                throw new InferenceModelDownloaderException(
                    `HTTP ${response.status}: ${response.statusText} while fetching ${url}`,
                );
            }

            await this.streamResponse(response, onChunk);
        } finally {
            FileNetworkClient.fetchSemaphore.release();
        }
    }

    /**
     * Fetch a specific byte range from a URL using Range headers.
     * Uses streaming to avoid loading large chunks into memory.
     * @param url - The URL to fetch from
     * @param startByte - Start byte (inclusive)
     * @param endByte - End byte (inclusive)
     * @param onChunk - Callback invoked for each chunk of data received
     * @throws {InferenceModelDownloaderException} If server ignores Range header (200 OK) or returns unexpected status
     */
    public async fetchRange(
        url: string,
        startByte: number,
        endByte: number,
        onChunk: (chunk: Uint8Array) => void,
    ): Promise<void> {
        await FileNetworkClient.fetchSemaphore.acquire();
        try {
            const headers = new Headers();
            headers.append('Range', `bytes=${startByte}-${endByte}`);

            if (this.logger) {
                this.logger.debug(`Fetching range: bytes=${startByte}-${endByte} from ${url}`);
            }

            const response = await fetch(url, { headers });

            if (this.logger) {
                this.logger.debug(`Response status: ${response.status}, content-length: ${response.headers.get('content-length')}`);
            }

            // Server ignored Range header and sent full file — fail fast to prevent OOM
            if (response.status === 200) {
                throw new InferenceModelDownloaderException(
                    `Server ignored Range header for bytes=${startByte}-${endByte} on ${url}. ` +
                        `Refusing to read full ${response.headers.get('content-length') ?? 'unknown'} byte body into memory.`,
                );
            }

            // Server returned partial content (supports Range header)
            if (response.status === 206) {
                await this.streamResponse(response, onChunk);
                return;
            }

            throw new InferenceModelDownloaderException(
                `Unexpected HTTP ${response.status}: ${response.statusText} for range bytes=${startByte}-${endByte}`,
            );
        } finally {
            FileNetworkClient.fetchSemaphore.release();
        }
    }

    /**
     * Stream response body in chunks to avoid OOM.
     * @param response - The fetch response object
     * @param onChunk - Callback invoked for each chunk of data received
     */
    private async streamResponse(
        response: Response,
        onChunk: (chunk: Uint8Array) => void,
    ): Promise<void> {
        if (!response.body) {
            throw new InferenceModelDownloaderException('Response body is null');
        }

        const reader = response.body.getReader();
        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

        if (totalBytes && this.logger) {
            this.logger.debug(`Streaming ${totalBytes} bytes in ${FileNetworkClient.STREAM_BUFFER_SIZE}-byte chunks`);
        }

        try {
            let result = await reader.read();
            let streamedBytes = 0;
            while (!result.done) {
                if (result.value && result.value.length > 0) {
                    // Deep-copy the chunk using set() to guarantee an independent
                    // ArrayBuffer.  The previous .buffer.slice() approach could
                    // silently share pooled buffers on Hermes when multiple
                    // concurrent fetch streams reuse the same underlying memory.
                    const copy = new Uint8Array(result.value.length);
                    copy.set(result.value);
                    onChunk(copy);
                    streamedBytes += copy.length;
                }
                result = await reader.read();
            }

            if (this.logger && totalBytes && streamedBytes !== totalBytes) {
                this.logger.warn(
                    `Stream byte count mismatch: expected ${totalBytes}, received ${streamedBytes} (delta ${totalBytes - streamedBytes})`,
                );
            }
        } catch (error) {
            throw new InferenceModelDownloaderException(
                `Failed to stream response body: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        } finally {
            reader.releaseLock();
        }
    }
}
