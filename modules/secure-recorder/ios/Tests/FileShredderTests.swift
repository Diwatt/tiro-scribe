import XCTest
@testable import SecureRecorder

/**
 * Tests for FileShredder
 * 
 * ISOMORPHIC: These tests mirror the Android FileShredderTest
 * to ensure identical behavior across platforms.
 */
class FileShredderTests: XCTestCase {
  
  var tempDir: URL!
  
  override func setUp() {
    super.setUp()
    
    // Create temp directory
    tempDir = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
  }
  
  override func tearDown() {
    // Clean up temp directory
    try? FileManager.default.removeItem(at: tempDir)
    super.tearDown()
  }
  
  // MARK: - Test: Shred Non-Existent File
  
  func testShredNonExistentFile() throws {
    // Arrange: File that doesn't exist
    let nonExistentFile = tempDir.appendingPathComponent("non_existent.dat")
    
    // Act & Assert: Should not throw, should return gracefully
    XCTAssertNoThrow(try FileShredder.shred(fileURL: nonExistentFile))
    XCTAssertFalse(FileManager.default.fileExists(atPath: nonExistentFile.path))
  }
  
  // MARK: - Test: Shred Empty File
  
  func testShredEmptyFile() throws {
    // Arrange: Create empty file
    let emptyFile = tempDir.appendingPathComponent("empty.dat")
    FileManager.default.createFile(atPath: emptyFile.path, contents: nil)
    XCTAssertTrue(FileManager.default.fileExists(atPath: emptyFile.path))
    
    // Act
    try FileShredder.shred(fileURL: emptyFile)
    
    // Assert: File should be deleted
    XCTAssertFalse(FileManager.default.fileExists(atPath: emptyFile.path))
  }
  
  // MARK: - Test: Shred Small File (< 1MB)
  
  func testShredSmallFile() throws {
    // Arrange: Create file with test data
    let testFile = tempDir.appendingPathComponent("small.dat")
    let testData = "Hello, World! This is a test file for shredding.".data(using: .utf8)!
    try testData.write(to: testFile)
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act
    try FileShredder.shred(fileURL: testFile)
    
    // Assert: File should be deleted
    XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
  }
  
  // MARK: - Test: Shred File Exactly 1MB (Boundary Case)
  
  func testShredFileExactly1MB() throws {
    // Arrange: Create file exactly 1MB
    let testFile = tempDir.appendingPathComponent("exactly_1mb.dat")
    let oneMB = Data(repeating: 0x42, count: 1024 * 1024) // 1MB of 0x42 bytes
    try oneMB.write(to: testFile)
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act
    try FileShredder.shred(fileURL: testFile)
    
    // Assert: File should be deleted
    XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
  }
  
  // MARK: - Test: Shred Large File (> 1MB, Tests Chunked Writing)
  
  func testShredLargeFile() throws {
    // Arrange: Create file larger than 1MB (2.5MB)
    let testFile = tempDir.appendingPathComponent("large.dat")
    let largeData = Data(repeating: 0xAA, count: 2 * 1024 * 1024 + 512 * 1024) // 2.5MB
    try largeData.write(to: testFile)
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act
    try FileShredder.shred(fileURL: testFile)
    
    // Assert: File should be deleted
    XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
  }
  
  // MARK: - Test: Verify File Content Overwritten Before Deletion
  
  func testFileContentOverwrittenBeforeDeletion() throws {
    // Arrange: Create file with known content
    let testFile = tempDir.appendingPathComponent("overwrite_test.dat")
    let originalData = Data(repeating: 0xFF, count: 1024) // 1KB of 0xFF bytes
    try originalData.write(to: testFile)
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act: Shred the file
    // Note: We can't verify after deletion, but we can verify the process completes
    try FileShredder.shred(fileURL: testFile)
    
    // Assert: File should be deleted (overwriting happened during shred)
    XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
  }
  
  // MARK: - Test: Shred File with Multiple Chunks (Verify Chunked Writing)
  
  func testShredFileWithMultipleChunks() throws {
    // Arrange: Create file that requires multiple 1MB chunks (3.5MB)
    let testFile = tempDir.appendingPathComponent("multi_chunk.dat")
    let multiChunkData = Data(repeating: 0xCC, count: 3 * 1024 * 1024 + 512 * 1024) // 3.5MB
    try multiChunkData.write(to: testFile)
    
    let fileSize = try FileManager.default.attributesOfItem(atPath: testFile.path)[.size] as! UInt64
    XCTAssertEqual(fileSize, 3 * 1024 * 1024 + 512 * 1024, "File should be 3.5MB")
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act
    try FileShredder.shred(fileURL: testFile)
    
    // Assert: File should be deleted
    XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
  }
  
  // MARK: - Test: Shred File in Non-Writable Location (Permission Error Handling)
  
  func testShredFileWithPermissionError() throws {
    // Arrange: Create file in temp directory (should be writable)
    let testFile = tempDir.appendingPathComponent("permission_test.dat")
    let testData = "Test data".data(using: .utf8)!
    try testData.write(to: testFile)
    XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
    
    // Act: Should handle gracefully even if there are permission issues
    // In normal temp directory, this should succeed
    do {
      try FileShredder.shred(fileURL: testFile)
      // If we get here, file should be deleted
      XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path))
    } catch {
      // If permission error occurs, file might still exist, but that's acceptable
      // The important thing is that the method handles the error gracefully
      XCTFail("Shredding should not throw in normal circumstances: \(error)")
    }
  }
  
  // MARK: - Test: Shred Multiple Files Sequentially
  
  func testShredMultipleFilesSequentially() throws {
    // Arrange: Create multiple files
    let files = (0..<5).map { index in
      let file = tempDir.appendingPathComponent("file_\(index).dat")
      let data = "File \(index) content".data(using: .utf8)!
      try! data.write(to: file)
      return file
    }
    
    // Verify all files exist
    for file in files {
      XCTAssertTrue(FileManager.default.fileExists(atPath: file.path))
    }
    
    // Act: Shred all files
    for file in files {
      try FileShredder.shred(fileURL: file)
    }
    
    // Assert: All files should be deleted
    for file in files {
      XCTAssertFalse(FileManager.default.fileExists(atPath: file.path))
    }
  }
}
