package expo.modules.securerecorder

import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Decrypts encrypted audio files block by block with a pull cursor.
 *
 * readNext() decrypts and returns the next block, or null once the file is
 * exhausted. The block marked isLast is the last one carrying data; after it
 * the reader is exhausted and closed. close() releases the open file handle
 * early when the consumer abandons the stream.
 *
 * Block format (written by EncryptionStream):
 * [4-byte size][12-byte IV][data + 16-byte tag]
 *
 * MEMORY SAFETY: Zero accumulation, minimal RAM usage
 * - Each call: Read → Decrypt → Return
 * - Constant memory usage regardless of file size
 */
class StreamDecryptionManager(
  private val secretKey: SecretKey,
  private val encryptedFile: File
) {
  private var inputStream: FileInputStream? = null
  private var bytesReadTotal = 0L
  private var exhausted = false

  /**
   * Decrypts and returns the next block, or null when the file is exhausted.
   *
   * @throws IllegalStateException if the file is corrupted
   * @throws Exception if decryption fails
   */
  internal fun readNext(): DecryptedChunk? {
    if (exhausted) {
      return null
    }

    val sealedBlock = readNextBlock()
    if (sealedBlock == null) {
      markExhausted()

      return null
    }

    val decryptedData = decrypt(sealedBlock)

    val isLast = bytesReadTotal >= encryptedFile.length()
    if (isLast) {
      markExhausted()
    }

    return DecryptedChunk(decryptedData, isLast)
  }

  /**
   * Releases the open file handle early. Any further readNext() call returns
   * null, mirroring an exhausted stream.
   */
  internal fun close() {
    markExhausted()
  }

  /**
   * Releases the open file handle early. Any further readNext() call returns
   * null, mirroring an exhausted stream.
   */
  private fun readNextBlock(): ByteArray? {
    val stream = ensureOpenStream()

    val chunkSize = readChunkSize(stream) ?: return null
    val sealedBlock = ByteArray(chunkSize)
    var totalRead = 0
    while (totalRead < chunkSize) {
      val read = stream.read(sealedBlock, totalRead, chunkSize - totalRead)
      if (read == -1) {
        throw IllegalStateException("Corrupted file: incomplete chunk")
      }
      totalRead += read
    }
    bytesReadTotal += chunkSize

    return sealedBlock
  }

  /**
   * Reads and validates the 4-byte big-endian block size header.
   * Returns null at end of file.
   */
  private fun readChunkSize(stream: FileInputStream): Int? {
    val sizeHeader = ByteArray(SealedAudioBlock.SIZE_HEADER_LENGTH)
    val headerBytesRead = stream.read(sizeHeader)
    if (headerBytesRead == -1) {
      return null
    }
    if (headerBytesRead < SealedAudioBlock.SIZE_HEADER_LENGTH) {
      throw IllegalStateException("Corrupted file: incomplete chunk size header")
    }
    bytesReadTotal += SealedAudioBlock.SIZE_HEADER_LENGTH

    val chunkSize = ByteBuffer.wrap(sizeHeader).int
    if (chunkSize < SealedAudioBlock.MINIMUM_SIZE) {
      throw IllegalStateException("Invalid chunk size: $chunkSize")
    }

    return chunkSize
  }

  /**
   * Decrypts a sealed block: [12-byte IV][data + 16-byte GCM tag].
   */
  private fun decrypt(sealedBlock: ByteArray): ByteArray {
    val iv = sealedBlock.copyOfRange(0, SealedAudioBlock.NONCE_LENGTH)
    val encryptedDataWithTag = sealedBlock.copyOfRange(SealedAudioBlock.NONCE_LENGTH, sealedBlock.size)

    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(SealedAudioBlock.TAG_LENGTH * 8, iv))

    return cipher.doFinal(encryptedDataWithTag)
  }

  private fun ensureOpenStream(): FileInputStream {
    return inputStream ?: FileInputStream(encryptedFile).also { inputStream = it }
  }

  private fun markExhausted() {
    exhausted = true
    inputStream?.close()
    inputStream = null
  }
  /**
   * Releases the open file handle early. Any further readNext() call returns
   * null, mirroring an exhausted stream.
   */
}
