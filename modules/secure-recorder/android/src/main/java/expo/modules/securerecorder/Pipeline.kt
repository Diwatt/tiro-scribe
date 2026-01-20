package expo.modules.securerecorder

import android.media.AudioRecord
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import java.io.File

/**
 * Handles audio data processing pipeline for Android
 * 
 * Processes audio data from AudioRecord, encrypts it, and writes to disk.
 * Checks recording limits (duration and file size) in loop iterations to prevent
 * exceeding memory constraints during streaming decryption.
 * 
 * ANDROID SPECIFICITY:
 * - Coroutine-based loop (process() suspend function)
 * - Actively reads from AudioRecord in loop (pull-based)
 * - Limit checking in loop iteration
 * - Uses File.length() for file size
 */
class Pipeline(
  private val audioRecord: AudioRecord,
  private val encryptionStream: EncryptionStream,
  private val audioConfig: AudioConfig,
  private val outputFile: File,
  private val limiter: LimitRegistry,
  private val stateManager: StateManager,
  private val onLimitReached: suspend (StopReason) -> Unit,
  private val onError: (String) -> Unit
) {
  // Private methods
  private suspend inline fun <reified T : Limit> isLimitExceeded(limits: List<Limit>, value: Long): Boolean {
    val limit = limits.firstOrNull { it is T }
    if (limit != null && limit.isExceeded(value)) {
      onLimitReached(limit.reason)
      return true
    }
    return false
  }
  
  // Internal methods
  internal suspend fun process() {
    val buffer = ByteArray(audioConfig.bufferSize)
    
    try {
      while (currentCoroutineContext().isActive && stateManager.isActive) {
        // SECURITY: Check all limits
        val limits = limiter.getLimits()
        
        // Check duration limit
        val elapsedTime = stateManager.getElapsedTime()
        if (isLimitExceeded<Limit.Duration>(limits, elapsedTime)) {
          return
        }
        
        // Check file size limit
        val fileSize = outputFile.length()
        if (isLimitExceeded<Limit.FileSize>(limits, fileSize)) {
          return
        }
        
        val bytesRead = audioRecord.read(buffer, 0, buffer.size)
        if (bytesRead > 0) {
          val dataToWrite = buffer.copyOfRange(0, bytesRead)
          encryptionStream.write(dataToWrite)
        } else if (bytesRead < 0) {
          onError("AudioRecord read error: $bytesRead")
          return
        }
      }
    } catch (e: Exception) {
      onError("Exception in recording pipeline: ${e.message}")
    }
  }
}
