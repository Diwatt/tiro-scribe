import XCTest
import Foundation
import CryptoKit

/**
 * Unit tests for EncryptionStream (iOS/iPadOS)
 * Tests chunked AES-256-GCM encryption strategy
 */
@available(iOS 13.0, *)
class EncryptionStreamTests: XCTestCase {
  var secretKey: Data!
  var outputFile: URL!
  var encryptionStream: EncryptionStream!
  
  override func setUp() {
    super.setUp()
    
    // Generate test key (256-bit / 32 bytes)
    var key = Data(count: 32)
    _ = key.withUnsafeMutableBytes { bytes in
      SecRandomCopyBytes(kSecRandomDefault, 32, bytes.baseAddress!)
    }
    secretKey = key
    
    // Create temporary output file
    let tempDir = FileManager.default.temporaryDirectory
    outputFile = tempDir.appendingPathComponent(UUID().uuidString + ".dat")
    
    encryptionStream = EncryptionStream(secretKey: secretKey, outputFile: outputFile)
  }
  
  override func tearDown() {
    encryptionStream?.close()
    encryptionStream = nil
    
    try? FileManager.default.removeItem(at: outputFile)
    
    super.tearDown()
  }
  
  // MARK: - initialize() tests
  
  func testInitializeCreatesOutputFile() throws {
    XCTAssertFalse(FileManager.default.fileExists(atPath: outputFile.path), 
                   "File should not exist initially")
    
    try? FileManager.default.removeItem(at: outputFile)
    encryptionStream = EncryptionStream(secretKey: secretKey, outputFile: outputFile)
    try encryptionStream.initialize()
    
    XCTAssertTrue(FileManager.default.fileExists(atPath: outputFile.path), 
                  "File should be created after initialization")
  }
  
  // MARK: - write() tests
  
  func testWriteEncryptsDataCorrectly() throws {
    let plaintext = "Hello, World!".data(using: .utf8)!
    
    try encryptionStream.initialize()
    try encryptionStream.write(data: plaintext)
    encryptionStream.close()
    
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Each sealed box contains: nonce (12) + ciphertext (size matches plaintext) + tag (16)
    let expectedSize = 12 + plaintext.count + 16
    XCTAssertEqual(expectedSize, fileBytes.count, 
                   "File should contain one sealed box: nonce + ciphertext + tag")
    
    // Verify data is actually encrypted (not plaintext)
    XCTAssertFalse(fileBytes.contains(plaintext), 
                   "File should not contain plaintext")
  }
  
  func testWriteThrowsWhenNotInitialized() {
    let plaintext = "test".data(using: .utf8)!
    
    XCTAssertThrowsError(try encryptionStream.write(data: plaintext)) { error in
      if let recorderError = error as? SecureRecorderError,
         case .recordingFailed(let message) = recorderError {
        XCTAssertEqual("Encryption stream not initialized", message)
      } else {
        XCTFail("Expected SecureRecorderError.recordingFailed")
      }
    }
  }
  
  // MARK: - Integration tests
  
  func testEncryptedDataCanBeDecryptedSuccessfully() throws {
    let plaintext = "This is a secret message!".data(using: .utf8)!
    
    // Encrypt
    try encryptionStream.initialize()
    try encryptionStream.write(data: plaintext)
    encryptionStream.close()
    
    // Read encrypted file (should be a single sealed box)
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Decrypt using CryptoKit
    let symmetricKey = SymmetricKey(data: secretKey)
    let sealedBox = try AES.GCM.SealedBox(combined: fileBytes)
    let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
    
    XCTAssertEqual(plaintext, decrypted, "Decrypted data should match original plaintext")
  }
  
  func testMultipleWritesCreateMultipleSealedBoxes() throws {
    let chunk1 = "First chunk".data(using: .utf8)!
    let chunk2 = "Second chunk".data(using: .utf8)!
    let chunk3 = "Third chunk".data(using: .utf8)!
    
    try encryptionStream.initialize()
    try encryptionStream.write(data: chunk1)
    try encryptionStream.write(data: chunk2)
    try encryptionStream.write(data: chunk3)
    encryptionStream.close()
    
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Each chunk creates its own sealed box: 12 (nonce) + data + 16 (tag)
    let expectedSize = (12 + chunk1.count + 16) + 
                      (12 + chunk2.count + 16) + 
                      (12 + chunk3.count + 16)
    XCTAssertEqual(expectedSize, fileBytes.count, 
                   "File should contain three sealed boxes")
    
    // Decrypt each sealed box independently
    let symmetricKey = SymmetricKey(data: secretKey)
    var offset = 0
    var decryptedChunks: [Data] = []
    
    // Decrypt chunk 1
    let box1Size = 12 + chunk1.count + 16
    let box1Data = fileBytes[offset..<offset + box1Size]
    let box1 = try AES.GCM.SealedBox(combined: box1Data)
    decryptedChunks.append(try AES.GCM.open(box1, using: symmetricKey))
    offset += box1Size
    
    // Decrypt chunk 2
    let box2Size = 12 + chunk2.count + 16
    let box2Data = fileBytes[offset..<offset + box2Size]
    let box2 = try AES.GCM.SealedBox(combined: box2Data)
    decryptedChunks.append(try AES.GCM.open(box2, using: symmetricKey))
    offset += box2Size
    
    // Decrypt chunk 3
    let box3Size = 12 + chunk3.count + 16
    let box3Data = fileBytes[offset..<offset + box3Size]
    let box3 = try AES.GCM.SealedBox(combined: box3Data)
    decryptedChunks.append(try AES.GCM.open(box3, using: symmetricKey))
    
    // Verify each chunk
    XCTAssertEqual(chunk1, decryptedChunks[0])
    XCTAssertEqual(chunk2, decryptedChunks[1])
    XCTAssertEqual(chunk3, decryptedChunks[2])
  }
  
  func testCloseCanBeCalledMultipleTimesSafely() throws {
    try encryptionStream.initialize()
    try encryptionStream.write(data: "test".data(using: .utf8)!)
    
    // Should not throw
    encryptionStream.close()
    encryptionStream.close()
    encryptionStream.close()
  }
  
  func testEachChunkHasUniqueNonce() throws {
    let chunk1 = "Chunk 1".data(using: .utf8)!
    let chunk2 = "Chunk 2".data(using: .utf8)!
    
    try encryptionStream.initialize()
    try encryptionStream.write(data: chunk1)
    try encryptionStream.write(data: chunk2)
    encryptionStream.close()
    
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Extract nonces from each sealed box
    let nonce1 = fileBytes[0..<12]
    let box1Size = 12 + chunk1.count + 16
    let nonce2 = fileBytes[box1Size..<box1Size + 12]
    
    XCTAssertNotEqual(nonce1, nonce2, "Each chunk should have a unique nonce")
  }
}
