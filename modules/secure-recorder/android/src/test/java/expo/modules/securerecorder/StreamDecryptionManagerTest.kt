package expo.modules.securerecorder

import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
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
    tempDir = File(System.getProperty("java.io.tmpdir"), "secure-recorder-test-${System.currentTimeMillis()}")
    tempDir.mkdirs()

    val keyGen = KeyGenerator.getInstance("AES")
    keyGen.init(256)
    testKey = keyGen.generateKey()
  }

  @After
  fun tearDown() {
    tempDir.deleteRecursively()
  }

  @Test
  fun testDecryptSingleChunk() {
    val testData = "Hello, World!".toByteArray()
    val encryptedFile = File(tempDir, "single_chunk.dat")
    writeChunks(encryptedFile, listOf(testData))

    val decryptedChunks = mutableListOf<ByteArray>()
    StreamDecryptionManager(testKey, encryptedFile).stream { data, index, isLast ->
      decryptedChunks.add(data)
      assertEquals(0, index)
      assertTrue(isLast)
    }

    assertEquals(1, decryptedChunks.size)
    assertArrayEquals(testData, decryptedChunks[0])
  }

  @Test
  fun testDecryptMultipleChunks() {
    val chunks = listOf("Chunk 1", "Chunk 2", "Chunk 3")
    val encryptedFile = File(tempDir, "multiple_chunks.dat")
    writeChunks(encryptedFile, chunks.map { it.toByteArray() })

    val decryptedChunks = mutableListOf<Triple<String, Int, Boolean>>()
    StreamDecryptionManager(testKey, encryptedFile).stream { data, index, isLast ->
      decryptedChunks.add(Triple(String(data), index, isLast))
    }

    assertEquals(3, decryptedChunks.size)
    assertEquals("Chunk 1", decryptedChunks[0].first)
    assertEquals(0, decryptedChunks[0].second)
    assertFalse(decryptedChunks[0].third)

    assertEquals("Chunk 2", decryptedChunks[1].first)
    assertEquals(1, decryptedChunks[1].second)
    assertFalse(decryptedChunks[1].third)

    assertEquals("Chunk 3", decryptedChunks[2].first)
    assertEquals(2, decryptedChunks[2].second)
    assertTrue(decryptedChunks[2].third)
  }

  @Test
  fun testCorruptedFileMissingChunkSize() {
    val encryptedFile = File(tempDir, "corrupted_size.dat")
    encryptedFile.writeBytes(byteArrayOf(0x00, 0x00))

    try {
      StreamDecryptionManager(testKey, encryptedFile).stream { _, _, _ -> }
      fail("Expected IllegalStateException for incomplete chunk size header")
    } catch (e: IllegalStateException) {
      assertEquals("Corrupted file: incomplete chunk size header", e.message)
    }
  }

  @Test
  fun testCorruptedFileMissingIv() {
    val encryptedFile = File(tempDir, "corrupted_iv.dat")
    val buffer = ByteBuffer.allocate(4 + 5)
    buffer.putInt(100)
    buffer.put(ByteArray(5))
    encryptedFile.writeBytes(buffer.array())

    try {
      StreamDecryptionManager(testKey, encryptedFile).stream { _, _, _ -> }
      fail("Expected IllegalStateException for incomplete IV")
    } catch (e: IllegalStateException) {
      assertEquals("Corrupted file: incomplete IV", e.message)
    }
  }

  @Test
  fun testCorruptedFileMissingChunkData() {
    val encryptedFile = File(tempDir, "corrupted_data.dat")
    val buffer = ByteBuffer.allocate(4 + 12)
    buffer.putInt(100)
    buffer.put(ByteArray(12))
    encryptedFile.writeBytes(buffer.array())

    try {
      StreamDecryptionManager(testKey, encryptedFile).stream { _, _, _ -> }
      fail("Expected IllegalStateException for incomplete chunk data")
    } catch (e: IllegalStateException) {
      assertEquals("Corrupted file: incomplete chunk", e.message)
    }
  }

  @Test
  fun testInvalidChunkSizeTooSmall() {
    val encryptedFile = File(tempDir, "invalid_size.dat")
    val buffer = ByteBuffer.allocate(14)
    buffer.putInt(10)
    buffer.put(ByteArray(10))
    encryptedFile.writeBytes(buffer.array())

    try {
      StreamDecryptionManager(testKey, encryptedFile).stream { _, _, _ -> }
      fail("Expected IllegalStateException for invalid chunk size")
    } catch (e: IllegalStateException) {
      assertEquals("Invalid chunk size: 10", e.message)
    }
  }

  @Test
  fun testWrongDecryptionKey() {
    val testData = "Secret message".toByteArray()
    val encryptedFile = File(tempDir, "wrong_key.dat")
    writeChunks(encryptedFile, listOf(testData))

    val wrongKeyGen = KeyGenerator.getInstance("AES")
    wrongKeyGen.init(256)
    val wrongKey = wrongKeyGen.generateKey()

    try {
      StreamDecryptionManager(wrongKey, encryptedFile).stream { _, _, _ -> }
      fail("Expected decryption failure with the wrong key")
    } catch (e: Exception) {
      assertTrue("GCM authentication should fail with the wrong key", e is javax.crypto.AEADBadTagException)
    }
  }

  private fun writeChunks(target: File, chunks: List<ByteArray>) {
    val fileData = mutableListOf<Byte>()
    for (chunk in chunks) {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      val iv = ByteArray(12)
      SecureRandom().nextBytes(iv)
      cipher.init(Cipher.ENCRYPT_MODE, testKey, GCMParameterSpec(128, iv))
      val encrypted = cipher.doFinal(chunk)

      val chunkSize = iv.size + encrypted.size
      val buffer = ByteBuffer.allocate(4 + chunkSize)
      buffer.putInt(chunkSize)
      buffer.put(iv)
      buffer.put(encrypted)
      fileData.addAll(buffer.array().toList())
    }
    target.writeBytes(fileData.toByteArray())
  }
}
