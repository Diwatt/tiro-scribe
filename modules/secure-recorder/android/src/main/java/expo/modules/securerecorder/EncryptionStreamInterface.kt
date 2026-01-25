package expo.modules.securerecorder

/**
 * Interface for encryption stream operations (for testability)
 * 
 * Allows mocking EncryptionStream in tests without requiring real file I/O
 */
interface EncryptionStreamInterface {
  fun initialize()
  fun write(data: ByteArray)
  fun close()
}
