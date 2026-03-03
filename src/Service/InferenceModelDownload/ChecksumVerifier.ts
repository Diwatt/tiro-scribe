/**
 * ChecksumVerifier – Validates file checksums.
 * Single Responsibility: Verify SHA256 checksums of downloaded files.
 */

import type { File } from 'expo-file-system';
import { createHash } from 'react-native-quick-crypto';
import { InferenceModelDownloaderException } from '@/Exception';

export class ChecksumVerifier {
    /**
     * Verify SHA256 checksum of a file.
     * @param file The file to verify
     * @param expectedHash Expected SHA256 hash in hex format
     * @throws InferenceModelDownloaderException if checksum is invalid or format is wrong
     */
    public async verify(file: File, expectedHash: string): Promise<void> {
        const expectedHex = expectedHash.toLowerCase();

        // Read file and compute hash
        const base64 = await file.base64();
        const buffer = Buffer.from(base64, 'base64');
        const digest = createHash('sha256').update(buffer).digest('hex');

        // Handle different return types (string or Uint8Array)
        const digestHex = typeof digest === 'string' ? digest : Buffer.from(digest as Uint8Array).toString('hex');

        // Compare hashes
        if (digestHex !== expectedHex) {
            throw new InferenceModelDownloaderException(
                `Hash mismatch for ${file.uri}: expected ${expectedHex.slice(0, 16)}..., got ${digestHex.slice(0, 16)}...`,
            );
        }
    }
}
