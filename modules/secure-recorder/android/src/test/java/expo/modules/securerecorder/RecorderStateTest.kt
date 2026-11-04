package expo.modules.securerecorder

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for RecorderState conversion logic.
 * Each mapping branch of toJsString / fromJsString / fromState gets its own test.
 */
class RecorderStateTest {

  @Test
  fun `toJsString maps INACTIVE to inactive`() {
    assertEquals("inactive", RecorderState.INACTIVE.toJsString())
  }

  @Test
  fun `toJsString maps RECORDING to recording`() {
    assertEquals("recording", RecorderState.RECORDING.toJsString())
  }

  @Test
  fun `toJsString maps PAUSED to paused`() {
    assertEquals("paused", RecorderState.PAUSED.toJsString())
  }

  @Test
  fun `toJsString maps STOPPED to stopped`() {
    assertEquals("stopped", RecorderState.STOPPED.toJsString())
  }

  @Test
  fun `fromJsString parses inactive`() {
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString("inactive"))
  }

  @Test
  fun `fromJsString parses recording`() {
    assertEquals(RecorderState.RECORDING, RecorderState.fromJsString("recording"))
  }

  @Test
  fun `fromJsString parses paused`() {
    assertEquals(RecorderState.PAUSED, RecorderState.fromJsString("paused"))
  }

  @Test
  fun `fromJsString parses stopped`() {
    assertEquals(RecorderState.STOPPED, RecorderState.fromJsString("stopped"))
  }

  @Test
  fun `fromJsString defaults unknown values to INACTIVE`() {
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString("invalid_state"))
  }

  @Test
  fun `fromState returns RECORDING when recording takes precedence over paused state and file path`() {
    val state = RecorderState.fromState(isRecording = true, isPaused = true, filePath = "/path/to/file.dat")

    assertEquals(RecorderState.RECORDING, state)
  }

  @Test
  fun `fromState returns PAUSED when not recording but paused with a file path`() {
    val state = RecorderState.fromState(isRecording = false, isPaused = true, filePath = "/path/to/file.dat")

    assertEquals(RecorderState.PAUSED, state)
  }

  @Test
  fun `fromState returns STOPPED when not recording with a file path`() {
    val state = RecorderState.fromState(isRecording = false, isPaused = false, filePath = "/path/to/file.dat")

    assertEquals(RecorderState.STOPPED, state)
  }

  @Test
  fun `fromState returns INACTIVE when not recording without a file path`() {
    val state = RecorderState.fromState(isRecording = false, isPaused = false, filePath = null)

    assertEquals(RecorderState.INACTIVE, state)
  }
}
