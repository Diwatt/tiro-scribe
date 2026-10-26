import XCTest
import CryptoKit
@testable import SecureRecorder

/**
 * Tests for encryptFile pipeline behavior
 *
 * Mimics the private `encryptFile(inputPath, outputPath)` method on SecureRecorderModule:
 * creates an EncryptionStream, initializes it, reads the input file in chunks, writes each
 * chunk to the stream, and closes it. Then decrypts the result with StreamDecryptionManager
 * to verify round-trip integrity, chunk structure, and unique IVs.
 */
class EncryptFileTests: XCTestCase {

  var tempDir: URL!
  var testKey: Data!

  override func setUp() {
    super.setUp()

    tempDir = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)

    testKey = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
  }

  override func tearDown() {
    try? FileManager.default.removeItem(at: tempDir)
    super.tearDown()
  }

  // MARK: - Helpers

  private func createPlaintextFile(name: String, sizeBytes: Int) throws -> URL {
    let url = tempDir.appendingPathComponent(name)
    var data = Data()
    data.reserveCapacity(sizeBytes)
    for index in 0..<sizeBytes {
      data.append(UInt8(index % 256))
    }
    try data.write(to: url)
    return url
  }

  private func encryptFile(inputURL: URL, outputURL: URL) throws {
    let encryptionStream = EncryptionStream(secretKey: testKey, outputFile: outputURL)
    try encryptionStream.initialize()

    let fileHandle = try FileHandle(forReadingFrom: inputURL)
    defer {
      try? fileHandle.close()
    }

    while let chunk = try? fileHandle.read(upToCount: 8192), !chunk.isEmpty {
      try encryptionStream.write(data: chunk)
    }

    encryptionStream.close()
  }

  private func decryptFile(encryptedURL: URL) throws -> [Data] {
    let manager = StreamDecryptionManager(secretKey: testKey, encryptedFile: encryptedURL)
    var chunks: [Data] = []

    try manager.stream { data, _, _ in
      chunks.append(data)
    }

    return chunks
  }

  // MARK: - Test: Round Trip Small File

  func testEncryptFileRoundTripSmallFile() throws {
    let plaintextURL = try createPlaintextFile(name: "small_plain.dat", sizeBytes: 4 * 1024)
    let encryptedURL = tempDir.appendingPathComponent("small_encrypted.dat")

    try encryptFile(inputURL: plaintextURL, outputURL: encryptedURL)

    let decryptedChunks = try decryptFile(encryptedURL: encryptedURL)
    let decrypted = decryptedChunks.reduce(Data()) { $0 + $1 }
    let original = try Data(contentsOf: plaintextURL)

    XCTAssertEqual(decrypted, original, "Decrypted content should match original small file")
  }

  // MARK: - Test: Round Trip Large File

  func testEncryptFileRoundTripLargeFile() throws {
    let plaintextSize = 40 * 1024
    let plaintextURL = try createPlaintextFile(name: "large_plain.dat", sizeBytes: plaintextSize)
    let encryptedURL = tempDir.appendingPathComponent("large_encrypted.dat")

    try encryptFile(inputURL: plaintextURL, outputURL: encryptedURL)

    let decryptedChunks = try decryptFile(encryptedURL: encryptedURL)
    XCTAssertGreaterThan(decryptedChunks.count, 1, "Large file should produce multiple chunks")

    let decrypted = decryptedChunks.reduce(Data()) { $0 + $1 }
    let original = try Data(contentsOf: plaintextURL)

    XCTAssertEqual(decrypted, original, "Decrypted content should match original large file")
  }

  // MARK: - Test: Chunk Structure

  func testEncryptFileProducesCorrectChunkStructure() throws {
    let plaintextURL = try createPlaintextFile(name: "structure_plain.dat", sizeBytes: 2 * 1024)
    let encryptedURL = tempDir.appendingPathComponent("structure_encrypted.dat")

    try encryptFile(inputURL: plaintextURL, outputURL: encryptedURL)

    let fileBytes = try Data(contentsOf: encryptedURL)
    XCTAssertFalse(fileBytes.isEmpty, "Encrypted file should not be empty")

    let chunkSize = fileBytes.withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
    XCTAssertGreaterThanOrEqual(chunkSize, 28, "Chunk size should be at least 28 (12-byte nonce + 16-byte tag)")

    let expectedTotalSize = 4 + Int(chunkSize)
    XCTAssertEqual(fileBytes.count, expectedTotalSize, "Single-chunk file size should equal 4 + chunkSize")
  }

  // MARK: - Test: Unique IVs Across Chunks

  func testEncryptFileMultipleChunksHaveUniqueIVs() throws {
    let plaintextSize = 40 * 1024
    let plaintextURL = try createPlaintextFile(name: "unique_iv_plain.dat", sizeBytes: plaintextSize)
    let encryptedURL = tempDir.appendingPathComponent("unique_iv_encrypted.dat")

    try encryptFile(inputURL: plaintextURL, outputURL: encryptedURL)

    let fileBytes = try Data(contentsOf: encryptedURL)
    var ivs: [Data] = []
    var offset = 0

    while offset < fileBytes.count {
      let chunkSize = fileBytes.subdata(in: offset..<offset + 4).withUnsafeBytes { $0.load(as: Int32.self).bigEndian }
      let iv = fileBytes.subdata(in: offset + 4..<offset + 16)
      ivs.append(iv)
      offset += 4 + Int(chunkSize)
    }

    XCTAssertGreaterThan(ivs.count, 1, "Should have multiple chunks")

    for index in ivs.indices {
      for comparisonIndex in (index + 1)..<ivs.count {
        XCTAssertNotEqual(ivs[index], ivs[comparisonIndex], "Each chunk should have a unique IV")
      }
    }
  }
}
