package expo.modules.securerecorder

import android.media.AudioRecord
import expo.modules.securerecorder.exception.InitializationException
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for AudioRecorder.
 *
 * AudioRecord is an Android framework boundary, so it is mocked; AudioRecorder itself
 * runs for real with an injected AudioRecord factory, exactly like production wiring.
 */
class AudioRecorderTest {

  private val audioConfig = AudioConfig()

  @Test
  fun `start creates the audio record through the factory and validates its state`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { state } returns AudioRecord.STATE_INITIALIZED
    }
    var factoryCallCount = 0
    val audioRecorder = AudioRecorder(audioConfig) { _ ->
      factoryCallCount++
      mockAudioRecord
    }

    val audioRecord = audioRecorder.start()

    assertEquals(mockAudioRecord, audioRecord)
    assertEquals(1, factoryCallCount)
    verify(exactly = 1) { mockAudioRecord.state }
  }

  @Test
  fun `start throws InitializationException when the audio record fails validation`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { state } returns AudioRecord.STATE_UNINITIALIZED
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    val exception = assertThrows(InitializationException::class.java) { audioRecorder.start() }

    assertEquals("AudioRecord initialization failed", exception.message)
  }

  @Test
  fun `start propagates when the factory fails`() {
    val audioRecorder = AudioRecorder(audioConfig) { _ ->
      throw RuntimeException("Factory error")
    }

    val exception = assertThrows(RuntimeException::class.java) { audioRecorder.start() }

    assertEquals("Factory error", exception.message)
  }

  @Test
  fun `stop releases the audio record without stopping it when it is not recording`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_STOPPED
      every { state } returns AudioRecord.STATE_INITIALIZED
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    audioRecorder.stop(mockAudioRecord)

    verify(exactly = 0) { mockAudioRecord.stop() }
    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `stop stops the audio record before releasing it when it is still recording`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_RECORDING
      every { state } returns AudioRecord.STATE_INITIALIZED
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    audioRecorder.stop(mockAudioRecord)

    verify(exactly = 1) { mockAudioRecord.stop() }
    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `stop skips release when the audio record is uninitialized`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_STOPPED
      every { state } returns AudioRecord.STATE_UNINITIALIZED
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    audioRecorder.stop(mockAudioRecord)

    verify(exactly = 0) { mockAudioRecord.release() }
  }

  @Test
  fun `stop ignores IllegalStateException from record stop and still releases`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_RECORDING
      every { state } returns AudioRecord.STATE_INITIALIZED
      every { stop() } throws IllegalStateException("already stopped")
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    audioRecorder.stop(mockAudioRecord)

    verify(exactly = 1) { mockAudioRecord.release() }
  }

  @Test
  fun `stop ignores IllegalStateException from record release`() {
    val mockAudioRecord = mockk<AudioRecord>(relaxed = true) {
      every { recordingState } returns AudioRecord.RECORDSTATE_STOPPED
      every { state } returns AudioRecord.STATE_INITIALIZED
      every { release() } throws IllegalStateException("already released")
    }
    val audioRecorder = AudioRecorder(audioConfig) { _ -> mockAudioRecord }

    audioRecorder.stop(mockAudioRecord)

    assertTrue("stop should complete without throwing", true)
    verify(exactly = 1) { mockAudioRecord.release() }
  }
}
