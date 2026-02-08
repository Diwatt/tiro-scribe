/**
 * Event payload for decrypted audio chunks.
 *
 * ISOMORPHIC: Native modules (iOS/Android) emit events with binary data that
 * Expo SDK 54 automatically converts to Uint8Array.
 */
export interface DecryptedChunkEvent {
    data: Uint8Array;
    index: number;
    isLast: boolean;
}
