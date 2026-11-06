package expo.modules.securerecorder

/**
 * One decrypted block handed to a pull-based consumer.
 *
 * isLast marks the final block carrying data; once it has been read the
 * reader is exhausted and readNext() returns null.
 */
data class DecryptedChunk(
  val data: ByteArray,
  val isLast: Boolean
)
