package expo.modules.securerecorder

/**
 * Wire format of an encrypted audio file, shared by the writer
 * (EncryptionStream) and the reader (StreamDecryptionManager).
 *
 * A sealed block is stored as:
 * [4-byte size][12-byte nonce][encrypted data + 16-byte GCM tag]
 * where size covers nonce + data + tag, written big-endian.
 */
class SealedAudioBlock {
  companion object {
    public const val SIZE_HEADER_LENGTH: Int = 4
    public const val NONCE_LENGTH: Int = 12
    public const val TAG_LENGTH: Int = 16
    public const val MINIMUM_SIZE: Int = NONCE_LENGTH + TAG_LENGTH
  }
}
