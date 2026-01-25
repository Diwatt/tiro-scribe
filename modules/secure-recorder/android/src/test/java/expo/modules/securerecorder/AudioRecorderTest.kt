package expo.modules.securerecorder

import expo.modules.securerecorder.exception.InitializationException
import android.media.AudioRecord
import io.mockk.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for AudioRecorder
 * Tests use mocks to verify behavior in isolation
 */
class AudioRecorderTest {

  private lateinit var audioRecorder: AudioRecorder
  private lateinit var mockConfig: AudioConfig
  private var mockFactory: ((AudioConfig) -> AudioRecord)? = null

  @Before
  fun setup() {
    mockConfig = mockk(relaxed = true) {
      every { sampleRate } returns 16000
      every { channelConfig } returns android.media.AudioFormat.CHANNEL_IN_MONO
      every { audioFormat } returns android.media.AudioFormat.ENCODING_PCM_16BIT
      every { bufferSize } returns 8192
    }
    // Create a mock factory function (isomorphic: matches iOS function closure pattern)
    mockFactory = { config ->
      mockk<AudioRecord>(relaxed = true) {
        every { state } returns AudioRecord.STATE_INITIALIZED
      }
    }
    audioRecorder = AudioRecorder(mockConfig, factory = mockFactory!!)
  }

  @After
  fun tearDown() {
    clearAllMocks()
  }

  // MARK: - Start behavior tests with mocks

  @Test
  fun `start calls dependencies`() {
    // Create mock AudioRecord that is initialized
    var factoryCallCount = 0
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { state } returns AudioRecord.STATE_INITIALIZED
    }
    
    // Create factory that tracks calls (isomorphic: matches iOS function closure pattern)
    val factory: (AudioConfig) -> AudioRecord = { config ->
      factoryCallCount++
      mockAudioRecord
    }
    audioRecorder = AudioRecorder(mockConfig, factory = factory)
    
    // Call start()
    audioRecorder.start()
    
    // Verify dependency instance is created (factory is called)
    assertEquals("Factory should be called once", 1, factoryCallCount)
    
    // Verify dependency method is called (state is checked)
    verify(exactly = 1) { mockAudioRecord.state }
  }

  @Test
  fun `start throws when factory creation fails`() {
    // Exception case 1: Dependency creation fails (isomorphic: iOS setCategory fails, Android factory throws)
    var factoryCallCount = 0
    val factory: (AudioConfig) -> AudioRecord = { config ->
      factoryCallCount++
      throw RuntimeException("Factory error")
    }
    audioRecorder = AudioRecorder(mockConfig, factory = factory)
    
    // Should throw
    try {
      audioRecorder.start()
      fail("start() should throw when factory fails")
    } catch (e: Exception) {
      // Expected - factory error propagates
      assertTrue("Should throw exception", e is RuntimeException)
    }
    
    // Verify factory was called before throwing
    assertEquals("Factory should be called before throwing", 1, factoryCallCount)
  }

  @Test
  fun `start throws when validation fails`() {
    // Exception case 2: Validation fails after creation (isomorphic: iOS setActive fails, Android state validation fails)
    var factoryCallCount = 0
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { state } returns AudioRecord.STATE_UNINITIALIZED
    }
    
    val factory: (AudioConfig) -> AudioRecord = { config ->
      factoryCallCount++
      mockAudioRecord
    }
    audioRecorder = AudioRecorder(mockConfig, factory = factory)
    
    // Should throw
    try {
      audioRecorder.start()
      fail("start() should throw InitializationException when AudioRecord is not initialized")
    } catch (e: InitializationException) {
      // Expected
      assertTrue("Error message should indicate initialization failure", 
                 e.message?.contains("initialization failed") == true)
    }
    
    // Verify factory was called before validation
    assertEquals("Factory should be called before validation", 1, factoryCallCount)
    // Verify state was checked (validation step)
    verify(exactly = 1) { mockAudioRecord.state }
  }

  @Test
  fun `stop calls dependencies`() {
    // Test that all dependency methods are called
    val mockRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_STOPPED
      every { state } returns AudioRecord.STATE_INITIALIZED
    }

    audioRecorder.stop(mockRecord)

    // Verify dependency methods are called
    verify(exactly = 1) { mockRecord.recordingState }
    verify(exactly = 1) { mockRecord.state }
    verify(exactly = 1) { mockRecord.release() }
  }

  @Test
  fun `stop calls record stop when running`() {
    // Test "if running" case: record.stop() should be called when recordingState is RECORDING
    val mockRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_RECORDING
      every { state } returns AudioRecord.STATE_INITIALIZED
    }

    audioRecorder.stop(mockRecord)

    // Verify record.stop() is called when running
    verify(exactly = 1) { mockRecord.stop() }
    verify(exactly = 1) { mockRecord.release() }
  }

  @Test
  fun `stop skips record stop when not running`() {
    // Test "if running" case: record.stop() should NOT be called when recordingState is STOPPED
    val mockRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_STOPPED
      every { state } returns AudioRecord.STATE_INITIALIZED
    }

    audioRecorder.stop(mockRecord)

    // Verify record.stop() is NOT called when not running
    verify(exactly = 0) { mockRecord.stop() }
    // But release should still be called
    verify(exactly = 1) { mockRecord.release() }
  }

  // NOTE: Reflection-based tests for internal methods are unreliable in Kotlin
  // Kotlin's 'internal' visibility doesn't translate cleanly to Java reflection
  // These tests have been removed in favor of behavior-based tests above
  // The behavior tests (start/stop with mocks) verify the contract correctly
}
