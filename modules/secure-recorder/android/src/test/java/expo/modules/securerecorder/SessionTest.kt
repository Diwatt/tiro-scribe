package expo.modules.securerecorder

import android.media.AudioRecord
import expo.modules.securerecorder.exception.InitializationException
import expo.modules.securerecorder.exception.KeyStoreException
import expo.modules.securerecorder.exception.NoRecordingException
import expo.modules.securerecorder.exception.RecordingInProgressException
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.isActive
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Unit tests for Session.
 *
 * AudioRecorder is built for real with an injected AudioRecord factory (like production),
 * the EncryptionStream is injected as EncryptionStreamInterface, and the recording scope
 * is injected so coroutine lifecycle is directly assertable. No reflection is used.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SessionTest {

  private lateinit var mockKeyManager: KeyManagerInterface
  private lateinit var mockEncryptionStream: EncryptionStreamInterface
  private lateinit var mockAudioRecord: AudioRecord
  private lateinit var audioRecorder: AudioRecorder
  private lateinit var audioConfig: AudioConfig
  private lateinit var mockLimiter: LimitRegistryInterface
  private lateinit var outputFile: File
  private lateinit var testKey: SecretKey
  private var audioRecordFactoryCallCount = 0
  private var limitReachedReason: StopReason? = null
  private var limitReachedSessionId: String? = null
  private var limitReachedFilePath: String? = null
  private val createdSessions = mutableListOf<Session>()

  @Before
  fun setup() {
    val keyGenerator = KeyGenerator.getInstance("AES")
    keyGenerator.init(256)
    testKey = keyGenerator.generateKey()

    outputFile = File(System.getProperty("java.io.tmpdir"), "test_session_${System.currentTimeMillis()}.dat")

    mockKeyManager = mockk {
      every { getOrCreateKey(any<String>()) } returns testKey
    }
    mockEncryptionStream = mockk(relaxed = true)
    mockLimiter = mockk {
      every { getLimits() } returns emptyList()
    }
    mockAudioRecord = mockk(relaxed = true) {
      every { state } returns AudioRecord.STATE_INITIALIZED
      // SAFETY: emulate a blocking AudioRecord.read so the pipeline loop parks instead of spinning
      every { read(any<ByteArray>(), any<Int>(), any<Int>()) } answers { Thread.sleep(20); 0 }
    }
    audioConfig = AudioConfig()
    audioRecordFactoryCallCount = 0
    audioRecorder = AudioRecorder(audioConfig) { _ ->
      audioRecordFactoryCallCount++
      mockAudioRecord
    }
    limitReachedReason = null
    limitReachedSessionId = null
    limitReachedFilePath = null
  }

  @After
  fun tearDown() {
    createdSessions.forEach { session ->
      runCatching { session.cleanup() }
    }
    createdSessions.clear()
    if (outputFile.exists()) {
      outputFile.delete()
    }
  }

  // MARK: - Operations before start

  @Test
  fun `stop on a never started session returns the file path without touching audio or encryption`() {
    val session = createSession()

    val filePath = session.stop()

    assertEquals(outputFile.absolutePath, filePath)
    verify(exactly = 0) { mockAudioRecord.state }
    verify(exactly = 0) { mockEncryptionStream.close() }
    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `pause on a never started session throws NoRecordingException`() {
    val session = createSession()

    val exception = assertThrows(NoRecordingException::class.java) { session.pause() }

    assertEquals("No recording in progress", exception.message)
  }

  @Test
  fun `resume on a never started session throws InitializationException mentioning the missing stream`() {
    val session = createSession()

    val exception = assertThrows(InitializationException::class.java) { session.resume() }

    assertEquals("No encryption stream to resume", exception.message)
  }

  @Test
  fun `cleanup on a never started session cancels the recording scope and deactivates the timer`() {
    val recordingScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val session = createSession(recordingScope = recordingScope)

    session.cleanup()

    assertFalse("Recording scope should be cancelled by cleanup", recordingScope.isActive)
    assertFalse(session.recordingTimer.isActive)
  }

  // MARK: - Start

  @Test
  fun `start returns the output file path`() {
    val session = createSession()

    val filePath = session.start("test-alias")

    assertEquals(outputFile.absolutePath, filePath)
  }

  @Test
  fun `start requests the encryption key with the provided alias`() {
    val session = createSession()

    session.start("test-alias")

    verify(exactly = 1) { mockKeyManager.getOrCreateKey("test-alias") }
  }

  @Test
  fun `start initializes the encryption stream`() {
    val session = createSession()

    session.start("test-alias")

    verify(exactly = 1) { mockEncryptionStream.initialize() }
  }

  @Test
  fun `start creates the audio record through the factory and starts recording`() {
    val session = createSession()

    session.start("test-alias")

    assertEquals(1, audioRecordFactoryCallCount)
    verify(exactly = 1) { mockAudioRecord.startRecording() }
  }

  @Test
  fun `start activates the recording timer and launches the recording job`() {
    val session = createSession()

    session.start("test-alias")

    assertTrue(session.recordingTimer.isActive)
    val job: Job? = session.recordingJob
    assertNotNull("Recording job should be launched into the recording scope", job)
    assertTrue(job!!.isActive)
  }

  @Test
  fun `start deletes stale output content before initializing encryption`() {
    outputFile.writeBytes(ByteArray(512) { 0xFF.toByte() })
    val session = createSession(
      encryptionStreamFactory = { secretKey, file -> EncryptionStream(secretKey, file) }
    )

    session.start("test-alias")

    assertEquals("Stale content should be deleted on a fresh start", 0L, outputFile.length())
  }

  @Test
  fun `start propagates KeyStoreException when key creation fails`() {
    every { mockKeyManager.getOrCreateKey(any<String>()) } throws KeyStoreException("keystore failure")
    val session = createSession()

    val exception = assertThrows(KeyStoreException::class.java) { session.start("test-alias") }

    assertEquals("keystore failure", exception.message)
    assertFalse(session.recordingTimer.isActive)
    assertNull(session.recordingJob)
  }

  @Test
  fun `start propagates InitializationException when the audio record fails validation`() {
    every { mockAudioRecord.state } returns AudioRecord.STATE_UNINITIALIZED
    val session = createSession()

    val exception = assertThrows(InitializationException::class.java) { session.start("test-alias") }

    assertEquals("AudioRecord initialization failed", exception.message)
    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `start propagates when the audio record fails to start recording`() {
    every { mockAudioRecord.startRecording() } throws IllegalStateException("Start failed")
    val session = createSession()

    assertThrows(IllegalStateException::class.java) { session.start("test-alias") }

    assertFalse(session.recordingTimer.isActive)
    assertNull(session.recordingJob)
  }

  @Test
  fun `start propagates when the encryption stream fails to initialize`() {
    every { mockEncryptionStream.initialize() } throws IllegalStateException("stream not available")
    val session = createSession()

    val exception = assertThrows(IllegalStateException::class.java) { session.start("test-alias") }

    assertEquals("stream not available", exception.message)
    assertFalse(session.recordingTimer.isActive)
    assertNull(session.recordingJob)
  }

  @Test
  fun `start across stop cycles requests a fresh key each time`() {
    val session = createSession()

    session.start("test-alias")
    session.stop()
    session.start("test-alias")

    verify(exactly = 2) { mockKeyManager.getOrCreateKey("test-alias") }
  }

  // MARK: - Stop

  @Test
  fun `stop returns the output file path`() {
    val session = createSession()
    session.start("test-alias")

    val filePath = session.stop()

    assertEquals(outputFile.absolutePath, filePath)
  }

  @Test
  fun `stop closes the encryption stream`() {
    val session = createSession()
    session.start("test-alias")

    session.stop()

    verify(exactly = 1) { mockEncryptionStream.close() }
  }

  @Test
  fun `stop releases the audio record`() {
    val session = createSession()
    session.start("test-alias")

    session.stop()

    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `stop stops the audio record when it is still recording`() {
    every { mockAudioRecord.recordingState } returns AudioRecord.RECORDSTATE_RECORDING
    val session = createSession()
    session.start("test-alias")

    session.stop()

    verify(exactly = 1) { mockAudioRecord.stop() }
    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `stop cancels the recording job`() {
    val session = createSession()
    session.start("test-alias")
    val job = session.recordingJob

    session.stop()

    assertNotNull(job)
    assertTrue("Recording job should be cancelled by stop", job!!.isCancelled)
    assertNull(session.recordingJob)
  }

  @Test
  fun `stop deactivates the recording timer`() {
    val session = createSession()
    session.start("test-alias")
    assertTrue(session.recordingTimer.isActive)

    session.stop()

    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `stop is safe to call twice`() {
    val session = createSession()
    session.start("test-alias")
    session.stop()

    val filePath = session.stop()

    assertEquals(outputFile.absolutePath, filePath)
    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `stop on a paused session closes the stream and returns the file path`() {
    val session = createSession()
    session.start("test-alias")
    session.pause()

    val filePath = session.stop()

    assertEquals(outputFile.absolutePath, filePath)
    verify(exactly = 1) { mockEncryptionStream.close() }
    verify(exactly = 1) { mockEncryptionStream.flush() }
  }

  @Test
  fun `stop propagates the failure and leaves the timer active when closing the stream fails`() {
    val session = createSession()
    session.start("test-alias")
    every { mockEncryptionStream.close() } throws IllegalStateException("close failed")

    val exception = assertThrows(IllegalStateException::class.java) { session.stop() }

    assertEquals("close failed", exception.message)
    assertTrue("Timer should stay active because stop failed before deactivating", session.recordingTimer.isActive)
  }

  // MARK: - Pause

  @Test
  fun `pause flushes the encryption stream and keeps it open`() {
    val session = createSession()
    session.start("test-alias")

    val filePath = session.pause()

    assertEquals(outputFile.absolutePath, filePath)
    verify(exactly = 1) { mockEncryptionStream.flush() }
    verify(exactly = 0) { mockEncryptionStream.close() }
  }

  @Test
  fun `pause stops and releases the audio record`() {
    val session = createSession()
    session.start("test-alias")

    session.pause()

    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `pause cancels the recording job`() {
    val session = createSession()
    session.start("test-alias")
    val job = session.recordingJob

    session.pause()

    assertNotNull(job)
    assertTrue("Recording job should be cancelled by pause", job!!.isCancelled)
    assertNull(session.recordingJob)
  }

  @Test
  fun `pause deactivates the recording timer`() {
    val session = createSession()
    session.start("test-alias")
    assertTrue(session.recordingTimer.isActive)

    session.pause()

    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `pause on an already paused session throws NoRecordingException`() {
    val session = createSession()
    session.start("test-alias")
    session.pause()

    val exception = assertThrows(NoRecordingException::class.java) { session.pause() }

    assertEquals("No recording in progress", exception.message)
  }

  // MARK: - Resume

  @Test
  fun `resume restarts audio capture on the same encryption stream without re-initializing it`() {
    val session = createSession()
    session.start("test-alias")
    session.pause()
    val factoryCallsBeforeResume = audioRecordFactoryCallCount

    val filePath = session.resume()

    assertEquals(outputFile.absolutePath, filePath)
    assertEquals(factoryCallsBeforeResume + 1, audioRecordFactoryCallCount)
    verify(exactly = 1) { mockEncryptionStream.initialize() }
    assertTrue(session.recordingTimer.isActive)
  }

  @Test
  fun `resume creates a new recording job`() {
    val session = createSession()
    session.start("test-alias")
    session.pause()
    assertNull(session.recordingJob)

    session.resume()

    assertNotNull(session.recordingJob)
  }

  @Test
  fun `resume throws RecordingInProgressException while the timer is active`() {
    val session = createSession()
    session.start("test-alias")

    val exception = assertThrows(RecordingInProgressException::class.java) { session.resume() }

    assertEquals("Recording already in progress", exception.message)
  }

  // MARK: - Cleanup

  @Test
  fun `cleanup releases the audio record and closes the encryption stream`() {
    val session = createSession()
    session.start("test-alias")

    session.cleanup()

    verify(exactly = 1) { mockAudioRecord.release() }
    verify(exactly = 1) { mockEncryptionStream.close() }
  }

  @Test
  fun `cleanup cancels the recording job and the recording scope`() {
    val recordingScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val session = createSession(recordingScope = recordingScope)
    session.start("test-alias")
    val job = session.recordingJob

    session.cleanup()

    assertNotNull(job)
    assertTrue(job!!.isCancelled)
    assertFalse("Recording scope should be cancelled by cleanup", recordingScope.isActive)
  }

  @Test
  fun `cleanup deactivates the recording timer`() {
    val session = createSession()
    session.start("test-alias")

    session.cleanup()

    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `cleanup is safe to call twice`() {
    val session = createSession()
    session.start("test-alias")

    session.cleanup()
    session.cleanup()

    assertFalse(session.recordingTimer.isActive)
  }

  @Test
  fun `cleanup deactivates the timer even when releasing audio fails`() {
    every { mockAudioRecord.release() } throws IllegalStateException("release failed")
    val session = createSession()
    session.start("test-alias")

    session.cleanup()

    assertFalse("Timer should be deactivated even when cleanup steps fail", session.recordingTimer.isActive)
  }

  // MARK: - GetInfo

  @Test
  fun `getInfo reports session id, file path and inactive flag before start`() {
    val session = createSession()

    val info = session.getInfo()

    assertEquals("test-session", info.sessionId)
    assertEquals(outputFile.absolutePath, info.filePath)
    assertFalse(info.isActive)
  }

  @Test
  fun `getInfo reports the session as active while recording`() {
    val session = createSession()
    session.start("test-alias")

    val info = session.getInfo()

    assertTrue(info.isActive)
  }

  @Test
  fun `getInfo reports the session as inactive while paused`() {
    val session = createSession()
    session.start("test-alias")
    session.pause()

    val info = session.getInfo()

    assertFalse(info.isActive)
    assertEquals("test-session", info.sessionId)
    assertEquals(outputFile.absolutePath, info.filePath)
  }

  // MARK: - Limit and error wiring

  @Test
  fun `onLimitReached stops the session and notifies the module callback with the stop reason`() = runBlocking {
    val session = createSession(onLimitReached = { reason, sessionId, filePath ->
      limitReachedReason = reason
      limitReachedSessionId = sessionId
      limitReachedFilePath = filePath
    })
    session.start("test-alias")

    session.eventHandler.onLimitReached(StopReason.DURATION_LIMIT)

    assertFalse("Session should be stopped by the limit handler", session.recordingTimer.isActive)
    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
    assertEquals("test-session", limitReachedSessionId)
    assertEquals(outputFile.absolutePath, limitReachedFilePath)
  }

  @Test
  fun `onLimitReached stops the session when no module callback is registered`() = runBlocking {
    val session = createSession(onLimitReached = null)
    session.start("test-alias")

    session.eventHandler.onLimitReached(StopReason.FILE_SIZE_LIMIT)

    assertFalse("Session should be stopped by the limit handler", session.recordingTimer.isActive)
  }

  @Test
  fun `onError deactivates the recording timer`() {
    val session = createSession()
    session.start("test-alias")

    session.eventHandler.onError("Test error message")

    assertFalse(session.recordingTimer.isActive)
  }

  // MARK: - Helpers

  private fun createSession(
    onLimitReached: (suspend (StopReason, String, String) -> Unit)? = null,
    encryptionStreamFactory: (SecretKey, File) -> EncryptionStreamInterface = { _, _ -> mockEncryptionStream },
    recordingScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  ): Session {
    val session = Session(
      sessionId = "test-session",
      outputFile = outputFile,
      keyManager = mockKeyManager,
      audioRecorder = audioRecorder,
      audioConfig = audioConfig,
      limiter = mockLimiter,
      onLimitReached = onLimitReached,
      recordingScope = recordingScope,
      encryptionStreamFactory = encryptionStreamFactory
    )
    createdSessions.add(session)
    return session
  }
}
