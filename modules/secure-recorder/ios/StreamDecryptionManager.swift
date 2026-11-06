import Foundation
import CryptoKit

/**
 * Decrypts encrypted audio files block by block with a pull cursor.
 *
 * readNext() decrypts and returns the next block, or nil once the file is
 * exhausted. The block marked isLast is the last one carrying data; after it
 * the reader is exhausted and closed. close() releases the open file handle
 * early when the consumer abandons the stream.
 *
 * Block format (written by EncryptionStream):
 * [4-byte size][12-byte IV][data + 16-byte tag]
 *
 * MEMORY SAFETY: Zero accumulation, minimal RAM usage
 * - Each call: Read → Decrypt → Return
 * - Constant memory usage regardless of file size
 */
class StreamDecryptionManager {
  private let secretKey: SymmetricKey
  private let encryptedFile: URL
  private var fileHandle: FileHandle?
  private var bytesReadTotal: Int64 = 0
  private var isExhausted = false

  internal init(secretKey: Data, encryptedFile: URL) {
    self.secretKey = SymmetricKey(data: secretKey)
    self.encryptedFile = encryptedFile
  }

  /**
   * Decrypts and returns the next block, or nil when the file is exhausted.
   *
   * @throws SecureRecorderError if the file is corrupted
   * @throws CryptoKitError if decryption fails
   */
  internal func readNext() throws -> DecryptedChunk? {
    if isExhausted {
      return nil
    }

    guard let sealedBoxData = try readNextBlock() else {
      markExhausted()

      return nil
    }

    let decryptedData = try decrypt(sealedBoxData)

    let fileSize = try FileManager.default.attributesOfItem(atPath: encryptedFile.path)[.size] as? Int64 ?? 0
    let isLast = bytesReadTotal >= fileSize
    if isLast {
      markExhausted()
    }

    return DecryptedChunk(data: decryptedData, isLast: isLast)
  }

  /**
   * Releases the open file handle early. Any further readNext() call returns
   * nil, mirroring an exhausted stream.
   */
  internal func close() {
    markExhausted()
  }

  /**
   * Releases the open file handle early. Any further readNext() call returns
   * nil, mirroring an exhausted stream.
   */
  private func readNextBlock() throws -> Data? {
    let handle = try ensureOpenHandle()

    guard let chunkSize = try readChunkSize(handle) else {
      return nil
    }

    let sealedBoxData = handle.readData(ofLength: chunkSize)
    guard sealedBoxData.count == chunkSize else {
      throw SecureRecorderError.stopFailed("Corrupted file: incomplete chunk")
    }
    bytesReadTotal += Int64(chunkSize)

    return sealedBoxData
  }

  /**
   * Reads and validates the 4-byte big-endian block size header.
   * Returns nil at end of file.
   */
  private func readChunkSize(_ handle: FileHandle) throws -> Int? {
    let sizeHeader = handle.readData(ofLength: SealedAudioBlock.sizeHeaderLength)
    if sizeHeader.count == 0 {
      return nil
    }
    if sizeHeader.count < SealedAudioBlock.sizeHeaderLength {
      throw SecureRecorderError.stopFailed("Corrupted file: incomplete chunk size header")
    }
    bytesReadTotal += Int64(sizeHeader.count)

    let chunkSize = Int32(bigEndian: sizeHeader.withUnsafeBytes { $0.load(as: Int32.self) })
    guard chunkSize >= SealedAudioBlock.minimumSize else {
      throw SecureRecorderError.stopFailed("Invalid chunk size: \(chunkSize)")
    }

    return Int(chunkSize)
  }

  /**
   * Decrypts a sealed block: [12-byte nonce][data + 16-byte GCM tag].
   */
  private func decrypt(_ sealedBoxData: Data) throws -> Data {
    // SECURITY: Decrypt block with AES-256-GCM
    let sealedBox = try AES.GCM.SealedBox(combined: sealedBoxData)

    return try AES.GCM.open(sealedBox, using: secretKey)
  }

  private func ensureOpenHandle() throws -> FileHandle {
    if let handle = fileHandle {
      return handle
    }

    let handle = try FileHandle(forReadingFrom: encryptedFile)
    fileHandle = handle

    return handle
  }

  private func markExhausted() {
    isExhausted = true
    fileHandle?.closeFile()
    fileHandle = nil
  }
}
