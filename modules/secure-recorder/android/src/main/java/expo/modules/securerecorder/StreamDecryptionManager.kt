package expo.modules.securerecorder

import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Manages streaming decryption of encrypted audio files for Android
 * 
 * Decrypts encrypted audio files using true streaming (FileInputStream), emitting events
 * for each decrypted chunk without accumulating data in memory.
 * 
 * ANDROID SPECIFICITY:
 * - Uses javax.crypto.Cipher with GCMParameterSpec for decryption
 * - Uses FileInputStream for true streaming (reads chunks incrementally from disk)
 * - ByteBuffer for chunk size parsing (big-endian via putInt)
 * - Manual IV extraction and GCMParameterSpec creation
 * 
 * MEMORY SAFETY: Zero accumulation, minimal RAM usage
 * - Each chunk: Read → Decrypt → Emit → Discard
 * - No temporary files
 * - Constant memory usage regardless of file size
 * - Only one chunk in memory at a time
 */
class StreamDecryptionManager(
  private val secretKey: SecretKey,
  private val encryptedFile: File
) {
  // Companion object
  companion object {
    private const val GCM_TAG_LENGTH = 128 // 128 bits = 16 bytes
    private const val GCM_IV_LENGTH = 12 // 12 bytes (standard for GCM)
    private const val CHUNK_SIZE_LENGTH = 4 // 4 bytes for Int (chunk size header)
  }

  // Internal methods
  /**
   * Stream decrypt file chunk by chunk, emitting events for each decrypted chunk
   * 
   * Processes encrypted file sequentially using FileInputStream for true streaming.
   * Decrypts each chunk and immediately emits an event, then discards the data.
   * 
   * @param onChunk Event emitter callback: (ByteArray, Int, Boolean) -> Unit
   * @throws Exception if decryption fails or file is corrupted
   */
  internal fun stream(onChunk: (data: ByteArray, index: Int, isLast: Boolean) -> Unit) {
    FileInputStream(encryptedFile).use { inputStream ->
      val fileSize = encryptedFile.length()
      var chunkIndex = 0
      var bytesReadTotal = 0L
      
      while (true) {
        // Read chunk size (4 bytes, big-endian)
        val chunkSizeBuffer = ByteArray(CHUNK_SIZE_LENGTH)
        val bytesRead = inputStream.read(chunkSizeBuffer)
        
        // Check if we've reached end of file
        if (bytesRead == -1) {
          // End of file reached naturally
          break
        }
        
        // If we read less than expected, file is corrupted
        if (bytesRead < CHUNK_SIZE_LENGTH) {
          throw IllegalStateException("Corrupted file: incomplete chunk size header")
        }
        
        bytesReadTotal += bytesRead
        val chunkSize = ByteBuffer.wrap(chunkSizeBuffer).int
        
        // Validate chunk size
        if (chunkSize < GCM_IV_LENGTH + GCM_TAG_LENGTH / 8) {
          throw IllegalStateException("Invalid chunk size: $chunkSize")
        }
        
        // Read IV (12 bytes)
        val iv = ByteArray(GCM_IV_LENGTH)
        val ivBytesRead = inputStream.read(iv)
        if (ivBytesRead < GCM_IV_LENGTH) {
          throw IllegalStateException("Corrupted file: incomplete IV")
        }
        bytesReadTotal += ivBytesRead
        
        // Read encrypted data + tag
        val encryptedDataSize = chunkSize - GCM_IV_LENGTH
        val encryptedDataWithTag = ByteArray(encryptedDataSize)
        var totalRead = 0
        while (totalRead < encryptedDataSize) {
          val read = inputStream.read(encryptedDataWithTag, totalRead, encryptedDataSize - totalRead)
          if (read == -1) {
            throw IllegalStateException("Corrupted file: incomplete chunk")
          }
          totalRead += read
        }
        bytesReadTotal += totalRead
        
        // SECURITY: Decrypt chunk with AES-256-GCM
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
        val decryptedChunk = cipher.doFinal(encryptedDataWithTag)
        
        // Check if this is the last chunk
        val isLast = bytesReadTotal >= fileSize
        
        // Emit event immediately, then discard data
        onChunk(decryptedChunk, chunkIndex, isLast)
        
        chunkIndex++
      }
    }
  }
}
