package expo.modules.securerecorder

import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.Cipher

/**
 * Unit tests for EncryptionStream
 * Tests buffered AES-256-GCM encryption strategy
 * Matches iOS EncryptionStreamTests structure and behavior
 */
class EncryptionStreamTest {

  private lateinit var secretKey: SecretKey
  private lateinit var outputFile: File
  private lateinit var encryptionStream: EncryptionStream

  @Before
  fun setup() {
    // Generate test key
    val keyGenerator = KeyGenerator.getInstance("AES")
    keyGenerator.init(256)
    secretKey = keyGenerator.generateKey()

    // Create temporary output file path (but don't create the file yet)
    val tempDir = System.getProperty("java.io.tmpdir")
    outputFile = File(tempDir, "test_encryption_${System.currentTimeMillis()}.dat")
    
    encryptionStream = EncryptionStream(secretKey, outputFile)
  }

  @After
  fun tearDown() {
    try {
      encryptionStream.close()
    } catch (e: Exception) {
      // Ignore
    }
    
    outputFile.delete()
  }

  @Test
  fun `initialize creates output file`() {
    assertFalse("File should not exist initially", outputFile.exists())
    
    outputFile.delete() // Ensure clean state
    encryptionStream = EncryptionStream(secretKey, outputFile)
    encryptionStream.initialize()
    
    assertTrue("File should be created after initialization", outputFile.exists())
  }

  @Test
  fun `write encrypts data correctly`() {
    val plaintext = "Hello, World!".toByteArray()
    
    encryptionStream.initialize()
    encryptionStream.write(plaintext)
    encryptionStream.close()
    
    val fileBytes = outputFile.readBytes()
    
    // Each flushed buffer contains: 4-byte size + IV (12) + ciphertext (size matches plaintext) + tag (16)
    val expectedSize = 4 + 12 + plaintext.size + 16
    assertEquals("File should contain one sealed box: size + IV + ciphertext + tag", 
                 expectedSize, fileBytes.size)
    
    // Verify data is actually encrypted (not plaintext)
    assertFalse("File should not contain plaintext", 
                fileBytes.contentEquals(plaintext))
  }

  @Test
  fun `write throws when not initialized`() {
    val plaintext = "test".toByteArray()
    
    try {
      encryptionStream.write(plaintext)
      fail("Should throw IllegalStateException when not initialized")
    } catch (e: IllegalStateException) {
      assertEquals("Encryption stream not initialized", e.message)
    }
  }


  @Test
  fun `encrypted data can be decrypted successfully`() {
    val plaintext = "This is a secret message!".toByteArray()
    
    // Encrypt
    encryptionStream.initialize()
    encryptionStream.write(plaintext)
    encryptionStream.close()
    
    // Read encrypted file (should be a single sealed box for this test)
    val fileBytes = outputFile.readBytes()
    
    // Skip 4-byte chunk size, extract IV (next 12 bytes) and ciphertext+tag (rest)
    val iv = fileBytes.copyOfRange(4, 16)
    val ciphertextWithTag = fileBytes.copyOfRange(16, fileBytes.size)
    
    // Decrypt
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val gcmSpec = GCMParameterSpec(128, iv) // 128-bit tag
    cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
    val decrypted = cipher.doFinal(ciphertextWithTag)
    
    assertArrayEquals("Decrypted data should match original plaintext", plaintext, decrypted)
  }

  @Test
  fun `multiple writes create multiple sealed boxes`() {
    // Use large chunks that individually exceed the encryption threshold (16KB)
    // so that each write flushes independently and creates its own sealed box.
    val chunkSize = 16 * 1024
    val chunk1 = ByteArray(chunkSize) { 1 }
    val chunk2 = ByteArray(chunkSize) { 2 }
    val chunk3 = ByteArray(chunkSize) { 3 }
    
    encryptionStream.initialize()
    encryptionStream.write(chunk1)
    encryptionStream.write(chunk2)
    encryptionStream.write(chunk3)
    encryptionStream.close()
    
    val fileBytes = outputFile.readBytes()
    
    // Each chunk creates its own sealed box: 4 (size) + 12 (IV) + data + 16 (tag)
    val expectedSize = (4 + 12 + chunk1.size + 16) + 
                      (4 + 12 + chunk2.size + 16) + 
                      (4 + 12 + chunk3.size + 16)
    assertEquals("File should contain three sealed boxes", expectedSize, fileBytes.size)
    
    // Decrypt each sealed box independently
    var offset = 0
    val decryptedChunks = mutableListOf<ByteArray>()
    
    // Decrypt chunk 1
    offset += 4 // Skip chunk size
    val box1Size = 12 + chunk1.size + 16
    val box1Iv = fileBytes.copyOfRange(offset, offset + 12)
    val box1Ciphertext = fileBytes.copyOfRange(offset + 12, offset + box1Size)
    val cipher1 = Cipher.getInstance("AES/GCM/NoPadding")
    cipher1.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, box1Iv))
    decryptedChunks.add(cipher1.doFinal(box1Ciphertext))
    offset += box1Size
    
    // Decrypt chunk 2
    offset += 4 // Skip chunk size
    val box2Size = 12 + chunk2.size + 16
    val box2Iv = fileBytes.copyOfRange(offset, offset + 12)
    val box2Ciphertext = fileBytes.copyOfRange(offset + 12, offset + box2Size)
    val cipher2 = Cipher.getInstance("AES/GCM/NoPadding")
    cipher2.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, box2Iv))
    decryptedChunks.add(cipher2.doFinal(box2Ciphertext))
    offset += box2Size
    
    // Decrypt chunk 3
    offset += 4 // Skip chunk size
    val box3Size = 12 + chunk3.size + 16
    val box3Iv = fileBytes.copyOfRange(offset, offset + 12)
    val box3Ciphertext = fileBytes.copyOfRange(offset + 12, offset + box3Size)
    val cipher3 = Cipher.getInstance("AES/GCM/NoPadding")
    cipher3.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, box3Iv))
    decryptedChunks.add(cipher3.doFinal(box3Ciphertext))
    
    // Verify each chunk
    assertArrayEquals(chunk1, decryptedChunks[0])
    assertArrayEquals(chunk2, decryptedChunks[1])
    assertArrayEquals(chunk3, decryptedChunks[2])
  }

  @Test
  fun `close can be called multiple times safely`() {
    encryptionStream.initialize()
    encryptionStream.write("test".toByteArray())
    
    // Should not throw
    encryptionStream.close()
    encryptionStream.close()
    encryptionStream.close()
  }

  @Test
  fun `each chunk has unique IV`() {
    // Use large chunks that trigger separate flushes so that each sealed box
    // has its own independently generated IV.
    val chunkSize = 16 * 1024
    val chunk1 = ByteArray(chunkSize) { 1 }
    val chunk2 = ByteArray(chunkSize) { 2 }
    
    encryptionStream.initialize()
    encryptionStream.write(chunk1)
    encryptionStream.write(chunk2)
    encryptionStream.close()
    
    val fileBytes = outputFile.readBytes()
    
    // Extract IVs from each sealed box (skip 4-byte size prefix)
    val iv1 = fileBytes.copyOfRange(4, 16)
    val box1Size = 4 + 12 + chunk1.size + 16
    val iv2 = fileBytes.copyOfRange(box1Size + 4, box1Size + 16)
    
    assertFalse("Each flushed chunk should have a unique IV", iv1.contentEquals(iv2))
  }

  @Test
  fun `data is only written after threshold or close`() {
    val smallChunk = ByteArray(1024) { 7 } // 1KB, well below 16KB threshold

    encryptionStream.initialize()
    encryptionStream.write(smallChunk)

    // Below threshold: no data should have been written yet
    assertEquals("File should still be empty before flushing threshold", 0L, outputFile.length())

    // After close, buffered data should be flushed
    encryptionStream.close()
    val fileBytes = outputFile.readBytes()
    assertTrue("File should contain encrypted data after close", fileBytes.isNotEmpty())
  }
}
