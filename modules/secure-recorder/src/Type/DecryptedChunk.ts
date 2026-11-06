/**
 * One decrypted block handed to a pull-based consumer.
 *
 * isLast marks the final block carrying data; once it has been read the
 * native reader is exhausted and readNextChunk() returns an empty block.
 */
export interface DecryptedChunk {
    data: Uint8Array;
    isLast: boolean;
}
