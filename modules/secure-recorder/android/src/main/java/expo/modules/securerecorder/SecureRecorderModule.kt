package expo.modules.securerecorder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.securerecorder.exception.*
import java.io.File
import java.io.FileInputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

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
class SecureRecorderModule(
  // SAFETY: test seam - production resolves the react context from appContext (Expo)
  private val injectedContext: Context? = null,
  internal val keyManagerFactory: (Context) -> KeyManagerInterface = { context -> KeyManager(context) },
  internal val audioRecorderFactory: (AudioConfig) -> AudioRecorder = { audioConfig -> AudioRecorder(audioConfig) },
  internal val audioConfigFactory: () -> AudioConfig = { AudioConfig() },
  internal val sessionFactory: SessionFactory = SessionFactory { sessionId, outputFile, keyManager, audioRecorder, audioConfig, onLimitReached ->
    Session(
      sessionId = sessionId,
      outputFile = outputFile,
      keyManager = keyManager,
      audioRecorder = audioRecorder,
      audioConfig = audioConfig,
      onLimitReached = onLimitReached
    )
  }
) : Module() {
  private val context: Context
    get() = injectedContext
      ?: (appContext.reactContext ?: throw IllegalStateException("ReactContext not available"))
  private val audioConfig: AudioConfig by lazy { audioConfigFactory() }
  private val keyManager: KeyManagerInterface by lazy { keyManagerFactory(context) }
  private val audioRecorder: AudioRecorder by lazy { audioRecorderFactory(audioConfig) }
  private var currentSession: SessionInterface? = null
  private val keyAlias = "secure_recorder_key"
  private val decryptedStreamReaders = ConcurrentHashMap<String, StreamDecryptionManager>()

  override fun definition() = ModuleDefinition {
    Name("SecureRecorder")

    Events("onRecordingStatusChanged")

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

    AsyncFunction("openDecryptedStream") { encryptedPath: String ->
      openDecryptedStream(encryptedPath)
    }

    AsyncFunction("readNextChunk") { readerId: String ->
      readNextChunk(readerId)
    }

    AsyncFunction("closeDecryptedStream") { readerId: String ->
      closeDecryptedStream(readerId)
    }

    AsyncFunction("encryptFile") { inputPath: String, outputPath: String ->
      encryptFile(inputPath, outputPath)
    }

    AsyncFunction("encryptBytes") { data: ByteArray, outputPath: String ->
      encryptBytes(data, outputPath)
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

  internal fun start(sessionId: String): String {
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
      val session = sessionFactory.create(
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

  internal fun stop(): String {
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

  internal fun pause(): String {
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

  internal fun resume(): String {
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

  internal fun status(): Map<String, Any?> {
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

  internal fun createOutputFile(sessionId: String): File {
    val filesDir = context.filesDir
    return File(filesDir, "$sessionId.dat")
  }

  /**
   * Opens a pull reader on an encrypted audio file: readNextChunk() returns
   * each decrypted block in stream order until the reader is exhausted.
   */
  private fun openDecryptedStream(encryptedPath: String): String {
    val encryptedFile = File(encryptedPath)
    if (!encryptedFile.exists()) {
      throw InitializationException("Encrypted file not found: $encryptedPath")
    }

    val secretKey = keyManager.getOrCreateKey(keyAlias)
    val readerId = UUID.randomUUID().toString()
    decryptedStreamReaders[readerId] = StreamDecryptionManager(secretKey, encryptedFile)

    return readerId
  }

  /**
   * Decrypts and returns the next block for the reader.
   * The last data block carries isLast=true; the call after it returns an
   * empty block with isLast=true and closes the reader.
   */
  private fun readNextChunk(readerId: String): Map<String, Any?> {
    val streamManager = decryptedStreamReaders[readerId]
      ?: throw IllegalStateException("Unknown decrypted stream reader: $readerId")

    val chunk = streamManager.readNext()
    if (chunk == null) {
      decryptedStreamReaders.remove(readerId)

      return mapOf(
        "data" to ByteArray(0),
        "isLast" to true
      )
    }

    if (chunk.isLast) {
      decryptedStreamReaders.remove(readerId)
    }

    return mapOf(
      "data" to chunk.data,
      "isLast" to chunk.isLast
    )
  }

  /**
   * Releases the native reader early when the consumer abandons mid-stream.
   */
  private fun closeDecryptedStream(readerId: String) {
    decryptedStreamReaders.remove(readerId)?.close()
  }

  /**
   * Encrypt an existing file using the same AES-256-GCM key used for recording.
   *
   * Reads the input file in chunks and writes encrypted chunks to the output path.
   *
   * @param inputPath Absolute path to the plaintext file
   * @param outputPath Absolute path where the encrypted file will be written
   * @return The output path
   * @throws InitializationException if input file is missing or encryption fails
   */
  internal fun encryptFile(inputPath: String, outputPath: String): String {
    val inputFile = File(inputPath)

    if (!inputFile.exists()) {
      throw InitializationException("Input file not found: $inputPath")
    }

    try {
      val secretKey = keyManager.getOrCreateKey(keyAlias)
      val outputFile = File(outputPath)
      val encryptionStream = EncryptionStream(secretKey, outputFile)

      encryptionStream.initialize()

      FileInputStream(inputFile).use { inputStream ->
        val buffer = ByteArray(16384)
        var bytesRead: Int

        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
          if (bytesRead == buffer.size) {
            encryptionStream.write(buffer)
          } else {
            encryptionStream.write(buffer.copyOfRange(0, bytesRead))
          }
        }
      }

      encryptionStream.close()

      return outputPath
    } catch (e: SecureRecorderException) {
      throw e
    } catch (e: Exception) {
      throw InitializationException("Failed to encrypt file: ${e.message}", e)
    }
  }

  /**
   * Encrypt a byte array using the same AES-256-GCM key and chunk format
   * used by the recording pipeline.
   *
   * @param data Raw bytes to encrypt
   * @param outputPath Absolute path where the encrypted file will be written
   * @return The output path
   * @throws InitializationException if encryption fails
   */
  internal fun encryptBytes(data: ByteArray, outputPath: String): String {
    try {
      val secretKey = keyManager.getOrCreateKey(keyAlias)
      val outputFile = File(outputPath)
      val encryptionStream = EncryptionStream(secretKey, outputFile)

      encryptionStream.initialize()

      val chunkSize = 16384
      var offset = 0
      while (offset < data.size) {
        val end = minOf(offset + chunkSize, data.size)
        encryptionStream.write(data.copyOfRange(offset, end))
        offset = end
      }

      encryptionStream.close()

      return outputPath
    } catch (e: SecureRecorderException) {
      throw e
    } catch (e: Exception) {
      throw InitializationException("Failed to encrypt bytes: ${e.message}", e)
    }
  }

  /**
   * Check if RECORD_AUDIO permission is granted
   * Note: Permission requests are handled via expo-audio in JavaScript
   */
  internal fun hasPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED
  }
}
