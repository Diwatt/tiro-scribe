package expo.modules.securerecorder

import android.Manifest
import android.app.Application
import android.content.Context
import expo.modules.securerecorder.exception.InitializationException
import expo.modules.securerecorder.exception.KeyStoreException
import expo.modules.securerecorder.exception.NoRecordingException
import expo.modules.securerecorder.exception.PermissionDeniedException
import expo.modules.securerecorder.exception.RecordingInProgressException
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.File
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Unit tests for SecureRecorderModule.
 *
 * Sessions are injected through SessionFactory so every start/stop/pause/resume/status
 * path is asserted against a SessionInterface test double. Crypto and file shredding
 * paths run against real EncryptionStream/StreamDecryptionManager/FileShredder code.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SecureRecorderModuleTest {

  private lateinit var mockSessionFactory: SessionFactory
  private lateinit var mockSession: SessionInterface
  private lateinit var mockSessionTimer: RecordingTimer
  private lateinit var mockKeyManager: KeyManagerInterface
  private lateinit var testKey: SecretKey
  private lateinit var module: SecureRecorderModule
  private val emittedEvents = mutableListOf<Pair<String, Map<String, Any?>>>()

  private val androidContext: Context
    get() = RuntimeEnvironment.getApplication()

  @Before
  fun setup() {
    val keyGenerator = KeyGenerator.getInstance("AES")
    keyGenerator.init(256)
    testKey = keyGenerator.generateKey()

    shadowOf(androidContext as Application).grantPermissions(Manifest.permission.RECORD_AUDIO)

    mockSessionTimer = RecordingTimer()
    mockSession = mockk(relaxed = true) {
      every { recordingTimer } returns mockSessionTimer
    }
    mockKeyManager = mockk {
      every { getOrCreateKey(any()) } returns testKey
    }
    mockSessionFactory = mockk {
      every { create(any(), any(), any(), any(), any(), any()) } returns mockSession
    }

    module = spyk(
      SecureRecorderModule(
        injectedContext = androidContext,
        keyManagerFactory = { mockKeyManager },
        audioConfigFactory = { AudioConfig() },
        audioRecorderFactory = { audioConfig -> AudioRecorder(audioConfig) },
        sessionFactory = mockSessionFactory
      )
    ) {
      every { sendEvent(any<String>(), any<Map<String, Any?>>()) } answers {
        emittedEvents.add(firstArg<String>() to secondArg<Map<String, Any?>>())
      }
    }

    emittedEvents.clear()
  }

  // MARK: - Start

  @Test
  fun `start throws InitializationException when sessionId is empty`() {
    val exception = assertThrows(InitializationException::class.java) { module.start("") }

    assertEquals("Session ID cannot be empty", exception.message)
    verify(exactly = 0) { mockSessionFactory.create(any(), any(), any(), any(), any(), any()) }
  }

  @Test
  fun `start throws InitializationException when sessionId is blank`() {
    val exception = assertThrows(InitializationException::class.java) { module.start("   ") }

    assertEquals("Session ID cannot be empty", exception.message)
    verify(exactly = 0) { mockSessionFactory.create(any(), any(), any(), any(), any(), any()) }
  }

  @Test
  fun `start throws RecordingInProgressException when a recording is already active`() {
    startModuleSession()

    val exception = assertThrows(RecordingInProgressException::class.java) { module.start("second") }

    assertEquals("Recording already in progress", exception.message)
    verify(exactly = 1) { mockSessionFactory.create(any(), any(), any(), any(), any(), any()) }
  }

  @Test
  fun `start throws PermissionDeniedException when microphone permission is denied`() {
    shadowOf(androidContext as Application).denyPermissions(Manifest.permission.RECORD_AUDIO)

    val exception = assertThrows(PermissionDeniedException::class.java) { module.start("session-1") }

    assertEquals("Microphone permission not granted", exception.message)
    verify(exactly = 0) { mockSessionFactory.create(any(), any(), any(), any(), any(), any()) }
  }

  @Test
  fun `start creates the output file with the sessionId and the dat extension`() {
    val outputFileSlot = slot<File>()
    every { mockSessionFactory.create(any(), capture(outputFileSlot), any(), any(), any(), any()) } returns mockSession
    every { mockSession.start(any()) } returns "/data/out.dat"

    module.start("session-1")

    assertEquals("session-1.dat", outputFileSlot.captured.name)
    assertEquals(androidContext.filesDir, outputFileSlot.captured.parentFile)
  }

  @Test
  fun `start starts the created session with the module key alias and returns its file path`() {
    every { mockSession.start(any()) } returns "/data/out.dat"

    val filePath = module.start("session-1")

    assertEquals("/data/out.dat", filePath)
    verify(exactly = 1) { mockSession.start("secure_recorder_key") }
  }

  @Test
  fun `start wires its key manager into the created session`() {
    val keyManagerSlot = slot<KeyManagerInterface>()
    every { mockSessionFactory.create(any(), any(), capture(keyManagerSlot), any(), any(), any()) } returns mockSession
    every { mockSession.start(any()) } returns "/data/out.dat"

    module.start("session-1")

    assertSame(mockKeyManager, keyManagerSlot.captured)
  }

  @Test
  fun `start emits a recording status event with sessionId and filePath`() {
    every { mockSession.start(any()) } returns "/data/out.dat"

    module.start("session-1")

    assertEquals(1, emittedEvents.size)
    val event = emittedEvents.first()
    assertEquals("onRecordingStatusChanged", event.first)
    assertEquals("recording", event.second["state"])
    assertEquals("session-1", event.second["sessionId"])
    assertEquals("/data/out.dat", event.second["filePath"])
    assertFalse(event.second.containsKey("reason"))
  }

  @Test
  fun `start resets the module to idle when the session fails to start with a SecureRecorderException`() {
    every { mockSession.start(any()) } throws KeyStoreException("keystore failure")

    assertThrows(KeyStoreException::class.java) { module.start("session-1") }

    assertEquals("inactive", module.status()["state"])
  }

  @Test
  fun `start wraps an unexpected session failure in InitializationException`() {
    every { mockSession.start(any()) } throws RuntimeException("disk on fire")

    val exception = assertThrows(InitializationException::class.java) { module.start("session-1") }

    assertEquals("Failed to start recording: disk on fire", exception.message)
  }

  @Test
  fun `start can begin a new session after the previous one was stopped`() {
    startModuleSession()
    module.stop()
    mockSessionTimer.deactivate()
    every { mockSession.start(any()) } returns "/data/out.dat"

    val filePath = module.start("session-1")

    assertEquals("/data/out.dat", filePath)
    verify(exactly = 2) { mockSessionFactory.create(any(), any(), any(), any(), any(), any()) }
  }

  // MARK: - Stop

  @Test
  fun `stop throws NoRecordingException when no session exists`() {
    val exception = assertThrows(NoRecordingException::class.java) { module.stop() }

    assertEquals("No recording in progress", exception.message)
  }

  @Test
  fun `stop returns the file path and emits a stopped event with the user_stopped reason`() {
    startModuleSession()
    emittedEvents.clear()

    val filePath = module.stop()

    assertEquals("/data/out.dat", filePath)
    assertEquals(1, emittedEvents.size)
    val event = emittedEvents.first()
    assertEquals("onRecordingStatusChanged", event.first)
    assertEquals("stopped", event.second["state"])
    assertEquals("user_stopped", event.second["reason"])
    assertEquals("session-1", event.second["sessionId"])
    verify(exactly = 1) { mockSession.stop() }
  }

  @Test
  fun `stop clears the current session so status becomes inactive`() {
    startModuleSession()

    module.stop()

    val status = module.status()
    assertEquals("inactive", status["state"])
    assertNull(status["sessionId"])
    assertNull(status["filePath"])
  }

  @Test
  fun `stop cleans up the session and rethrows when stopping fails`() {
    startModuleSession()
    every { mockSession.stop() } throws InitializationException("close failed")

    assertThrows(InitializationException::class.java) { module.stop() }

    verify(exactly = 1) { mockSession.cleanup() }
  }

  // MARK: - Pause

  @Test
  fun `pause throws NoRecordingException when no session exists`() {
    val exception = assertThrows(NoRecordingException::class.java) { module.pause() }

    assertEquals("No recording in progress", exception.message)
  }

  @Test
  fun `pause throws NoRecordingException when the session is not active`() {
    startModuleSession(paused = true)

    val exception = assertThrows(NoRecordingException::class.java) { module.pause() }

    assertEquals("No recording in progress", exception.message)
    verify(exactly = 0) { mockSession.pause() }
  }

  @Test
  fun `pause returns the file path and emits a paused event`() {
    startModuleSession()
    every { mockSession.pause() } returns "/data/out.dat"
    emittedEvents.clear()

    val filePath = module.pause()

    assertEquals("/data/out.dat", filePath)
    assertEquals(1, emittedEvents.size)
    val event = emittedEvents.first()
    assertEquals("paused", event.second["state"])
    assertEquals("session-1", event.second["sessionId"])
    assertEquals("/data/out.dat", event.second["filePath"])
    assertFalse(event.second.containsKey("reason"))
  }

  // MARK: - Resume

  @Test
  fun `resume throws NoRecordingException when no session exists`() {
    val exception = assertThrows(NoRecordingException::class.java) { module.resume() }

    assertEquals("No recording in progress", exception.message)
  }

  @Test
  fun `resume throws RecordingInProgressException when the session is already active`() {
    startModuleSession()

    val exception = assertThrows(RecordingInProgressException::class.java) { module.resume() }

    assertEquals("Recording already in progress", exception.message)
    verify(exactly = 0) { mockSession.resume() }
  }

  @Test
  fun `resume returns the file path and emits a recording event`() {
    startModuleSession(paused = true)
    every { mockSession.resume() } returns "/data/out.dat"
    emittedEvents.clear()

    val filePath = module.resume()

    assertEquals("/data/out.dat", filePath)
    assertEquals(1, emittedEvents.size)
    val event = emittedEvents.first()
    assertEquals("recording", event.second["state"])
    assertEquals("session-1", event.second["sessionId"])
    assertFalse(event.second.containsKey("reason"))
  }

  // MARK: - Status

  @Test
  fun `status returns the inactive state when no session exists`() {
    val status = module.status()

    assertEquals("inactive", status["state"])
    assertNull(status["sessionId"])
    assertNull(status["filePath"])
  }

  @Test
  fun `status reports the paused state for an inactive session`() {
    startModuleSession(paused = true)

    val status = module.status()

    assertEquals("paused", status["state"])
    assertEquals("session-1", status["sessionId"])
    assertEquals("/data/out.dat", status["filePath"])
  }

  @Test
  fun `status reports the recording state for an active session`() {
    startModuleSession()

    val status = module.status()

    assertEquals("recording", status["state"])
    assertEquals("session-1", status["sessionId"])
    assertEquals("/data/out.dat", status["filePath"])
  }

  // MARK: - Permission

  @Test
  fun `hasPermission returns false when microphone permission is denied`() {
    shadowOf(androidContext as Application).denyPermissions(Manifest.permission.RECORD_AUDIO)

    assertFalse(module.hasPermission())
  }

  @Test
  fun `hasPermission returns true when microphone permission is granted`() {
    assertTrue(module.hasPermission())
  }

  // MARK: - Helpers

  private fun startModuleSession(paused: Boolean = false) {
    every { mockSession.start(any()) } returns "/data/out.dat"
    every { mockSession.stop() } returns "/data/out.dat"
    every { mockSession.getInfo() } returns Session.SessionInfo("session-1", "/data/out.dat", !paused)
    module.start("session-1")
    if (!paused) {
      mockSessionTimer.activate()
    }
    emittedEvents.clear()
  }

  private fun writeEncryptedFile(chunks: List<ByteArray>): File {
    val encryptedFile = File(androidContext.filesDir, "stream_${System.currentTimeMillis()}.dat")
    val encryptionStream = EncryptionStream(testKey, encryptedFile)
    encryptionStream.initialize()
    chunks.forEach { encryptionStream.write(it) }
    encryptionStream.close()
    return encryptedFile
  }

  private fun assertArrayEquals(expected: ByteArray, actual: ByteArray) {
    assertTrue("Byte arrays should match", expected.contentEquals(actual))
  }
}
