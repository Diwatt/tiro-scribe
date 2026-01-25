package expo.modules.securerecorder

import android.media.AudioRecord
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.File

/**
 * Manages a single recording session for Android
 * 
 * Orchestrates recording components (Facade pattern). Coordinates audio recording,
 * encryption, state management, and event handling. Manages session lifecycle from
 * initialization through cleanup.
 * 
 * ANDROID SPECIFICITY:
 * - Uses Kotlin coroutines (CoroutineScope) for asynchronous operations
 * - start() is synchronous (no throws)
 * - Uses AudioRecord API (via AudioRecorder)
 * - EventHandler initialized inline in start()
 * - getInfo() returns SessionInfo data class
 * - File overwrites automatically (FileOutputStream)
 * - cleanup() has try-catch for best-effort cleanup
 */
class Session(
  private val sessionId: String,
  private val outputFile: File,
  private val keyManager: KeyManagerInterface,
  private val audioRecorder: AudioRecorder,
  private val audioConfig: AudioConfig,
  private val limiter: LimitRegistryInterface = LimitRegistry(),
  private val onLimitReached: (suspend (StopReason, String, String) -> Unit)? = null
) {
  private lateinit var eventHandler: EventHandler
  private lateinit var encryptionStream: EncryptionStream
  private lateinit var currentAudioRecord: AudioRecord
  private var recordingJob: Job? = null
  private val recordingScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  
  internal val recordingTimer = RecordingTimer()
  
  /**
   * Start recording session
   * Initializes encryption and audio capture
   * 
   * @return File path where encrypted audio is being written
   * @throws Exception if initialization fails
   */
  internal fun start(keyAlias: String): String {
    // Initialize event handler (needs stop() method, so initialize here)
    eventHandler = EventHandler(
      sessionId = sessionId,
      outputFile = outputFile,
      recordingTimer = recordingTimer,
      onStop = { stop() },
      onLimitReached = onLimitReached
    )
    
    // Get or create encryption key
    val secretKey = keyManager.getOrCreateKey(keyAlias)
    
    // Initialize encryption stream
    encryptionStream = EncryptionStream(secretKey, outputFile)
    encryptionStream.initialize()
    
    // Start audio recording
    val audioRecord = audioRecorder.start()
    audioRecord.startRecording()
    currentAudioRecord = audioRecord
    
    // Activate state
    recordingTimer.activate()
    
    // Create pipeline for audio processing
    val pipeline = Pipeline(
      audioRecord = audioRecord,
      encryptionStream = encryptionStream,
      audioConfig = audioConfig,
      outputFile = outputFile,
      limiter = limiter,
      recordingTimer = recordingTimer,
      onLimitReached = { reason ->
        eventHandler.onLimitReached(reason)
      },
      onError = { message ->
        eventHandler.onError(message)
      }
    )
    
    // Start recording coroutine
    recordingJob = recordingScope.launch {
      pipeline.process()
    }
    
    return outputFile.absolutePath
  }
  
  /**
   * Stop recording session
   * Finalizes encryption and stops audio capture
   * 
   * @return File path where encrypted audio was written
   * @throws Exception if finalization fails
   */
  internal fun stop(): String {
    // Cancel recording job
    val job = recordingJob
    if (job != null) {
      job.cancel()
      recordingJob = null
    }
    
    // Stop audio recording
    if (::currentAudioRecord.isInitialized) {
      audioRecorder.stop(currentAudioRecord)
    }
    
    // Close encryption stream safely
    if (::encryptionStream.isInitialized) {
      encryptionStream.close()
    }
    
    // Deactivate state
    recordingTimer.deactivate()
    
    return outputFile.absolutePath
  }
  
  /**
   * Cleanup session resources
   * Safe to call even if session wasn't fully initialized
   */
  internal fun cleanup() {
    try {
      // Cancel recording job
      val job = recordingJob
      if (job != null) {
        job.cancel()
        recordingJob = null
      }
      
      // Cancel entire scope to prevent resource leaks
      recordingScope.cancel()
      
      // Stop audio recording
      if (::currentAudioRecord.isInitialized) {
        audioRecorder.stop(currentAudioRecord)
      }
      
      // Close encryption stream safely
      if (::encryptionStream.isInitialized) {
        encryptionStream.close()
      }
      
      // Deactivate state
      recordingTimer.deactivate()
    } catch (e: Exception) {
      // Ignore cleanup errors - best effort cleanup
      // State is still updated to prevent further operations
      recordingTimer.deactivate()
    }
  }
  
  /**
   * Get session information
   */
  internal fun getInfo(): SessionInfo {
    return SessionInfo(sessionId, outputFile.absolutePath, recordingTimer.isActive)
  }
  
  data class SessionInfo(
    internal val sessionId: String,
    internal val filePath: String,
    internal val isActive: Boolean
  )
}
