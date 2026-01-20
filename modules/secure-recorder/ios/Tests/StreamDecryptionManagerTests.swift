import XCTest
import CryptoKit
@testable import SecureRecorder

/**
 * Tests for StreamDecryptionManager
 * 
 * ISOMORPHIC: These tests mirror the Android StreamDecryptionManagerTest
 * to ensure identical behavior across platforms.
 */
class StreamDecryptionManagerTests: XCTestCase {
  
  var tempDir: URL!
  var testKey: Data!
  
  override func setUp() {
    super.setUp()
    
    // Create temp directory
    tempDir = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    
    // Generate test key (256-bit for AES-256)
    testKey = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
  }
  
  override func tearDown() {
    // Clean up temp directory
    try? FileManager.default.removeItem(at: tempDir)
    super.tearDown()
  }
  
  // MARK: - Test: Decrypt Single Chunk
  
  func testDecryptSingleChunk() throws {
    // Arrange: Create encrypted file with single chunk
    let testData = "Hello, World!".data(using: .utf8)!
    let encryptedFile = tempDir.appendingPathComponent("single_chunk.dat")
    
    let key = SymmetricKey(data: testKey)
    let sealedBox = try AES.GCM.seal(testData, using: key)
    
    // Write: [4-byte size][nonce+ciphertext+tag]
    var fileData = Data()
    let chunkSize = Int32(sealedBox.combined.count)
    var bigEndianSize = chunkSize.bigEndian
    fileData.append(Data(bytes: &bigEndianSize, count: 4))
    fileData.append(sealedBox.combined)
    try fileData.write(to: encryptedFile)
    
    // Act: Decrypt
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    var decryptedChunks: [Data] = []
    
    try manager.stream { data, index, isLast in
      decryptedChunks.append(data)
      XCTAssertEqual(index, 0, "Single chunk should have index 0")
      XCTAssertTrue(isLast, "Single chunk should be marked as last")
    }
    
    // Assert
    XCTAssertEqual(decryptedChunks.count, 1, "Should have exactly 1 chunk")
    XCTAssertEqual(decryptedChunks[0], testData, "Decrypted data should match original")
  }
  
  // MARK: - Test: Decrypt Multiple Chunks
  
  func testDecryptMultipleChunks() throws {
    // Arrange: Create encrypted file with 3 chunks
    let chunks = ["Chunk 1", "Chunk 2", "Chunk 3"]
    let encryptedFile = tempDir.appendingPathComponent("multiple_chunks.dat")
    
    let key = SymmetricKey(data: testKey)
    var fileData = Data()
    
    for chunk in chunks {
      let chunkData = chunk.data(using: .utf8)!
      let sealedBox = try AES.GCM.seal(chunkData, using: key)
      
      // Write: [4-byte size][nonce+ciphertext+tag]
      let chunkSize = Int32(sealedBox.combined.count)
      var bigEndianSize = chunkSize.bigEndian
      fileData.append(Data(bytes: &bigEndianSize, count: 4))
      fileData.append(sealedBox.combined)
    }
    try fileData.write(to: encryptedFile)
    
    // Act: Decrypt
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    var decryptedChunks: [(data: String, index: Int, isLast: Bool)] = []
    
    try manager.stream { data, index, isLast in
      let string = String(data: data, encoding: .utf8)!
      decryptedChunks.append((string, index, isLast))
    }
    
    // Assert
    XCTAssertEqual(decryptedChunks.count, 3, "Should have 3 chunks")
    XCTAssertEqual(decryptedChunks[0].data, "Chunk 1")
    XCTAssertEqual(decryptedChunks[0].index, 0)
    XCTAssertFalse(decryptedChunks[0].isLast, "First chunk should not be last")
    
    XCTAssertEqual(decryptedChunks[1].data, "Chunk 2")
    XCTAssertEqual(decryptedChunks[1].index, 1)
    XCTAssertFalse(decryptedChunks[1].isLast, "Second chunk should not be last")
    
    XCTAssertEqual(decryptedChunks[2].data, "Chunk 3")
    XCTAssertEqual(decryptedChunks[2].index, 2)
    XCTAssertTrue(decryptedChunks[2].isLast, "Third chunk should be last")
  }
  
  // MARK: - Test: Stream All Chunks
  
  func testStreamAllChunks() throws {
    // Arrange
    let chunks = ["Test 1", "Test 2", "Test 3"]
    let encryptedFile = tempDir.appendingPathComponent("stream_all.dat")
    
    let key = SymmetricKey(data: testKey)
    var fileData = Data()
    
    for chunk in chunks {
      let chunkData = chunk.data(using: .utf8)!
      let sealedBox = try AES.GCM.seal(chunkData, using: key)
      
      let chunkSize = Int32(sealedBox.combined.count)
      var bigEndianSize = chunkSize.bigEndian
      fileData.append(Data(bytes: &bigEndianSize, count: 4))
      fileData.append(sealedBox.combined)
    }
    try fileData.write(to: encryptedFile)
    
    // Act
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    var decryptedChunks: [(data: String, index: Int, isLast: Bool)] = []
    
    try manager.stream { data, index, isLast in
      let string = String(data: data, encoding: .utf8)!
      decryptedChunks.append((string, index, isLast))
    }
    
    // Assert
    XCTAssertEqual(decryptedChunks.count, 3)
    XCTAssertEqual(decryptedChunks[0].data, "Test 1")
    XCTAssertEqual(decryptedChunks[0].index, 0)
    XCTAssertFalse(decryptedChunks[0].isLast)
    
    XCTAssertEqual(decryptedChunks[1].data, "Test 2")
    XCTAssertEqual(decryptedChunks[1].index, 1)
    XCTAssertFalse(decryptedChunks[1].isLast)
    
    XCTAssertEqual(decryptedChunks[2].data, "Test 3")
    XCTAssertEqual(decryptedChunks[2].index, 2)
    XCTAssertTrue(decryptedChunks[2].isLast)
  }
  
  // MARK: - Test: Corrupted File (Missing Chunk Size)
  
  func testCorruptedFileMissingChunkSize() throws {
    // Arrange: Create file with incomplete chunk size header
    let encryptedFile = tempDir.appendingPathComponent("corrupted_size.dat")
    let incompleteData = Data([0x00, 0x00]) // Only 2 bytes instead of 4
    try incompleteData.write(to: encryptedFile)
    
    // Act & Assert
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    
    XCTAssertThrowsError(try manager.stream { _, _, _ in }) { error in
      XCTAssertTrue(error is SecureRecorderError, "Should throw SecureRecorderError")
    }
  }
  
  // MARK: - Test: Corrupted File (Missing Chunk Data)
  
  func testCorruptedFileMissingChunkData() throws {
    // Arrange: Write chunk size but not the data
    let encryptedFile = tempDir.appendingPathComponent("corrupted_data.dat")
    var fileData = Data()
    
    // Write chunk size claiming 100 bytes, but provide no data
    var chunkSize: Int32 = 100
    chunkSize = chunkSize.bigEndian
    fileData.append(Data(bytes: &chunkSize, count: 4))
    try fileData.write(to: encryptedFile)
    
    // Act & Assert
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    
    XCTAssertThrowsError(try manager.stream { _, _, _ in }) { error in
      XCTAssertTrue(error is SecureRecorderError, "Should throw SecureRecorderError")
    }
  }
  
  // MARK: - Test: Invalid Chunk Size (Too Small)
  
  func testInvalidChunkSizeTooSmall() throws {
    // Arrange: Chunk size smaller than nonce + tag
    let encryptedFile = tempDir.appendingPathComponent("invalid_size.dat")
    var fileData = Data()
    
    // Write chunk size of 10 (less than 12-byte nonce + 16-byte tag = 28 bytes minimum)
    var chunkSize: Int32 = 10
    chunkSize = chunkSize.bigEndian
    fileData.append(Data(bytes: &chunkSize, count: 4))
    fileData.append(Data(repeating: 0, count: 10)) // Add 10 bytes of dummy data
    try fileData.write(to: encryptedFile)
    
    // Act & Assert
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    
    XCTAssertThrowsError(try manager.stream { _, _, _ in }) { error in
      XCTAssertTrue(error is SecureRecorderError, "Should throw SecureRecorderError")
    }
  }
  
  // MARK: - Test: Wrong Decryption Key
  
  func testWrongDecryptionKey() throws {
    // Arrange: Encrypt with one key, decrypt with another
    let testData = "Secret message".data(using: .utf8)!
    let encryptedFile = tempDir.appendingPathComponent("wrong_key.dat")
    
    // Encrypt with original key
    let encryptKey = SymmetricKey(data: testKey)
    let sealedBox = try AES.GCM.seal(testData, using: encryptKey)
    
    var fileData = Data()
    let chunkSize = Int32(sealedBox.combined.count)
    var bigEndianSize = chunkSize.bigEndian
    fileData.append(Data(bytes: &bigEndianSize, count: 4))
    fileData.append(sealedBox.combined)
    try fileData.write(to: encryptedFile)
    
    // Try to decrypt with different key
    let wrongKey = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
    let manager = StreamDecryptionManager(secretKey: wrongKey, encryptedFile: encryptedFile)
    
    // Act & Assert
    XCTAssertThrowsError(try manager.stream { _, _, _ in }) { error in
      // CryptoKit will throw an error when authentication fails
      XCTAssertTrue(error is CryptoKitError || error is SecureRecorderError)
    }
  }
}
