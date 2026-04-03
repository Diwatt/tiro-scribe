import { fetch } from 'expo/fetch';
import { InferenceModelDownloaderException } from '@/Exception';

/**
 * FileNetworkClient – Pure, stateless network client for file downloads.
 * Single Responsibility: Send HTTP requests (full or ranged) and return raw bytes.
 */
export class FileNetworkClient {
    /**
     * Fetch a specific byte range from a URL using Range headers.
     * @param url - The URL to fetch from
     * @param startByte - Start byte (inclusive)
     * @param endByte - End byte (inclusive)
     * @returns Uint8Array containing the requested byte range
     * @throws {InferenceModelDownloaderException} If server ignores Range header (200 OK) or returns unexpected status
     */
    public async fetchRange(
        url: string,
        startByte: number,
        endByte: number,
    ): Promise<Uint8Array> {
        const headers = new Headers();
        headers.append('Range', `bytes=${startByte}-${endByte}`);

        const response = await fetch(url, { headers });

        // Server ignored Range header and sent full file — fail fast to prevent OOM
        if (response.status === 200) {
            throw new InferenceModelDownloaderException(
                `Server ignored Range header for bytes=${startByte}-${endByte} on ${url}. ` +
                    `Refusing to read full ${response.headers.get('content-length') ?? 'unknown'} byte body into memory.`,
            );
        }

        // Server returned partial content (supports Range header)
        if (response.status === 206) {
            return await response.bytes();
        }

        throw new InferenceModelDownloaderException(
            `Unexpected HTTP ${response.status}: ${response.statusText} for range bytes=${startByte}-${endByte}`,
        );
    }

    /**
     * Fetch an entire file using a standard GET request.
     * @param url - The URL to fetch from
     * @returns Uint8Array containing the full file content
     * @throws {InferenceModelDownloaderException} If response is not OK
     */
    public async fetch(url: string): Promise<Uint8Array> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new InferenceModelDownloaderException(
                `HTTP ${response.status}: ${response.statusText} while fetching ${url}`,
            );
        }

        return await response.bytes();
    }
}