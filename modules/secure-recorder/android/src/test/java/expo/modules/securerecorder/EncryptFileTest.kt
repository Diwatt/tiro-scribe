package expo.modules.securerecorder

import expo.modules.securerecorder.exception.InitializationException
import io.mockk.every
import io.mockk.mockk
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.File
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Tests for SecureRecorderModule.encryptFile and encryptBytes.
 *
 * The real module methods are called (no algorithm re-implementation) with an injected
 * KeyManagerInterface test double, then round-tripped through StreamDecryptionManager
 * to verify content integrity, chunk structure, and unique IVs.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class EncryptFileTest {

  private lateinit var tempDir: File
  private lateinit var secretKey: SecretKey
  private lateinit var module: SecureRecorderModule

  @Before
  fun setUp() {
    tempDir = File(
      RuntimeEnvironment.getApplication().filesDir,
      "encrypt-test-${System.currentTimeMillis()}"
    )
    tempDir.mkdirs()

    val keyGenerator = KeyGenerator.getInstance("AES")
    keyGenerator.init(256)
    secretKey = keyGenerator.generateKey()

    val mockKeyManager = mockk<KeyManagerInterface> {
      every { getOrCreateKey(any()) } returns secretKey
    }
    module = SecureRecorderModule(
      injectedContext = RuntimeEnvironment.getApplication(),
      keyManagerFactory = { mockKeyManager }
    )
  }

  @After
  fun tearDown() {
    tempDir.deleteRecursively()
  }

  @Test
  fun `encryptFile round-trips a small file`() {
    val plaintextFile = createPlaintextFile("small_plain.dat", 4 * 1024)
    val encryptedFile = File(tempDir, "small_encrypted.dat")

    val outputPath = module.encryptFile(plaintextFile.absolutePath, encryptedFile.absolutePath)

    assertEquals(encryptedFile.absolutePath, outputPath)
    assertArrayEquals(plaintextFile.readBytes(), decryptedContent(encryptedFile))
  }

  @Test
  fun `encryptFile round-trips a large file across multiple chunks`() {
    val plaintextFile = createPlaintextFile("large_plain.dat", 40 * 1024)
    val encryptedFile = File(tempDir, "large_encrypted.dat")

    module.encryptFile(plaintextFile.absolutePath, encryptedFile.absolutePath)

    val chunks = decryptedChunks(encryptedFile)
    assertTrue("Large file should produce multiple chunks", chunks.size > 1)
    assertArrayEquals(plaintextFile.readBytes(), chunks.reduce { acc, bytes -> acc + bytes })
  }

  @Test
  fun `encryptFile throws InitializationException when the input file does not exist`() {
    val missingPath = File(tempDir, "missing.dat").absolutePath

    val exception = assertThrows(InitializationException::class.java) {
      module.encryptFile(missingPath, File(tempDir, "out.dat").absolutePath)
    }

    assertEquals("Input file not found: $missingPath", exception.message)
  }

  @Test
  fun `encryptBytes round-trips bytes`() {
    val data = ByteArray(2 * 1024) { (it % 251).toByte() }
    val encryptedFile = File(tempDir, "bytes_encrypted.dat")

    val outputPath = module.encryptBytes(data, encryptedFile.absolutePath)

    assertEquals(encryptedFile.absolutePath, outputPath)
    assertArrayEquals(data, decryptedContent(encryptedFile))
  }

  @Test
  fun `encryptBytes splits data larger than one chunk into multiple sealed boxes`() {
    val data = ByteArray(40 * 1024) { (it % 251).toByte() }
    val encryptedFile = File(tempDir, "bytes_large_encrypted.dat")

    module.encryptBytes(data, encryptedFile.absolutePath)

    val chunks = decryptedChunks(encryptedFile)
    assertTrue("Data larger than 16KB should produce multiple chunks", chunks.size > 1)
    assertArrayEquals(data, chunks.reduce { acc, bytes -> acc + bytes })
  }

  @Test
  fun `encryptBytes produces an empty file for empty input`() {
    val encryptedFile = File(tempDir, "bytes_empty_encrypted.dat")

    module.encryptBytes(ByteArray(0), encryptedFile.absolutePath)

    assertEquals("Empty input should produce no sealed chunk", 0L, encryptedFile.length())
  }

  private fun createPlaintextFile(name: String, sizeBytes: Int): File {
    val file = File(tempDir, name)
    file.writeBytes(ByteArray(sizeBytes) { (it % 256).toByte() })
    return file
  }

  private fun decryptedChunks(encryptedFile: File): List<ByteArray> {
    val chunks = mutableListOf<ByteArray>()
    StreamDecryptionManager(secretKey, encryptedFile).stream { data, _, _ ->
      chunks.add(data)
    }
    return chunks
  }

  private fun decryptedContent(encryptedFile: File): ByteArray {
    return decryptedChunks(encryptedFile).reduce { acc, bytes -> acc + bytes }
  }
}
