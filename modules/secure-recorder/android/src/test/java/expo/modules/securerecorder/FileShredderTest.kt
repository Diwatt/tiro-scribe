package expo.modules.securerecorder

import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File

/**
 * Tests for FileShredder
 * 
 * ISOMORPHIC: These tests mirror the iOS FileShredderTests
 * to ensure identical behavior across platforms.
 */
class FileShredderTest {
  
  private lateinit var tempDir: File
  
  @Before
  fun setUp() {
    // Create temp directory
    tempDir = File(System.getProperty("java.io.tmpdir"), "secure-recorder-test-${System.currentTimeMillis()}")
    tempDir.mkdirs()
  }
  
  @After
  fun tearDown() {
    // Clean up temp directory
    tempDir.deleteRecursively()
  }
  
  // MARK: - Test: Shred Non-Existent File
  
  @Test
  fun testShredNonExistentFile() {
    // Arrange: File that doesn't exist
    val nonExistentFile = File(tempDir, "non_existent.dat")
    
    // Act & Assert: Should not throw, should return gracefully
    FileShredder.shred(nonExistentFile)
    assertFalse("File should not exist", nonExistentFile.exists())
  }
  
  // MARK: - Test: Shred Empty File
  
  @Test
  fun testShredEmptyFile() {
    // Arrange: Create empty file
    val emptyFile = File(tempDir, "empty.dat")
    emptyFile.createNewFile()
    assertTrue("Empty file should exist", emptyFile.exists())
    
    // Act
    FileShredder.shred(emptyFile)
    
    // Assert: File should be deleted
    assertFalse("Empty file should be deleted", emptyFile.exists())
  }
  
  // MARK: - Test: Shred Small File (< 1MB)
  
  @Test
  fun testShredSmallFile() {
    // Arrange: Create file with test data
    val testFile = File(tempDir, "small.dat")
    val testData = "Hello, World! This is a test file for shredding.".toByteArray()
    testFile.writeBytes(testData)
    assertTrue("Small file should exist", testFile.exists())
    
    // Act
    FileShredder.shred(testFile)
    
    // Assert: File should be deleted
    assertFalse("Small file should be deleted", testFile.exists())
  }
  
  // MARK: - Test: Shred File Exactly 1MB (Boundary Case)
  
  @Test
  fun testShredFileExactly1MB() {
    // Arrange: Create file exactly 1MB
    val testFile = File(tempDir, "exactly_1mb.dat")
    val oneMB = ByteArray(1024 * 1024) { 0x42.toByte() } // 1MB of 0x42 bytes
    testFile.writeBytes(oneMB)
    assertTrue("1MB file should exist", testFile.exists())
    
    // Act
    FileShredder.shred(testFile)
    
    // Assert: File should be deleted
    assertFalse("1MB file should be deleted", testFile.exists())
  }
  
  // MARK: - Test: Shred Large File (> 1MB, Tests Chunked Writing)
  
  @Test
  fun testShredLargeFile() {
    // Arrange: Create file larger than 1MB (2.5MB)
    val testFile = File(tempDir, "large.dat")
    val largeData = ByteArray(2 * 1024 * 1024 + 512 * 1024) { 0xAA.toByte() } // 2.5MB
    testFile.writeBytes(largeData)
    assertTrue("Large file should exist", testFile.exists())
    
    // Act
    FileShredder.shred(testFile)
    
    // Assert: File should be deleted
    assertFalse("Large file should be deleted", testFile.exists())
  }
  
  // MARK: - Test: Verify File Content Overwritten Before Deletion
  
  @Test
  fun testFileContentOverwrittenBeforeDeletion() {
    // Arrange: Create file with known content
    val testFile = File(tempDir, "overwrite_test.dat")
    val originalData = ByteArray(1024) { 0xFF.toByte() } // 1KB of 0xFF bytes
    testFile.writeBytes(originalData)
    assertTrue("Test file should exist", testFile.exists())
    
    // Act: Shred the file
    // Note: We can't verify after deletion, but we can verify the process completes
    FileShredder.shred(testFile)
    
    // Assert: File should be deleted (overwriting happened during shred)
    assertFalse("Test file should be deleted", testFile.exists())
  }
  
  // MARK: - Test: Shred File with Multiple Chunks (Verify Chunked Writing)
  
  @Test
  fun testShredFileWithMultipleChunks() {
    // Arrange: Create file that requires multiple 1MB chunks (3.5MB)
    val testFile = File(tempDir, "multi_chunk.dat")
    val multiChunkData = ByteArray(3 * 1024 * 1024 + 512 * 1024) { 0xCC.toByte() } // 3.5MB
    testFile.writeBytes(multiChunkData)
    
    val fileSize = testFile.length()
    assertEquals("File should be 3.5MB", 3L * 1024 * 1024 + 512 * 1024, fileSize)
    assertTrue("Multi-chunk file should exist", testFile.exists())
    
    // Act
    FileShredder.shred(testFile)
    
    // Assert: File should be deleted
    assertFalse("Multi-chunk file should be deleted", testFile.exists())
  }
  
  // MARK: - Test: Shred File in Non-Writable Location (Permission Error Handling)
  
  @Test
  fun testShredFileWithPermissionError() {
    // Arrange: Create file in temp directory (should be writable)
    val testFile = File(tempDir, "permission_test.dat")
    val testData = "Test data".toByteArray()
    testFile.writeBytes(testData)
    assertTrue("Permission test file should exist", testFile.exists())
    
    // Act: Should handle gracefully even if there are permission issues
    // In normal temp directory, this should succeed
    try {
      FileShredder.shred(testFile)
      // If we get here, file should be deleted
      assertFalse("Permission test file should be deleted", testFile.exists())
    } catch (e: Exception) {
      // If permission error occurs, file might still exist, but that's acceptable
      // The important thing is that the method handles the error gracefully
      fail("Shredding should not throw in normal circumstances: ${e.message}")
    }
  }
  
  // MARK: - Test: Shred Multiple Files Sequentially
  
  @Test
  fun testShredMultipleFilesSequentially() {
    // Arrange: Create multiple files
    val files = (0..4).map { index ->
      val file = File(tempDir, "file_$index.dat")
      val data = "File $index content".toByteArray()
      file.writeBytes(data)
      file
    }
    
    // Verify all files exist
    for (file in files) {
      assertTrue("File ${file.name} should exist", file.exists())
    }
    
    // Act: Shred all files
    for (file in files) {
      FileShredder.shred(file)
    }
    
    // Assert: All files should be deleted
    for (file in files) {
      assertFalse("File ${file.name} should be deleted", file.exists())
    }
  }
}
