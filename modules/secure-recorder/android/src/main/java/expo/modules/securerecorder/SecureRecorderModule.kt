package expo.modules.securerecorder

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import java.io.File
import android.media.AudioRecord

/**
 * Main SecureRecorder Expo module
 * Orchestrates audio recording with streaming encryption
 */
class SecureRecorderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("ReactContext not available")

  // Dependencies (DIP)
  private val audioConfig: AudioConfig = DefaultAudioConfig()
  private val keyManager: KeyManager = AndroidKeyStoreManager(context)
  private val permissionManager: PermissionManager = AndroidPermissionManager(context)
  private val audioRecorder: AudioRecorder = AndroidAudioRecorder()

  // Recording state
  @Volatile
  private var recordingState: RecordingState = RecordingState.IDLE
  private var recordingJob: Job? = null
  private var encryptionStream: EncryptionStreamManager? = null
  private var currentAudioRecord: AudioRecord? = null

  // Coroutine scope for recording operations
  private val recordingScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  // KeyStore alias
  private val keyAlias = "secure_recorder_key"

  override fun definition() = ModuleDefinition {
    Name("SecureRecorder")

    AsyncFunction("startRecording") { sessionId: String ->
      startRecordingInternal(sessionId)
    }

    AsyncFunction("stopRecording") {
      stopRecordingInternal()
    }

    AsyncFunction("getStatus") {
      getStatusInternal()
    }

    AsyncFunction("hasPermission") {
      permissionManager.has()
    }

    AsyncFunction("requestPermission") {
      kotlinx.coroutines.runBlocking {
        permissionManager.request()
      }
    }
  }

  private fun startRecordingInternal(sessionId: String): String {
    // Validate session ID
    if (sessionId.isBlank()) {
      throw SecureRecorderException.InitializationException("Session ID cannot be empty")
    }

    // Check if already recording (thread-safe)
    synchronized(this) {
      if (recordingState.isRecording) {
        throw SecureRecorderException.RecordingInProgressException()
      }

      // Check permission
      if (!permissionManager.has()) {
        throw SecureRecorderException.PermissionDeniedException()
      }

      try {
        // Get encryption key
        val secretKey = keyManager.getOrCreateKey(keyAlias)

        // Create output file
        val filesDir = context.filesDir
        val encryptedFile = File(filesDir, "$sessionId.dat")

        // Initialize encryption stream
        encryptionStream = EncryptionStreamManager(secretKey, encryptedFile)
        encryptionStream!!.initialize()

        // Start audio recording
        val audioRecord = audioRecorder.start(audioConfig)
        audioRecord.startRecording()
        currentAudioRecord = audioRecord

        // Update state
        recordingState = RecordingState(true, sessionId, encryptedFile.absolutePath)

        // Start recording coroutine
        recordingJob = recordingScope.launch {
          recordAudioData(audioRecord)
        }

        return encryptedFile.absolutePath
      } catch (e: SecureRecorderException) {
        cleanup()
        throw e
      } catch (e: Exception) {
        cleanup()
        throw SecureRecorderException.InitializationException("Failed to start recording: ${e.message}", e)
      }
    }
  }

  private suspend fun recordAudioData(audioRecord: AudioRecord) {
    val buffer = ByteArray(audioConfig.bufferSize)
    val stream = encryptionStream ?: return

    try {
      while (currentCoroutineContext().isActive && recordingState.isRecording) {
        val bytesRead = audioRecord.read(buffer, 0, buffer.size)
        if (bytesRead > 0) {
          stream.write(buffer, 0, bytesRead)
        } else if (bytesRead < 0) {
          // Error reading audio
          break
        }
      }
    } catch (e: Exception) {
      // Log error but don't throw - cleanup will handle it
    }
  }

  private fun stopRecordingInternal(): String {
    synchronized(this) {
      if (!recordingState.isRecording) {
        throw SecureRecorderException.NoRecordingException()
      }

      try {
        // Cancel recording job
        recordingJob?.cancel()
        recordingJob = null

        // Stop audio recording
        currentAudioRecord?.let { audioRecorder.stop(it) }
        currentAudioRecord = null

        // Finalize encryption (writes authentication tag)
        encryptionStream?.finalize()
        
        // Close encryption stream
        encryptionStream?.close()
        encryptionStream = null

        val filePath = recordingState.filePath ?: throw SecureRecorderException.NoRecordingException()
        val sessionId = recordingState.sessionId

        // Reset state
        recordingState = RecordingState.IDLE

        return filePath
      } catch (e: SecureRecorderException) {
        cleanup()
        throw e
      } catch (e: Exception) {
        cleanup()
        throw SecureRecorderException.InitializationException("Failed to stop recording: ${e.message}", e)
      }
    }
  }

  private fun getStatusInternal(): Map<String, Any?> {
    val state = recordingState
    return mapOf(
      "isRecording" to state.isRecording,
      "sessionId" to state.sessionId,
      "filePath" to state.filePath
    )
  }

  private fun cleanup() {
    synchronized(this) {
      try {
        recordingJob?.cancel()
        recordingJob = null
      } catch (e: Exception) {
        // Ignore
      }

      try {
        currentAudioRecord?.let { audioRecorder.stop(it) }
        currentAudioRecord = null
      } catch (e: Exception) {
        // Ignore
      }

      try {
        encryptionStream?.close()
        encryptionStream = null
      } catch (e: Exception) {
        // Ignore
      }

      recordingState = RecordingState.IDLE
    }
  }
}
