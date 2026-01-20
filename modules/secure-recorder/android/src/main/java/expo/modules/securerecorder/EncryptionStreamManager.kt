package expo.modules.securerecorder

import java.io.File
import java.io.FileOutputStream
import javax.crypto.Cipher
import javax.crypto.CipherOutputStream
import javax.crypto.SecretKey

/**
 * Manages encryption stream for secure audio recording
 */
class EncryptionStreamManager(
  private val secretKey: SecretKey,
  private val outputFile: File
) {
  private var fileOutputStream: FileOutputStream? = null
  private var cipherOutputStream: CipherOutputStream? = null

  /**
   * Initialize encryption stream and return the IV (nonce)
   */
  fun initialize(): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, secretKey)
    val iv = cipher.iv

    fileOutputStream = FileOutputStream(outputFile)
    fileOutputStream!!.write(iv)
    cipherOutputStream = CipherOutputStream(fileOutputStream, cipher)

    return iv
  }

  /**
   * Write encrypted data to stream
   */
  fun write(data: ByteArray, offset: Int, length: Int) {
    cipherOutputStream?.write(data, offset, length)
    cipherOutputStream?.flush()
  }

  /**
   * Finalize encryption and write authentication tag
   * Must be called before close() to ensure GCM tag is written
   */
  fun finalize() {
    try {
      // Closing CipherOutputStream automatically finalizes GCM tag
      cipherOutputStream?.close()
      cipherOutputStream = null
    } catch (e: Exception) {
      // Ignore cleanup errors
    }
  }

  /**
   * Close encryption stream
   * Call finalize() first to ensure GCM tag is written
   */
  fun close() {
    try {
      fileOutputStream?.close()
    } catch (e: Exception) {
      // Ignore cleanup errors
    }
    fileOutputStream = null
  }
}
