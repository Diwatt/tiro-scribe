/**
 * ChecksumVerifier – Validates file checksums.
 * Single Responsibility: Verify SHA256 checksums of downloaded files.
 */

import type { File } from 'expo-file-system';
import { createHash } from 'react-native-quick-crypto';
import { InferenceModelDownloaderException } from '@/Exception';

export class ChecksumVerifier {
    /**
     * Verify SHA256 checksum of a file using a Web Streams async reading approach.
     * @param file The file to verify
     * @param expectedHash Expected SHA256 hash in hex format
     * @throws InferenceModelDownloaderException if checksum is invalid or read fails
     */
    public async verify(file: File, expectedHash: string): Promise<void> {
        const hash = createHash('sha256');
        const expectedHex = expectedHash.toLowerCase();
        const stream = file.readableStream();
        const reader = stream.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (value != null) {
                    hash.update(value);
                }
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
                `Hash mismatch for ${file.uri}: expected ${expectedHex}, got ${digestHex}`,
            );
        }
    }
}