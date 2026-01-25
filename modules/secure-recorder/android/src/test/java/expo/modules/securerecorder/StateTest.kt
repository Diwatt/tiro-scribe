package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for State
 * Tests equality and hash logic
 */
class StateTest {

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
}
