import Foundation
import CryptoKit

/**
 * Manages streaming decryption of encrypted audio files for iOS/iPadOS
 * 
 * Decrypts encrypted audio files using true streaming (FileHandle), emitting events
 * for each decrypted chunk without accumulating data in memory.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses CryptoKit (AES.GCM.open) for decryption
 * - Uses FileHandle for true streaming (reads chunks incrementally from disk)
 * - Int32(bigEndian) for chunk size parsing
 * - Uses SealedBox(combined:) to parse nonce + ciphertext + tag
 * 
 * MEMORY SAFETY: Zero accumulation, minimal RAM usage
 * - Each chunk: Read → Decrypt → Emit → Discard
 * - No temporary files
 * - Constant memory usage regardless of file size
 * - Only one chunk in memory at a time
 */
class StreamDecryptionManager {
  // Private properties
  private let secretKey: SymmetricKey
  private let encryptedFile: URL
  
  private static let chunkSizeLength = 4 // 4 bytes for Int32
  private static let gcmNonceLength = 12 // 12 bytes
  private static let gcmTagLength = 16 // 16 bytes
  
  // Initializer
  internal init(secretKey: Data, encryptedFile: URL) {
    self.secretKey = SymmetricKey(data: secretKey)
    self.encryptedFile = encryptedFile
  }
  
  // Internal methods
  /**
   * Stream decrypt file chunk by chunk, emitting events for each decrypted chunk
   * 
   * Processes encrypted file sequentially using FileHandle for true streaming.
   * Decrypts each chunk and immediately emits an event, then discards the data.
   * 
   * @param onChunk Event emitter callback: (Data, Int, Bool) -> Void
   * @throws SecureRecorderError if decryption fails or file is corrupted
   */
  internal func stream(onChunk: (Data, Int, Bool) throws -> Void) throws {
    // Open file handle for streaming read
    let fileHandle = try FileHandle(forReadingFrom: encryptedFile)
    defer {
      fileHandle.closeFile()
    }
    
    // Get file size for last chunk detection
    let fileSize = try FileManager.default.attributesOfItem(atPath: encryptedFile.path)[.size] as? Int64 ?? 0
    
    var chunkIndex = 0
    
    while true {
      // Read chunk size (4 bytes, big-endian)
      let chunkSizeData = fileHandle.readData(ofLength: Self.chunkSizeLength)
      
      // Check if we've reached end of file
      if chunkSizeData.count == 0 {
        // End of file reached naturally
        break
      }
      
      // If we read less than expected, file is corrupted
      if chunkSizeData.count < Self.chunkSizeLength {
        throw SecureRecorderError.stopFailed("Corrupted file: incomplete chunk size header")
      }
      
      let chunkSize = Int32(bigEndian: chunkSizeData.withUnsafeBytes { $0.load(as: Int32.self) })
      
      // Validate chunk size
      guard chunkSize >= Self.gcmNonceLength + Self.gcmTagLength else {
        throw SecureRecorderError.stopFailed("Invalid chunk size: \(chunkSize)")
      }
      
      // Read sealed box data (nonce + ciphertext + tag)
      let sealedBoxData = fileHandle.readData(ofLength: Int(chunkSize))
      
      guard sealedBoxData.count == Int(chunkSize) else {
        throw SecureRecorderError.stopFailed("Corrupted file: incomplete chunk")
      }
      
      // SECURITY: Decrypt chunk with AES-256-GCM
      let sealedBox = try AES.GCM.SealedBox(combined: sealedBoxData)
      let decryptedChunk = try AES.GCM.open(sealedBox, using: secretKey)
      
      // Check if this is the last chunk
      let currentOffset = Int64(fileHandle.offsetInFile)
      let isLast = currentOffset >= fileSize
      
      // Emit event immediately, then discard data
      try onChunk(decryptedChunk, chunkIndex, isLast)
      
      chunkIndex += 1
    }
  }
}
