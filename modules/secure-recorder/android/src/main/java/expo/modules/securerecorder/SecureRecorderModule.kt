package expo.modules.securerecorder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.securerecorder.exception.*
import java.io.File
import java.io.FileOutputStream
import java.io.FileDescriptor

/**
 * Expo module for SecureRecorder on Android
 * 
 * Thin wrapper that delegates to Session. Provides Expo module interface for
 * starting/stopping recordings, checking permissions, and decrypting audio files.
 * Manages session lifecycle and emits status change events.
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderModule exactly
 * - Both: startRecording, stopRecording, pauseRecording, resumeRecording, getStatus
 * - Both: Emits onRecordingStatusChanged with state, sessionId, filePath
 * 
 * ANDROID SPECIFICITY:
 * - Synchronous methods (Kotlin, wrapped in AsyncFunction by Expo)
 * - Uses Context.filesDir for file storage
 * - Permission check via ContextCompat.checkSelfPermission
 * - Exception classes with code property
 * - KeyManager requires Context parameter (needed for AndroidKeyStore)
 * 
 * ERROR CODE MAPPING (to TypeScript SecureRecorderError.code):
 * - RecordingInProgressException → "RECORDING_IN_PROGRESS"
 * - NoRecordingException → "NO_RECORDING_IN_PROGRESS"
 * - PermissionDeniedException → "PERMISSION_DENIED"
 * - InitializationException → "INITIALIZATION_FAILED"
 * - KeyStoreException → "KEYCHAIN_ERROR"
 * 
 * All exceptions include code property that Expo framework converts to JavaScript {code, message} objects.
 */
class SecureRecorderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("ReactContext not available")
  private val audioConfig: AudioConfig by lazy { AudioConfig() }
  private val keyManager: KeyManager by lazy { KeyManager(context) }
  private val audioRecorder: AudioRecorder by lazy { AudioRecorder(audioConfig) }
  private var currentSession: Session? = null
  private val keyAlias = "secure_recorder_key"
  
  override fun definition() = ModuleDefinition {
    Name("SecureRecorder")

    Events("onRecordingStatusChanged", "onAudioChunkDecrypted")

    AsyncFunction("start") { sessionId: String ->
      start(sessionId)
    }

    AsyncFunction("stop") {
      stop()
    }

    AsyncFunction("pause") {
      pause()
    }

    AsyncFunction("resume") {
      resume()
    }

    AsyncFunction("getStatus") {
      status()
    }

    AsyncFunction("hasPermission") {
      hasPermission()
    }

    AsyncFunction("stream") { encryptedPath: String ->
      stream(encryptedPath)
    }
  }
  
  private fun emitStatusChanged(state: RecorderState, sessionId: String?, filePath: String?, reason: StopReason? = null) {
    val eventData = mutableMapOf<String, Any?>(
      "state" to state.toJsString(),
      "sessionId" to sessionId,
      "filePath" to filePath
    )
    reason?.let { eventData["reason"] = it.toJsString() }
    sendEvent("onRecordingStatusChanged", eventData)
  }

  private fun cleanupSession() {
    currentSession?.cleanup()
    currentSession = null
  }

  /**
   * Checks if recording is currently in progress.
   * @return true if a session exists and is actively recording
   */
  private fun isRecording(): Boolean {
    val session = currentSession ?: return false
    return session.recordingTimer.isActive
  }

  private fun start(sessionId: String): String {
    // Validate session ID
    if (sessionId.isBlank()) {
      throw InitializationException("Session ID cannot be empty")
    }

    // Check if already recording
    if (isRecording()) {
      throw RecordingInProgressException()
    }

    // Check permission
    if (!hasPermission()) {
      throw PermissionDeniedException()
    }

    try {
      // Create output file path
      val outputFile = createOutputFile(sessionId)

      // Create handler for limit events (suspend function)
      val onLimitReached: suspend (StopReason, String, String) -> Unit = { reason, sessionId, filePath ->
        // Clear session reference (stop() was already called by Session)
        currentSession = null
        emitStatusChanged(RecorderState.STOPPED, sessionId, filePath, reason)
      }
      
      // Create new recording session with handler
      val session = Session(
        sessionId = sessionId,
        outputFile = outputFile,
        keyManager = keyManager,
        audioRecorder = audioRecorder,
        audioConfig = audioConfig,
        onLimitReached = onLimitReached
      )

      // Start session
      val filePath = session.start(keyAlias)
      currentSession = session

      emitStatusChanged(RecorderState.RECORDING, sessionId, filePath)

      return filePath
    } catch (e: SecureRecorderException) {
      cleanupSession()
      throw e
    } catch (e: Exception) {
      cleanupSession()
      throw InitializationException("Failed to start recording: ${e.message}", e)
    }
  }

  private fun stop(): String {
    val session = currentSession ?: throw NoRecordingException()
    val sessionInfo = session.getInfo()

    try {
      val filePath = session.stop()
      currentSession = null

      emitStatusChanged(RecorderState.STOPPED, sessionInfo.sessionId, filePath, StopReason.USER_STOPPED)

      return filePath
    } catch (e: SecureRecorderException) {
      cleanupSession()
      throw e
    } catch (e: Exception) {
      cleanupSession()
      throw InitializationException("Failed to stop recording: ${e.message}", e)
    }
  }

  private fun pause(): String {
    if (!isRecording()) {
      throw NoRecordingException()
    }
    val session = currentSession!!
    val sessionInfo = session.getInfo()

    return try {
      val filePath = session.pause()
      emitStatusChanged(RecorderState.PAUSED, sessionInfo.sessionId, filePath)
      filePath
    } catch (e: SecureRecorderException) {
      throw e
    } catch (e: Exception) {
      throw InitializationException("Failed to pause recording: ${e.message}", e)
    }
  }

  private fun resume(): String {
    val session = currentSession ?: throw NoRecordingException()
    if (session.recordingTimer.isActive) {
      throw RecordingInProgressException()
    }
    val sessionInfo = session.getInfo()

    return try {
      val filePath = session.resume()
      emitStatusChanged(RecorderState.RECORDING, sessionInfo.sessionId, filePath)
      filePath
    } catch (e: SecureRecorderException) {
      throw e
    } catch (e: Exception) {
      throw InitializationException("Failed to resume recording: ${e.message}", e)
    }
  }

  private fun status(): Map<String, Any?> {
    val session = currentSession ?: return mapOf(
      "state" to RecorderState.INACTIVE.toJsString(),
      "sessionId" to null,
      "filePath" to null
    )

    val info = session.getInfo()
    // Session exists but not active = paused
    val isPaused = !info.isActive
    val state = RecorderState.fromState(isRecording = info.isActive, isPaused = isPaused, filePath = info.filePath)
    return mapOf(
      "state" to state.toJsString(),
      "sessionId" to info.sessionId,
      "filePath" to info.filePath
    )
  }

  private fun createOutputFile(sessionId: String): File {
    val filesDir = context.filesDir
    return File(filesDir, "$sessionId.dat")
  }

  /**
   * Stream decrypt encrypted audio file, emitting events for each chunk
   * 
   * MEMORY SAFE: Uses true streaming (FileInputStream) to read chunks incrementally.
   * Emits "onAudioChunkDecrypted" event for each decrypted chunk immediately,
   * then discards the data to prevent OOM on large files.
   * 
   * @throws SecureRecorderException if decryption fails
   */
  private fun stream(encryptedPath: String) {
    try {
      val encryptedFile = File(encryptedPath)
      
      // Validate encrypted file exists
      if (!encryptedFile.exists()) {
        throw InitializationException("Encrypted file not found: $encryptedPath")
      }
      
      // Get encryption key
      val secretKey = keyManager.getOrCreateKey(keyAlias)
      
      // Stream decrypt and emit events
      val streamManager = StreamDecryptionManager(secretKey, encryptedFile)
      
      streamManager.stream { data, index, isLast ->
        // Emit event immediately - Expo SDK 54 converts ByteArray → Uint8Array automatically
        val eventData = mapOf(
          "data" to data,
          "index" to index,
          "isLast" to isLast
        )
        sendEvent("onAudioChunkDecrypted", eventData)
        
        // Data is automatically discarded after this scope
      }
      
      // Paranoid Self-Destruct: Secure Data Shredding (Overwrite + Delete)
      // Only in success path - if streaming fails, file remains for retry
      // Silently ignore deletion errors (e.g. permission issues) since streaming succeeded
      try {
        FileShredder.shred(encryptedFile)
      } catch (e: Exception) {
        // Ignore deletion/overwrite errors - streaming succeeded, that's what matters
      }
    } catch (e: SecureRecorderException) {
      throw e
    } catch (e: Exception) {
      throw InitializationException("Failed to decrypt audio: ${e.message}", e)
    }
  }

  /**
   * Check if RECORD_AUDIO permission is granted
   * Note: Permission requests are handled via expo-audio in JavaScript
   */
  private fun hasPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED
  }
}
