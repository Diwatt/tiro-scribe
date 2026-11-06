import Foundation

/**
 * One decrypted block handed to a pull-based consumer.
 *
 * isLast marks the final block carrying data; once it has been read the
 * reader is exhausted and readNext() returns nil.
 */
struct DecryptedChunk {
  let data: Data
  let isLast: Bool
}
