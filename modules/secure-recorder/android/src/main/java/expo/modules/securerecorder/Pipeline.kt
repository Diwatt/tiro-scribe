package expo.modules.securerecorder

import android.media.AudioRecord
import android.util.Log
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
  private val encryptionStream: EncryptionStreamInterface,
  private val audioConfig: AudioConfig,
  private val outputFile: File,
  private val limiter: LimitRegistryInterface,
  private val recordingTimer: RecordingTimerInterface,
  private val onLimitReached: suspend (StopReason) -> Unit,
  private val onError: (String) -> Unit
) {
  internal suspend fun process() {
    val buffer = ByteArray(audioConfig.bufferSize)
    val startTime = System.currentTimeMillis()
    var iteration = 0

    try {
      while (currentCoroutineContext().isActive && recordingTimer.isActive) {
        iteration++
        // SECURITY: Check all limits
        val limits = limiter.getLimits()
        
        // Check duration limit
        val elapsedTime = recordingTimer.getElapsedTime()
        if (isLimitExceeded<Limit.Duration>(limits, elapsedTime)) {
          Log.d("SecureRecorder", "Pipeline limit reached after $iteration iterations, elapsed=$elapsedTime")
          return
        }
        
        // Check file size limit
        val fileSize = outputFile.length()
        if (isLimitExceeded<Limit.FileSize>(limits, fileSize)) {
          Log.d("SecureRecorder", "Pipeline file size limit reached after $iteration iterations, size=$fileSize")
          return
        }
        
        val bytesRead = audioRecord.read(buffer, 0, buffer.size)
        val now = System.currentTimeMillis()
        val elapsedSinceStart = now - startTime
        Log.d("SecureRecorder", "Pipeline iter=$iteration bytesRead=$bytesRead elapsed=${elapsedSinceStart}ms")
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
  
  private suspend inline fun <reified T : Limit> isLimitExceeded(limits: List<Limit>, value: Long): Boolean {
    val limit = limits.firstOrNull { it is T }
    if (limit != null && limit.isExceeded(value)) {
      onLimitReached(limit.reason)
      return true
    }
    return false
  }
}
