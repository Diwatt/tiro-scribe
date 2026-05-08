import XCTest
import Foundation
import CryptoKit

/**
 * Unit tests for EncryptionStream (iOS/iPadOS)
 * Tests buffered AES-256-GCM encryption strategy
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
    
    // Each flushed buffer contains: 4-byte size + nonce (12) + ciphertext (size matches plaintext) + tag (16)
    let expectedSize = 4 + 12 + plaintext.count + 16
    XCTAssertEqual(expectedSize, fileBytes.count, 
                   "File should contain one sealed box: size + nonce + ciphertext + tag")
    
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
    
    // Read encrypted file (should be a single sealed box for this test)
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Extract chunk size (first 4 bytes, big-endian Int32)
    let sizeData = fileBytes[0..<4]
    let chunkSize = sizeData.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }

    // The next `chunkSize` bytes are [nonce][ciphertext][tag]
    let sealedData = fileBytes[4..<4 + Int(chunkSize)]

    // Decrypt using CryptoKit
    let symmetricKey = SymmetricKey(data: secretKey)
    let sealedBox = try AES.GCM.SealedBox(combined: sealedData)
    let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
    
    XCTAssertEqual(plaintext, decrypted, "Decrypted data should match original plaintext")
  }
  
  func testMultipleWritesCreateMultipleSealedBoxes() throws {
    // Use large chunks that individually exceed the encryption threshold (16KB)
    // so that each write flushes independently and creates its own sealed box.
    let chunkSize = 16 * 1024
    let chunk1 = Data(repeating: 1, count: chunkSize)
    let chunk2 = Data(repeating: 2, count: chunkSize)
    let chunk3 = Data(repeating: 3, count: chunkSize)
    
    try encryptionStream.initialize()
    try encryptionStream.write(data: chunk1)
    try encryptionStream.write(data: chunk2)
    try encryptionStream.write(data: chunk3)
    encryptionStream.close()
    
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Each chunk creates its own sealed box: 4 (size) + 12 (nonce) + data + 16 (tag)
    let expectedSize = (4 + 12 + chunk1.count + 16) + 
                      (4 + 12 + chunk2.count + 16) + 
                      (4 + 12 + chunk3.count + 16)
    XCTAssertEqual(expectedSize, fileBytes.count, 
                   "File should contain three sealed boxes")
    
    // Decrypt each sealed box independently
    let symmetricKey = SymmetricKey(data: secretKey)
    var offset = 0
    var decryptedChunks: [Data] = []
    
    // Decrypt chunk 1
    // Read and skip 4-byte size header
    let box1SizeData = fileBytes[offset..<offset + 4]
    let box1Size = box1SizeData.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
    offset += 4

    let box1Data = fileBytes[offset..<offset + Int(box1Size)]
    let box1 = try AES.GCM.SealedBox(combined: box1Data)
    decryptedChunks.append(try AES.GCM.open(box1, using: symmetricKey))
    offset += Int(box1Size)
    
    // Decrypt chunk 2
    let box2SizeData = fileBytes[offset..<offset + 4]
    let box2Size = box2SizeData.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
    offset += 4

    let box2Data = fileBytes[offset..<offset + Int(box2Size)]
    let box2 = try AES.GCM.SealedBox(combined: box2Data)
    decryptedChunks.append(try AES.GCM.open(box2, using: symmetricKey))
    offset += Int(box2Size)
    
    // Decrypt chunk 3
    let box3SizeData = fileBytes[offset..<offset + 4]
    let box3Size = box3SizeData.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
    offset += 4

    let box3Data = fileBytes[offset..<offset + Int(box3Size)]
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
    // Use large chunks that trigger separate flushes so that each sealed box
    // has its own independently generated nonce.
    let chunkSize = 16 * 1024
    let chunk1 = Data(repeating: 1, count: chunkSize)
    let chunk2 = Data(repeating: 2, count: chunkSize)
    
    try encryptionStream.initialize()
    try encryptionStream.write(data: chunk1)
    try encryptionStream.write(data: chunk2)
    encryptionStream.close()
    
    let fileBytes = try Data(contentsOf: outputFile)
    
    // Extract nonces from each sealed box
    // Box 1: first 4 bytes are size, next 12 bytes are nonce
    let nonce1 = fileBytes[4..<16]
    let box1TotalSize = 4 + 12 + chunk1.count + 16

    // Box 2: skip box 1, then 4-byte size header, then 12-byte nonce
    let nonce2 = fileBytes[box1TotalSize + 4..<box1TotalSize + 16]
    
    XCTAssertNotEqual(nonce1, nonce2, "Each flushed chunk should have a unique nonce")
  }

  func testDataIsOnlyWrittenAfterThresholdOrClose() throws {
    let smallChunk = Data(repeating: 7, count: 1024) // 1KB, well below 16KB threshold

    try encryptionStream.initialize()
    try encryptionStream.write(data: smallChunk)

    // Below threshold: no data should have been written yet
    let attributes = try FileManager.default.attributesOfItem(atPath: outputFile.path)
    let fileSize = attributes[.size] as? NSNumber
    XCTAssertEqual(0, fileSize?.intValue ?? -1, "File should still be empty before flushing threshold")

    // After close, buffered data should be flushed
    encryptionStream.close()
    let fileBytes = try Data(contentsOf: outputFile)
    XCTAssertFalse(fileBytes.isEmpty, "File should contain encrypted data after close")
  }
  
  func testFlushWritesBufferedDataToDisk() throws {
    let smallChunk = Data(repeating: 42, count: 1024) // 1KB, well below 16KB threshold

    try encryptionStream.initialize()
    try encryptionStream.write(data: smallChunk)

    // Below threshold: no data should have been written yet
    let attributesBefore = try FileManager.default.attributesOfItem(atPath: outputFile.path)
    let fileSizeBefore = attributesBefore[.size] as? NSNumber
    XCTAssertEqual(0, fileSizeBefore?.intValue ?? -1, "File should still be empty before flush")

    // After flush, buffered data should be written to disk
    try encryptionStream.flush()
    let fileBytes = try Data(contentsOf: outputFile)
    XCTAssertFalse(fileBytes.isEmpty, "File should contain encrypted data after flush")

    // Verify the data can be decrypted
    let symmetricKey = SymmetricKey(data: secretKey)
    let sizeData = fileBytes[0..<4]
    let chunkSize = sizeData.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
    let sealedData = fileBytes[4..<4 + Int(chunkSize)]
    let sealedBox = try AES.GCM.SealedBox(combined: sealedData)
    let decrypted = try AES.GCM.open(sealedBox, using: symmetricKey)
    XCTAssertEqual(smallChunk, decrypted, "Decrypted data should match original")

    // Stream should still be usable after flush
    let secondChunk = Data(repeating: 99, count: 1024)
    try encryptionStream.write(data: secondChunk)
    encryptionStream.close()

    let fileBytesAfterClose = try Data(contentsOf: outputFile)
    XCTAssertGreaterThan(fileBytesAfterClose.count, fileBytes.count, "File should have more data after second write and close")
  }
  
  func testFlushThrowsWhenNotInitialized() {
    XCTAssertThrowsError(try encryptionStream.flush()) { error in
      if let recorderError = error as? SecureRecorderError,
         case .recordingFailed(let message) = recorderError {
        XCTAssertEqual("Encryption stream not initialized", message)
      } else {
        XCTFail("Expected SecureRecorderError.recordingFailed")
      }
    }
  }
  
  func testFlushOnEmptyBufferIsNoOp() throws {
    try encryptionStream.initialize()
    
    // flush on empty buffer should not throw and not write anything
    try encryptionStream.flush()
    
    let attributes = try FileManager.default.attributesOfItem(atPath: outputFile.path)
    let fileSize = attributes[.size] as? NSNumber
    XCTAssertEqual(0, fileSize?.intValue ?? -1, "File should still be empty after flushing empty buffer")
  }
}
