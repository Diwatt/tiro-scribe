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

    val decryptedChunks = pullAll(StreamDecryptionManager(testKey, encryptedFile))

    assertEquals(1, decryptedChunks.size)
    assertArrayEquals(testData, decryptedChunks[0].data)
    assertTrue(decryptedChunks[0].isLast)
  }

  @Test
  fun testDecryptMultipleChunks() {
    val chunks = listOf("Chunk 1", "Chunk 2", "Chunk 3")
    val encryptedFile = File(tempDir, "multiple_chunks.dat")
    writeChunks(encryptedFile, chunks.map { it.toByteArray() })

    val decryptedChunks = pullAll(StreamDecryptionManager(testKey, encryptedFile))

    assertEquals(3, decryptedChunks.size)
    assertEquals("Chunk 1", String(decryptedChunks[0].data))
    assertFalse(decryptedChunks[0].isLast)

    assertEquals("Chunk 2", String(decryptedChunks[1].data))
    assertFalse(decryptedChunks[1].isLast)

    assertEquals("Chunk 3", String(decryptedChunks[2].data))
    assertTrue(decryptedChunks[2].isLast)
  }

  @Test
  fun testCorruptedFileMissingChunkSize() {
    val encryptedFile = File(tempDir, "corrupted_size.dat")
    encryptedFile.writeBytes(byteArrayOf(0x00, 0x00))

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    try {
      manager.readNext()
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

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    try {
      manager.readNext()
      fail("Expected IllegalStateException for incomplete sealed block")
    } catch (e: IllegalStateException) {
      // The IV and the data are read as one sealed block, so a truncated IV
      // is reported at block granularity.
      assertEquals("Corrupted file: incomplete chunk", e.message)
    }
  }

  @Test
  fun testCorruptedFileMissingChunkData() {
    val encryptedFile = File(tempDir, "corrupted_data.dat")
    val buffer = ByteBuffer.allocate(4 + 12)
    buffer.putInt(100)
    buffer.put(ByteArray(12))
    encryptedFile.writeBytes(buffer.array())

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    try {
      manager.readNext()
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

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    try {
      manager.readNext()
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

    val manager = StreamDecryptionManager(wrongKey, encryptedFile)
    try {
      manager.readNext()
      fail("Expected decryption failure with the wrong key")
    } catch (e: Exception) {
      assertTrue("GCM authentication should fail with the wrong key", e is javax.crypto.AEADBadTagException)
    }
  }

  @Test
  fun testReadNextReturnsSingleBlockMarkedLast() {
    val testData = "Hello, World!".toByteArray()
    val encryptedFile = File(tempDir, "pull_single.dat")
    writeChunks(encryptedFile, listOf(testData))

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val first = manager.readNext()
    val second = manager.readNext()

    assertTrue(first != null)
    assertArrayEquals(testData, first!!.data)
    assertTrue(first!!.isLast)
    assertEquals(null, second)
  }

  @Test
  fun testReadNextReturnsBlocksInOrderUntilExhausted() {
    val chunks = listOf("Chunk 1", "Chunk 2", "Chunk 3")
    val encryptedFile = File(tempDir, "pull_multiple.dat")
    writeChunks(encryptedFile, chunks.map { it.toByteArray() })

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val first = manager.readNext()
    val second = manager.readNext()
    val third = manager.readNext()
    val fourth = manager.readNext()

    assertEquals("Chunk 1", String(first!!.data))
    assertFalse(first!!.isLast)
    assertEquals("Chunk 2", String(second!!.data))
    assertFalse(second!!.isLast)
    assertEquals("Chunk 3", String(third!!.data))
    assertTrue(third!!.isLast)
    assertEquals(null, fourth)
  }

  @Test
  fun testCloseReleasesTheStreamEarly() {
    val chunks = listOf("Chunk 1", "Chunk 2")
    val encryptedFile = File(tempDir, "pull_closed.dat")
    writeChunks(encryptedFile, chunks.map { it.toByteArray() })

    val manager = StreamDecryptionManager(testKey, encryptedFile)
    val first = manager.readNext()
    manager.close()
    val afterClose = manager.readNext()

    assertFalse(first!!.isLast)
    assertEquals(null, afterClose)
  }

  private fun pullAll(manager: StreamDecryptionManager): List<DecryptedChunk> {
    val chunks = mutableListOf<DecryptedChunk>()
    while (true) {
      val chunk = manager.readNext() ?: break
      chunks.add(chunk)
    }

    return chunks
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
