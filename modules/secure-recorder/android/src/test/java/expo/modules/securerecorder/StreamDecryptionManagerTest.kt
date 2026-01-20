package expo.modules.securerecorder

import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.security.SecureRandom

/**
 * Tests for StreamDecryptionManager
 * 
 * ISOMORPHIC: These tests mirror the iOS StreamDecryptionManagerTests
 * to ensure identical behavior across platforms.
 */
class StreamDecryptionManagerTest {
  
  private lateinit var tempDir: File
  private lateinit var testKey: SecretKey
  
  @Before
  fun setUp() {
    // Create temp directory
    tempDir = File(System.getProperty("java.io.tmpdir"), "secure-recorder-test-${System.currentTimeMillis()}")
    tempDir.mkdirs()
    
    // Generate test key (256-bit for AES-256)
    val keyGen = KeyGenerator.getInstance("AES")
    keyGen.init(256)
    testKey = keyGen.generateKey()
  }
  
  @After
  fun tearDown() {
    // Clean up temp directory
    tempDir.deleteRecursively()
  }
  
  // MARK: - Test: Decrypt Single Chunk
  
  @Test
  fun testDecryptSingleChunk() {
    // Arrange: Create encrypted file with single chunk
    val testData = "Hello, World!".toByteArray()
    val encryptedFile = File(tempDir, "single_chunk.dat")
    
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val iv = ByteArray(12)
    SecureRandom().nextBytes(iv)
    cipher.init(Cipher.ENCRYPT_MODE, testKey, GCMParameterSpec(128, iv))
    val encrypted = cipher.doFinal(testData)
    
    // Write: [4-byte size][IV][ciphertext+tag]
    val chunkSize = iv.size + encrypted.size
    val buffer = ByteBuffer.allocate(4 + chunkSize)
    buffer.putInt(chunkSize)
    buffer.put(iv)
    buffer.put(encrypted)
    encryptedFile.writeBytes(buffer.array())
    
    // Act: Decrypt
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val decryptedChunks = mutableListOf<ByteArray>()
    
    manager.stream { data, index, isLast ->
      decryptedChunks.add(data)
      assertEquals("Single chunk should have index 0", 0, index)
      assertTrue("Single chunk should be marked as last", isLast)
    }
    
    // Assert
    assertEquals("Should have exactly 1 chunk", 1, decryptedChunks.size)
    assertArrayEquals("Decrypted data should match original", testData, decryptedChunks[0])
  }
  
  // MARK: - Test: Decrypt Multiple Chunks
  
  @Test
  fun testDecryptMultipleChunks() {
    // Arrange: Create encrypted file with 3 chunks
    val chunks = listOf("Chunk 1", "Chunk 2", "Chunk 3")
    val encryptedFile = File(tempDir, "multiple_chunks.dat")
    
    val fileData = mutableListOf<Byte>()
    
    for (chunk in chunks) {
      val chunkData = chunk.toByteArray()
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      val iv = ByteArray(12)
      SecureRandom().nextBytes(iv)
      cipher.init(Cipher.ENCRYPT_MODE, testKey, GCMParameterSpec(128, iv))
      val encrypted = cipher.doFinal(chunkData)
      
      // Write: [4-byte size][IV][ciphertext+tag]
      val chunkSize = iv.size + encrypted.size
      val buffer = ByteBuffer.allocate(4 + chunkSize)
      buffer.putInt(chunkSize)
      buffer.put(iv)
      buffer.put(encrypted)
      fileData.addAll(buffer.array().toList())
    }
    encryptedFile.writeBytes(fileData.toByteArray())
    
    // Act: Decrypt
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val decryptedChunks = mutableListOf<Triple<String, Int, Boolean>>()
    
    manager.stream { data, index, isLast ->
      val string = String(data)
      decryptedChunks.add(Triple(string, index, isLast))
    }
    
    // Assert
    assertEquals("Should have 3 chunks", 3, decryptedChunks.size)
    assertEquals("Chunk 1", decryptedChunks[0].first)
    assertEquals(0, decryptedChunks[0].second)
    assertFalse("First chunk should not be last", decryptedChunks[0].third)
    
    assertEquals("Chunk 2", decryptedChunks[1].first)
    assertEquals(1, decryptedChunks[1].second)
    assertFalse("Second chunk should not be last", decryptedChunks[1].third)
    
    assertEquals("Chunk 3", decryptedChunks[2].first)
    assertEquals(2, decryptedChunks[2].second)
    assertTrue("Third chunk should be last", decryptedChunks[2].third)
  }
  
  // MARK: - Test: Stream All Chunks
  
  @Test
  fun testStreamAllChunks() {
    // Arrange
    val chunks = listOf("Test 1", "Test 2", "Test 3")
    val encryptedFile = File(tempDir, "stream_all.dat")
    
    val fileData = mutableListOf<Byte>()
    
    for (chunk in chunks) {
      val chunkData = chunk.toByteArray()
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      val iv = ByteArray(12)
      SecureRandom().nextBytes(iv)
      cipher.init(Cipher.ENCRYPT_MODE, testKey, GCMParameterSpec(128, iv))
      val encrypted = cipher.doFinal(chunkData)
      
      val chunkSize = iv.size + encrypted.size
      val buffer = ByteBuffer.allocate(4 + chunkSize)
      buffer.putInt(chunkSize)
      buffer.put(iv)
      buffer.put(encrypted)
      fileData.addAll(buffer.array().toList())
    }
    encryptedFile.writeBytes(fileData.toByteArray())
    
    // Act
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val decryptedChunks = mutableListOf<Triple<String, Int, Boolean>>()
    
    manager.stream { data, index, isLast ->
      val string = String(data)
      decryptedChunks.add(Triple(string, index, isLast))
    }
    
    // Assert
    assertEquals(3, decryptedChunks.size)
    assertEquals("Test 1", decryptedChunks[0].first)
    assertEquals(0, decryptedChunks[0].second)
    assertFalse(decryptedChunks[0].third)
    
    assertEquals("Test 2", decryptedChunks[1].first)
    assertEquals(1, decryptedChunks[1].second)
    assertFalse(decryptedChunks[1].third)
    
    assertEquals("Test 3", decryptedChunks[2].first)
    assertEquals(2, decryptedChunks[2].second)
    assertTrue(decryptedChunks[2].third)
  }
  
  // MARK: - Test: Corrupted File (Missing Chunk Size)
  
  @Test(expected = IllegalStateException::class)
  fun testCorruptedFileMissingChunkSize() {
    // Arrange: Create file with incomplete chunk size header
    val encryptedFile = File(tempDir, "corrupted_size.dat")
    val incompleteData = byteArrayOf(0x00, 0x00) // Only 2 bytes instead of 4
    encryptedFile.writeBytes(incompleteData)
    
    // Act & Assert
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    manager.stream { _, _, _ -> }
  }
  
  // MARK: - Test: Corrupted File (Missing Chunk Data)
  
  @Test(expected = IllegalStateException::class)
  fun testCorruptedFileMissingChunkData() {
    // Arrange: Write chunk size but not the data
    val encryptedFile = File(tempDir, "corrupted_data.dat")
    
    // Write chunk size claiming 100 bytes, but provide no data
    val buffer = ByteBuffer.allocate(4)
    buffer.putInt(100)
    encryptedFile.writeBytes(buffer.array())
    
    // Act & Assert
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    manager.stream { _, _, _ -> }
  }
  
  // MARK: - Test: Invalid Chunk Size (Too Small)
  
  @Test(expected = IllegalStateException::class)
  fun testInvalidChunkSizeTooSmall() {
    // Arrange: Chunk size smaller than IV + tag
    val encryptedFile = File(tempDir, "invalid_size.dat")
    
    // Write chunk size of 10 (less than 12-byte IV + 16-byte tag = 28 bytes minimum)
    val buffer = ByteBuffer.allocate(14)
    buffer.putInt(10) // Invalid size
    buffer.put(ByteArray(10)) // Add 10 bytes of dummy data
    encryptedFile.writeBytes(buffer.array())
    
    // Act & Assert
    val manager = StreamDecryptionManager(testKey, encryptedFile)
    manager.stream { _, _, _ -> }
  }
  
  // MARK: - Test: Wrong Decryption Key
  
  @Test(expected = Exception::class)
  fun testWrongDecryptionKey() {
    // Arrange: Encrypt with one key, decrypt with another
    val testData = "Secret message".toByteArray()
    val encryptedFile = File(tempDir, "wrong_key.dat")
    
    // Encrypt with original key
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val iv = ByteArray(12)
    SecureRandom().nextBytes(iv)
    cipher.init(Cipher.ENCRYPT_MODE, testKey, GCMParameterSpec(128, iv))
    val encrypted = cipher.doFinal(testData)
    
    val chunkSize = iv.size + encrypted.size
    val buffer = ByteBuffer.allocate(4 + chunkSize)
    buffer.putInt(chunkSize)
    buffer.put(iv)
    buffer.put(encrypted)
    encryptedFile.writeBytes(buffer.array())
    
    // Try to decrypt with different key
    val wrongKeyGen = KeyGenerator.getInstance("AES")
    wrongKeyGen.init(256)
    val wrongKey = wrongKeyGen.generateKey()
    val manager = StreamDecryptionManager(wrongKey, encryptedFile)
    
    // Act & Assert
    manager.stream { _, _, _ -> }
  }
}
