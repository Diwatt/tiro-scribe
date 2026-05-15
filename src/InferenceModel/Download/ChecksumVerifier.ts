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

        let totalBytes = 0;
        try {
            for await (const chunk of stream) {
                hash.update(chunk as Uint8Array);
                totalBytes += (chunk as Uint8Array).length;
            }
        } catch (originalError) {
            throw new InferenceModelDownloaderException(
                `Failed to read file ${file.uri} during checksum verification`,
                originalError as Error,
            );
        }

        const digestHex = hash.digest('hex') as string;

        if (digestHex !== expectedHex) {
            // Provide more context for debugging
            const firstBytes = await this.readFirstBytes(file, 16);
            const isHtml = firstBytes && this.isHtmlContent(firstBytes);
            
            throw new InferenceModelDownloaderException(
                `Hash mismatch for ${file.uri}: expected ${expectedHex}, got ${digestHex}. ` +
                `File size: ${totalBytes} bytes. ` +
                (isHtml ? 'File appears to be HTML (error page), not binary data. ' : '') +
                `First bytes: ${firstBytes ? this.bytesToHex(firstBytes) : 'unknown'}`,
            );
        }
    }

    /**
     * Read first N bytes of a file for content inspection.
     */
    private async readFirstBytes(file: File, byteCount: number): Promise<Uint8Array | null> {
        try {
            const handle = file.open();
            const bytes = handle.readBytes(byteCount);
            handle.close();
            return bytes && bytes.length > 0 ? bytes : null;
        } catch {
            return null;
        }
    }

    /**
     * Check if bytes look like HTML content.
     */
    private isHtmlContent(bytes: Uint8Array): boolean {
        const str = new TextDecoder().decode(bytes.subarray(0, Math.min(16, bytes.length))).toLowerCase();
        return str.startsWith('<!doctype') || str.startsWith('<html');
    }

    /**
     * Convert bytes to hex string for debugging.
     */
    private bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes.subarray(0, Math.min(8, bytes.length)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ');
    }
}