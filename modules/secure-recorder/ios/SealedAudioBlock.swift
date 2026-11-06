/**
 * Wire format of an encrypted audio file, shared by the writer
 * (EncryptionStream) and the reader (StreamDecryptionManager).
 *
 * A sealed block is stored as:
 * [4-byte size][12-byte nonce][encrypted data + 16-byte GCM tag]
 * where size covers nonce + data + tag, written big-endian.
 */
class SealedAudioBlock {
  internal static let sizeHeaderLength = 4
  internal static let nonceLength = 12
  internal static let tagLength = 16
  internal static let minimumSize = nonceLength + tagLength
}
