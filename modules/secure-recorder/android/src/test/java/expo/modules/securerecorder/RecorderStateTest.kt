package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for RecorderState
 * Tests conversion logic and state mapping
 */
class RecorderStateTest {

  @Test
  fun `fromJsString parses valid values`() {
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString("inactive"))
    assertEquals(RecorderState.RECORDING, RecorderState.fromJsString("recording"))
    assertEquals(RecorderState.PAUSED, RecorderState.fromJsString("paused"))
    assertEquals(RecorderState.STOPPED, RecorderState.fromJsString("stopped"))
  }

  @Test
  fun `fromJsString returns INACTIVE for unknown values`() {
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString("unknown"))
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString(""))
    assertEquals(RecorderState.INACTIVE, RecorderState.fromJsString("invalid_state"))
  }

  @Test
  fun `fromState returns RECORDING when isRecording is true`() {
    val state = RecorderState.fromState(isRecording = true, filePath = null)
    
    assertEquals(RecorderState.RECORDING, state)
  }

  @Test
  fun `fromState returns PAUSED when isPaused is true`() {
    val state = RecorderState.fromState(isRecording = false, isPaused = true, filePath = "/path/to/file.dat")
    
    assertEquals(RecorderState.PAUSED, state)
  }

  @Test
  fun `fromState returns STOPPED when filePath is not null and not recording`() {
    val state = RecorderState.fromState(isRecording = false, filePath = "/path/to/file.dat")
    
    assertEquals(RecorderState.STOPPED, state)
  }

  @Test
  fun `fromState returns INACTIVE when not recording and filePath is null`() {
    val state = RecorderState.fromState(isRecording = false, filePath = null)
    
    assertEquals(RecorderState.INACTIVE, state)
  }

  @Test
  fun `fromState prioritizes RECORDING over PAUSED`() {
    // When recording, should return RECORDING even if isPaused is true
    val state = RecorderState.fromState(isRecording = true, isPaused = true, filePath = "/path/to/file.dat")
    
    assertEquals(RecorderState.RECORDING, state)
  }

  @Test
  fun `fromState prioritizes RECORDING over STOPPED`() {
    // When recording, should return RECORDING even if filePath exists
    val state = RecorderState.fromState(isRecording = true, filePath = "/path/to/file.dat")
    
    assertEquals(RecorderState.RECORDING, state)
  }

  @Test
  fun `fromState prioritizes PAUSED over STOPPED`() {
    // When paused with filePath, should return PAUSED
    val state = RecorderState.fromState(isRecording = false, isPaused = true, filePath = "/path/to/file.dat")
    
    assertEquals(RecorderState.PAUSED, state)
  }

  @Test
  fun `toJsString and fromJsString are inverse operations`() {
    val states = listOf(RecorderState.INACTIVE, RecorderState.RECORDING, RecorderState.PAUSED, RecorderState.STOPPED)
    
    states.forEach { originalState ->
      val jsString = originalState.toJsString()
      val parsedState = RecorderState.fromJsString(jsString)
      assertEquals("toJsString and fromJsString should be inverse", originalState, parsedState)
    }
  }
}
