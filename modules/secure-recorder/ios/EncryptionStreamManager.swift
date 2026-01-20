import Foundation

// C functions from SecureRecorderCrypto.m
@_silgen_name("createGCMEncryptor")
func createGCMEncryptor(key: UnsafeRawPointer, keyLength: Int, iv: UnsafeRawPointer, ivLength: Int) -> OpaquePointer?

@_silgen_name("updateGCMEncryptor")
func updateGCMEncryptor(cryptor: OpaquePointer, dataIn: UnsafeRawPointer, dataInLength: Int, dataOut: UnsafeMutableRawPointer, dataOutAvailable: Int, dataOutMoved: UnsafeMutablePointer<Int>) -> Int32

@_silgen_name("finalizeGCMEncryptor")
func finalizeGCMEncryptor(cryptor: OpaquePointer, dataOut: UnsafeMutableRawPointer, dataOutAvailable: Int, dataOutMoved: UnsafeMutablePointer<Int>) -> Int32

@_silgen_name("releaseGCMEncryptor")
func releaseGCMEncryptor(cryptor: OpaquePointer)

let kCCSuccess: Int32 = 0

/**
 * Manages encryption stream for secure audio recording
 */
class EncryptionStreamManager {
  private let secretKey: Data
  private let outputFile: URL
  private var fileHandle: FileHandle?
  private var cryptor: OpaquePointer?
  
  init(secretKey: Data, outputFile: URL) {
    self.secretKey = secretKey
    self.outputFile = outputFile
  }
  
  /**
   * Initialize encryption stream and return the IV (nonce)
   */
  func initialize() throws -> Data {
    // Create file if it doesn't exist
    if !FileManager.default.fileExists(atPath: outputFile.path) {
      FileManager.default.createFile(atPath: outputFile.path, contents: nil, attributes: nil)
    }
    
    fileHandle = try FileHandle(forWritingTo: outputFile)
    
    // Generate random nonce (12 bytes for GCM)
    var nonce = Data(count: 12)
    let result = nonce.withUnsafeMutableBytes { bytes in
      SecRandomCopyBytes(kSecRandomDefault, 12, bytes.baseAddress!)
    }
    
    guard result == errSecSuccess else {
      throw SecureRecorderError.recordingFailed("Failed to generate nonce")
    }
    
    // Write nonce at the beginning of the file
    fileHandle?.write(nonce)
    
    // Initialize AES-GCM streaming encryption using CommonCrypto
    let cryptorRef = secretKey.withUnsafeBytes { keyBytes in
      nonce.withUnsafeBytes { nonceBytes in
        createGCMEncryptor(
          key: keyBytes.baseAddress!,
          keyLength: keyBytes.count,
          iv: nonceBytes.baseAddress!,
          ivLength: nonceBytes.count
        )
      }
    }
    
    guard let cryptor = cryptorRef else {
      throw SecureRecorderError.recordingFailed("Failed to initialize encryption")
    }
    
    self.cryptor = cryptor
    return nonce
  }
  
  /**
   * Write encrypted data to stream
   */
  func write(data: Data) throws {
    guard let fileHandle = fileHandle,
          let cryptor = cryptor else {
      throw SecureRecorderError.recordingFailed("Encryption stream not initialized")
    }
    
    var encryptedData = Data(count: data.count)
    var dataOutMoved: Int = 0
    
    let status = data.withUnsafeBytes { plaintextBytes in
      encryptedData.withUnsafeMutableBytes { ciphertextBytes in
        updateGCMEncryptor(
          cryptor: cryptor,
          dataIn: plaintextBytes.baseAddress!,
          dataInLength: plaintextBytes.count,
          dataOut: ciphertextBytes.baseAddress!,
          dataOutAvailable: ciphertextBytes.count,
          dataOutMoved: &dataOutMoved
        )
      }
    }
    
    guard status == kCCSuccess else {
      throw SecureRecorderError.recordingFailed("Encryption error: \(status)")
    }
    
    // Resize to actual encrypted data size
    encryptedData.count = dataOutMoved
    
    // Write encrypted data to file
    fileHandle.write(encryptedData)
  }
  
  /**
   * Finalize encryption and write authentication tag
   */
  func finalize() throws {
    guard let fileHandle = fileHandle,
          let cryptor = cryptor else {
      throw SecureRecorderError.stopFailed("Encryption stream not initialized")
    }
    
    var tag = Data(count: 16) // GCM tag is 16 bytes
    var tagLength: Int = 0
    
    let status = tag.withUnsafeMutableBytes { tagBytes in
      finalizeGCMEncryptor(
        cryptor: cryptor,
        dataOut: tagBytes.baseAddress!,
        dataOutAvailable: tagBytes.count,
        dataOutMoved: &tagLength
      )
    }
    
    guard status == kCCSuccess else {
      throw SecureRecorderError.stopFailed("Failed to finalize encryption: \(status)")
    }
    
    // Write authentication tag at the end
    tag.count = tagLength
    fileHandle.write(tag)
    
    // Release cryptor
    releaseGCMEncryptor(cryptor: cryptor)
    self.cryptor = nil
  }
  
  /**
   * Close encryption stream
   */
  func close() {
    if let cryptor = cryptor {
      releaseGCMEncryptor(cryptor: cryptor)
      self.cryptor = nil
    }
    
    fileHandle?.closeFile()
    fileHandle = nil
  }
}
