package expo.modules.securerecorder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for State (immutable recording state).
 */
class StateTest {

  @Test
  fun `identical states are equal`() {
    val state1 = State(true, "session1", "/path1")
    val state2 = State(true, "session1", "/path1")

    assertEquals(state1, state2)
  }

  @Test
  fun `states with different session ids are not equal`() {
    val state1 = State(true, "session1", "/path1")
    val state2 = State(true, "session2", "/path1")

    assertNotEquals(state1, state2)
  }

  @Test
  fun `equal states have equal hash codes`() {
    val state1 = State(true, "session1", "/path1")
    val state2 = State(true, "session1", "/path1")

    assertEquals(state1.hashCode(), state2.hashCode())
  }

  @Test
  fun `IDLE is the inactive state without session or file`() {
    assertFalse(State.IDLE.isRecording)
    assertNull(State.IDLE.sessionId)
    assertNull(State.IDLE.filePath)
  }
}
