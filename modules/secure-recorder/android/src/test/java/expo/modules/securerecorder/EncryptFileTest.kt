package expo.modules.securerecorder

import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File
import java.nio.ByteBuffer
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Tests for encryptFile pipeline behavior
 *
 * Mimics the private `encryptFile(inputPath, outputPath)` method on SecureRecorderModule:
 * creates an EncryptionStream, initializes it, reads the input file in chunks, writes each
 * chunk to the stream, and closes it. Then decrypts the result with StreamDecryptionManager
 * to verify round-trip integrity, chunk structure, and unique IVs.
 */
class EncryptFileTest {

  private lateinit var tempDir: File
  private lateinit var secretKey: SecretKey

  @Before
  fun setUp() {
    tempDir = File(System.getProperty("java.io.tmpdir"), "encrypt-file-test-${System.currentTimeMillis()}")
    tempDir.mkdirs()

    val keyGenerator = KeyGenerator.getInstance("AES")
    keyGenerator.init(256)
    secretKey = keyGenerator.generateKey()
  }

  @After
  fun tearDown() {
    tempDir.deleteRecursively()
  }

  // MARK: - Helpers

  private fun createPlaintextFile(name: String, sizeBytes: Int): File {
    val file = File(tempDir, name)
    val data = ByteArray(sizeBytes) { (it % 256).toByte() }
    file.writeBytes(data)
    return file
  }

  private fun encryptFile(inputFile: File, outputFile: File) {
    val encryptionStream = EncryptionStream(secretKey, outputFile)
    encryptionStream.initialize()

    inputFile.inputStream().use { input ->
      val buffer = ByteArray(8 * 1024)
      var bytesRead: Int
      while (input.read(buffer).also { bytesRead = it } != -1) {
        val chunk = if (bytesRead < buffer.size) buffer.copyOf(bytesRead) else buffer
        encryptionStream.write(chunk)
      }
    }

    encryptionStream.close()
  }

  private fun decryptFile(encryptedFile: File): List<ByteArray> {
    val manager = StreamDecryptionManager(secretKey, encryptedFile)
    val chunks = mutableListOf<ByteArray>()
    manager.stream { data, _, _ ->
      chunks.add(data)
    }
    return chunks
  }

  // MARK: - Test: Round Trip Small File

  @Test
  fun testEncryptFileRoundTripSmallFile() {
    val plaintextFile = createPlaintextFile("small_plain.dat", 4 * 1024)
    val encryptedFile = File(tempDir, "small_encrypted.dat")

    encryptFile(plaintextFile, encryptedFile)

    val decryptedChunks = decryptFile(encryptedFile)
    val decrypted = decryptedChunks.reduce { acc, bytes -> acc + bytes }

    assertArrayEquals("Decrypted content should match original small file", plaintextFile.readBytes(), decrypted)
  }

  // MARK: - Test: Round Trip Large File

  @Test
  fun testEncryptFileRoundTripLargeFile() {
    val plaintextSize = 40 * 1024
    val plaintextFile = createPlaintextFile("large_plain.dat", plaintextSize)
    val encryptedFile = File(tempDir, "large_encrypted.dat")

    encryptFile(plaintextFile, encryptedFile)

    val decryptedChunks = decryptFile(encryptedFile)
    assertTrue("Large file should produce multiple chunks", decryptedChunks.size > 1)

    val decrypted = decryptedChunks.reduce { acc, bytes -> acc + bytes }
    assertArrayEquals("Decrypted content should match original large file", plaintextFile.readBytes(), decrypted)
  }

  // MARK: - Test: Chunk Structure

  @Test
  fun testEncryptFileProducesCorrectChunkStructure() {
    val plaintextFile = createPlaintextFile("structure_plain.dat", 2 * 1024)
    val encryptedFile = File(tempDir, "structure_encrypted.dat")

    encryptFile(plaintextFile, encryptedFile)

    val fileBytes = encryptedFile.readBytes()
    assertTrue("Encrypted file should not be empty", fileBytes.isNotEmpty())

    val chunkSize = ByteBuffer.wrap(fileBytes.copyOfRange(0, 4)).int
    assertTrue("Chunk size should be at least 28 (12-byte IV + 16-byte tag)", chunkSize >= 28)

    val expectedTotalSize = 4 + chunkSize
    assertEquals("Single-chunk file size should equal 4 + chunkSize", expectedTotalSize, fileBytes.size)
  }

  // MARK: - Test: Unique IVs Across Chunks

  @Test
  fun testEncryptFileMultipleChunksHaveUniqueIVs() {
    val plaintextSize = 40 * 1024
    val plaintextFile = createPlaintextFile("unique_iv_plain.dat", plaintextSize)
    val encryptedFile = File(tempDir, "unique_iv_encrypted.dat")

    encryptFile(plaintextFile, encryptedFile)

    val fileBytes = encryptedFile.readBytes()
    val ivs = mutableListOf<ByteArray>()
    var offset = 0

    while (offset < fileBytes.size) {
      val chunkSize = ByteBuffer.wrap(fileBytes.copyOfRange(offset, offset + 4)).int
      val iv = fileBytes.copyOfRange(offset + 4, offset + 16)
      ivs.add(iv)
      offset += 4 + chunkSize
    }

    assertTrue("Should have multiple chunks", ivs.size > 1)

    for (i in ivs.indices) {
      for (j in i + 1 until ivs.size) {
        assertFalse("Each chunk should have a unique IV", ivs[i].contentEquals(ivs[j]))
      }
    }
  }
}
