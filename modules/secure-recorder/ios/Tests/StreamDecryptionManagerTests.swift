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
    try writeChunks(encryptedFile, chunks: [testData])

    // Act: Decrypt
    let chunks = try pullAll(StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile))

    // Assert
    XCTAssertEqual(chunks.count, 1, "Should have exactly 1 chunk")
    XCTAssertEqual(chunks[0].data, testData, "Decrypted data should match original")
    XCTAssertTrue(chunks[0].isLast, "Single chunk should be marked as last")
  }

  // MARK: - Test: Decrypt Multiple Chunks

  func testDecryptMultipleChunks() throws {
    // Arrange: Create encrypted file with 3 chunks
    let chunks = ["Chunk 1", "Chunk 2", "Chunk 3"]
    let encryptedFile = tempDir.appendingPathComponent("multiple_chunks.dat")
    try writeChunks(encryptedFile, chunks: chunks.map { $0.data(using: .utf8)! })

    // Act: Decrypt
    let decryptedChunks = try pullAll(StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile))

    // Assert
    XCTAssertEqual(decryptedChunks.count, 3, "Should have 3 chunks")
    XCTAssertEqual(String(data: decryptedChunks[0].data, encoding: .utf8), "Chunk 1")
    XCTAssertFalse(decryptedChunks[0].isLast, "First chunk should not be last")

    XCTAssertEqual(String(data: decryptedChunks[1].data, encoding: .utf8), "Chunk 2")
    XCTAssertFalse(decryptedChunks[1].isLast, "Second chunk should not be last")

    XCTAssertEqual(String(data: decryptedChunks[2].data, encoding: .utf8), "Chunk 3")
    XCTAssertTrue(decryptedChunks[2].isLast, "Third chunk should be last")
  }

  // MARK: - Test: Empty File (Natural EOF)

  func testReadNextOnEmptyFileReturnsNoChunks() throws {
    let encryptedFile = tempDir.appendingPathComponent("empty.dat")
    FileManager.default.createFile(atPath: encryptedFile.path, contents: nil)

    let chunks = try pullAll(StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile))

    XCTAssertEqual(0, chunks.count, "Empty file should reach natural EOF without emitting chunks")
  }

  // MARK: - Test: Corrupted File (Missing Chunk Size)

  func testCorruptedFileMissingChunkSize() throws {
    // Arrange: Create file with incomplete chunk size header
    let encryptedFile = tempDir.appendingPathComponent("corrupted_size.dat")
    let incompleteData = Data([0x00, 0x00]) // Only 2 bytes instead of 4
    try incompleteData.write(to: encryptedFile)

    // Act & Assert
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)

    XCTAssertThrowsError(try manager.readNext()) { error in
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

    XCTAssertThrowsError(try manager.readNext()) { error in
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

    XCTAssertThrowsError(try manager.readNext()) { error in
      XCTAssertTrue(error is SecureRecorderError, "Should throw SecureRecorderError")
    }
  }

  // MARK: - Test: Wrong Decryption Key

  func testWrongDecryptionKey() throws {
    // Arrange: Encrypt with one key, decrypt with another
    let testData = "Secret message".data(using: .utf8)!
    let encryptedFile = tempDir.appendingPathComponent("wrong_key.dat")
    try writeChunks(encryptedFile, chunks: [testData])

    // Try to decrypt with different key
    let wrongKey = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
    let manager = StreamDecryptionManager(secretKey: wrongKey, encryptedFile: encryptedFile)

    // Act & Assert
    XCTAssertThrowsError(try manager.readNext()) { error in
      // CryptoKit will throw an error when authentication fails
      XCTAssertTrue(error is CryptoKitError || error is SecureRecorderError)
    }
  }

  // MARK: - Test: Read Next Returns Single Block Marked Last

  func testReadNextReturnsSingleBlockMarkedLast() throws {
    let testData = "Hello, World!".data(using: .utf8)!
    let encryptedFile = tempDir.appendingPathComponent("pull_single.dat")
    try writeChunks(encryptedFile, chunks: [testData])

    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    let first = try manager.readNext()
    let second = try manager.readNext()

    XCTAssertNotNil(first)
    XCTAssertEqual(first?.data, testData)
    XCTAssertTrue(first?.isLast ?? false)
    XCTAssertNil(second)
  }

  // MARK: - Test: Read Next Returns Blocks In Order Until Exhausted

  func testReadNextReturnsBlocksInOrderUntilExhausted() throws {
    let chunks = ["Chunk 1", "Chunk 2", "Chunk 3"]
    let encryptedFile = tempDir.appendingPathComponent("pull_multiple.dat")
    try writeChunks(encryptedFile, chunks: chunks.map { $0.data(using: .utf8)! })

    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    let first = try manager.readNext()
    let second = try manager.readNext()
    let third = try manager.readNext()
    let fourth = try manager.readNext()

    XCTAssertEqual(String(data: first?.data ?? Data(), encoding: .utf8), "Chunk 1")
    XCTAssertFalse(first?.isLast ?? true)
    XCTAssertEqual(String(data: second?.data ?? Data(), encoding: .utf8), "Chunk 2")
    XCTAssertFalse(second?.isLast ?? true)
    XCTAssertEqual(String(data: third?.data ?? Data(), encoding: .utf8), "Chunk 3")
    XCTAssertTrue(third?.isLast ?? false)
    XCTAssertNil(fourth)
  }

  // MARK: - Test: Close Releases The Stream Early

  func testCloseReleasesTheStreamEarly() throws {
    let chunks = ["Chunk 1", "Chunk 2"]
    let encryptedFile = tempDir.appendingPathComponent("pull_closed.dat")
    try writeChunks(encryptedFile, chunks: chunks.map { $0.data(using: .utf8)! })

    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedFile)
    let first = try manager.readNext()
    manager.close()
    let afterClose = try manager.readNext()

    XCTAssertFalse(first?.isLast ?? true)
    XCTAssertNil(afterClose)
  }

  private func pullAll(_ manager: StreamDecryptionManager) throws -> [DecryptedChunk] {
    var chunks: [DecryptedChunk] = []
    while true {
      guard let chunk = try manager.readNext() else {
        break
      }
      chunks.append(chunk)
    }

    return chunks
  }

  private func writeChunks(_ target: URL, chunks: [Data]) throws {
    let key = SymmetricKey(data: testKey)
    var fileData = Data()

    for chunk in chunks {
      let sealedBox = try AES.GCM.seal(chunk, using: key)
      guard let combined = sealedBox.combined else {
        XCTFail("SealedBox should expose a combined representation")
        return
      }

      let chunkSize = Int32(combined.count)
      var bigEndianSize = chunkSize.bigEndian
      fileData.append(Data(bytes: &bigEndianSize, count: 4))
      fileData.append(combined)
    }
    try fileData.write(to: target)
  }
}
