/**
 * ChecksumVerifier – Validates file checksums.
 * Single Responsibility: Verify SHA256 checksums of downloaded files.
 */

import type { File } from 'expo-file-system';
import { createHash } from 'react-native-quick-crypto';
import { InferenceModelDownloaderException } from '@/Exception';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks to avoid OOM on Android/Hermes

export class ChecksumVerifier {
    /**
     * Verify SHA256 checksum of a file using chunked FileHandle reads.
     * Reads in strict 64KB chunks to prevent Hermes from running out of memory
     * on large files (where `readableStream()` would buffer the entire file).
     * @param file The file to verify
     * @param expectedHash Expected SHA256 hash in hex format
     * @throws InferenceModelDownloaderException if checksum is invalid or read fails
     */
    public async verify(file: File, expectedHash: string): Promise<void> {
        const hash = createHash('sha256');
        const expectedHex = expectedHash.toLowerCase();

        let totalBytes = 0;

        try {
            const handle = file.open();
            try {
                let bytes = handle.readBytes(CHUNK_SIZE);
                while (bytes.length > 0) {
                    hash.update(bytes);
                    totalBytes += bytes.length;
                    bytes = handle.readBytes(CHUNK_SIZE);
                }
            } finally {
                handle.close();
            }
        } catch (originalError) {
            throw new InferenceModelDownloaderException(
                `Failed to read file ${file.uri} during checksum verification`,
                originalError as Error,
            );
        }

        const digestHex = hash.digest('hex') as string;

        if (digestHex !== expectedHex) {
            throw new InferenceModelDownloaderException(
                `Hash mismatch for ${file.uri}: expected ${expectedHex}, got ${digestHex}. File size: ${totalBytes} bytes.`,
            );
        }
    }
}
