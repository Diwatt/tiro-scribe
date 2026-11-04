package expo.modules.securerecorder

import android.media.AudioRecord
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.File
import javax.crypto.SecretKey

/**
 * Manages a single recording session for Android
 *
 * Orchestrates recording components (Facade pattern). Coordinates audio recording,
 * encryption, state management, and event handling. Manages session lifecycle from
 * initialization through cleanup.
 *
 * ISOMORPHIC: Matches iOS Session exactly
 * - Both: start, pause, resume, stop, cleanup, startAudioCapture
 * - Both: 1 encounter = 1 file (pause keeps file open)
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
  internal val sessionId: String,
  internal val outputFile: File,
  private val keyManager: KeyManagerInterface,
  private val audioRecorder: AudioRecorder,
  private val audioConfig: AudioConfig,
  private val limiter: LimitRegistryInterface = LimitRegistry(),
  private val onLimitReached: (suspend (StopReason, String, String) -> Unit)? = null,
  private val recordingScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
  private val encryptionStreamFactory: (SecretKey, File) -> EncryptionStreamInterface = { secretKey, outputFile ->
    EncryptionStream(secretKey, outputFile)
  }
) : SessionInterface {

  // SAFETY: internal for tests - limits and errors route through this handler
  internal lateinit var eventHandler: EventHandler
  private lateinit var encryptionStream: EncryptionStreamInterface
  private lateinit var currentAudioRecord: AudioRecord
  internal var recordingJob: Job? = null
    private set

  override val recordingTimer = RecordingTimer()

  /**
   * Start recording session
   * Initializes encryption and audio capture
   *
   * @return File path where encrypted audio is being written
   * @throws Exception if initialization fails
   */
  override fun start(keyAlias: String): String {
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

    // Remove file ONLY on fresh start (not resume)
    if (outputFile.exists()) {
      outputFile.delete()
    }

    // Initialize encryption stream
    encryptionStream = encryptionStreamFactory(secretKey, outputFile)
    encryptionStream.initialize()

    startAudioCapture()

    return outputFile.absolutePath
  }

  /**
   * Start audio capture and pipeline processing
   *
   * Extracted from start() to allow reuse by resume().
   * Creates pipeline, starts audio recording, and launches processing coroutine.
   */
  private fun startAudioCapture() {
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
  }

  /**
   * Pause recording session
   * Stops audio capture but keeps encryption stream open for resume
   *
   * @return File path where encrypted audio is written
   * @throws NoRecordingException if not currently recording
   */
  override fun pause(): String {
    if (!recordingTimer.isActive) {
      throw expo.modules.securerecorder.exception.NoRecordingException()
    }

    // Cancel recording job
    recordingJob?.cancel()
    recordingJob = null

    // Stop audio recording
    if (::currentAudioRecord.isInitialized) {
      audioRecorder.stop(currentAudioRecord)
    }

    // Flush buffered audio to disk (encryption stream stays open)
    encryptionStream.flush()

    // Deactivate state
    recordingTimer.deactivate()

    return outputFile.absolutePath
  }

  /**
   * Resume recording session
   * Restarts audio capture to existing encryption stream
   *
   * @return File path where encrypted audio is written
   * @throws RecordingInProgressException if already recording
   * @throws InitializationException if no encryption stream to resume
   */
  override fun resume(): String {
    if (recordingTimer.isActive) {
      throw expo.modules.securerecorder.exception.RecordingInProgressException()
    }

    if (!::encryptionStream.isInitialized) {
      throw expo.modules.securerecorder.exception.InitializationException("No encryption stream to resume")
    }

    startAudioCapture()

    return outputFile.absolutePath
  }

  /**
   * Stop recording session
   * Finalizes encryption and stops audio capture
   *
   * @return File path where encrypted audio was written
   * @throws Exception if finalization fails
   */
  override fun stop(): String {
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
  override fun cleanup() {
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
  override fun getInfo(): SessionInfo {
    return SessionInfo(sessionId, outputFile.absolutePath, recordingTimer.isActive)
  }

  data class SessionInfo(
    internal val sessionId: String,
    internal val filePath: String,
    internal val isActive: Boolean
  )
}
