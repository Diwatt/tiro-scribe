package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for State
 * Tests match iOS StateTests structure and naming
 */
class StateTest {

  @Test
  fun `IDLE state has correct default values`() {
    val idleState = State.IDLE
    
    assertFalse("IDLE state should not be recording", idleState.isRecording)
    assertNull("IDLE state should have null sessionId", idleState.sessionId)
    assertNull("IDLE state should have null filePath", idleState.filePath)
  }

  @Test
  fun `can create recording state`() {
    val state = State(
      isRecording = true,
      sessionId = "test-session",
      filePath = "/path/to/file.dat"
    )
    
    assertTrue("State should be recording", state.isRecording)
    assertEquals("Session ID should match", "test-session", state.sessionId)
    assertEquals("File path should match", "/path/to/file.dat", state.filePath)
  }

  @Test
  fun `can create idle state manually`() {
    val state = State(
      isRecording = false,
      sessionId = null,
      filePath = null
    )
    
    assertFalse("State should not be recording", state.isRecording)
    assertNull("Session ID should be null", state.sessionId)
    assertNull("File path should be null", state.filePath)
  }

  @Test
  fun `recording state with partial data`() {
    val state = State(
      isRecording = true,
      sessionId = "test-session",
      filePath = null
    )
    
    assertTrue("State should be recording", state.isRecording)
    assertEquals("Session ID should be set", "test-session", state.sessionId)
    assertNull("File path can be null during initialization", state.filePath)
  }

  @Test
  fun `data class provides copy method`() {
    val original = State(
      isRecording = true,
      sessionId = "original",
      filePath = "/original/path"
    )
    
    val copied = original.copy(sessionId = "modified")
    
    assertTrue("Copied state should preserve isRecording", copied.isRecording)
    assertEquals("Copied state should have modified sessionId", "modified", copied.sessionId)
    assertEquals("Copied state should preserve filePath", "/original/path", copied.filePath)
  }

  @Test
  fun `data class provides equals method`() {
    val state1 = State(true, "session1", "/path1")
    val state2 = State(true, "session1", "/path1")
    val state3 = State(true, "session2", "/path1")
    
    assertEquals("Identical states should be equal", state1, state2)
    assertNotEquals("Different session IDs should not be equal", state1, state3)
  }

  @Test
  fun `data class provides hashCode method`() {
    val state1 = State(true, "session1", "/path1")
    val state2 = State(true, "session1", "/path1")
    
    assertEquals("Equal states should have equal hash codes", state1.hashCode(), state2.hashCode())
  }

  @Test
  fun `data class provides toString method`() {
    val state = State(true, "test-session", "/test/path")
    val string = state.toString()
    
    assertTrue("toString should contain class name", string.contains("State"))
    assertTrue("toString should contain isRecording", string.contains("isRecording"))
    assertTrue("toString should contain sessionId", string.contains("sessionId"))
    assertTrue("toString should contain filePath", string.contains("filePath"))
  }

  @Test
  fun `State is immutable`() {
    // Verify that all properties are val (read-only)
    // This is enforced by Kotlin's data class with val properties
    val state = State(true, "session", "/path")
    
    // Cannot reassign properties (would not compile):
    // state.isRecording = false // Compilation error
    // state.sessionId = "new" // Compilation error
    // state.filePath = "/new" // Compilation error
    
    // Can only create new instances
    val newState = state.copy(isRecording = false)
    assertFalse("New state should have modified value", newState.isRecording)
    assertTrue("Original state should remain unchanged", state.isRecording)
  }
}
