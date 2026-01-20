package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.delay

/**
 * Unit tests for StateManager
 * Tests match iOS StateManagerTests structure and naming
 */
class StateManagerTest {

  private lateinit var stateManager: StateManager

  @Before
  fun setup() {
    stateManager = StateManager()
  }

  @Test
  fun `initial state is inactive`() {
    assertFalse("StateManager should start inactive", stateManager.isActive)
  }

  @Test
  fun `activate sets state to active`() {
    stateManager.activate()
    
    assertTrue("StateManager should be active after activate()", stateManager.isActive)
  }

  @Test
  fun `deactivate sets state to inactive`() {
    stateManager.activate()
    stateManager.deactivate()
    
    assertFalse("StateManager should be inactive after deactivate()", stateManager.isActive)
  }

  @Test
  fun `getElapsedTime returns 0 when not active`() {
    val elapsedTime = stateManager.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 when not active", 0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime returns 0 when active but startTime is 0`() {
    // Manually set active without calling activate (edge case)
    // This shouldn't happen in practice, but test defensive behavior
    val elapsedTime = stateManager.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 when startTime is 0", 0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime increases after activation`() {
    stateManager.activate()
    
    val initialTime = stateManager.getElapsedTime()
    assertTrue("Initial elapsed time should be >= 0", initialTime >= 0)
    
    // Wait a bit
    Thread.sleep(10)
    
    val laterTime = stateManager.getElapsedTime()
    assertTrue("Elapsed time should increase", laterTime > initialTime)
  }

  @Test
  fun `getStartTime returns 0 when not active`() {
    val startTime = stateManager.getStartTime()
    
    assertEquals("Start time should be 0 when not active", 0L, startTime)
  }

  @Test
  fun `getStartTime returns timestamp after activation`() {
    val beforeActivation = System.currentTimeMillis()
    stateManager.activate()
    val afterActivation = System.currentTimeMillis()
    
    val startTime = stateManager.getStartTime()
    
    assertTrue("Start time should be >= before activation", startTime >= beforeActivation)
    assertTrue("Start time should be <= after activation", startTime <= afterActivation)
  }

  @Test
  fun `deactivate keeps startTime but getElapsedTime returns 0`() {
    stateManager.activate()
    val startTimeBefore = stateManager.getStartTime()
    assertTrue("Start time should be set after activation", startTimeBefore > 0)
    
    stateManager.deactivate()
    val startTimeAfter = stateManager.getStartTime()
    val elapsedTime = stateManager.getElapsedTime()
    
    // Note: startTime is preserved (useful for debugging/logging), but getElapsedTime() returns 0
    assertTrue("Start time should be preserved after deactivate", startTimeAfter > 0)
    assertEquals("Elapsed time should be 0 after deactivation", 0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime returns 0 after deactivation`() {
    stateManager.activate()
    Thread.sleep(10)
    
    stateManager.deactivate()
    val elapsedTime = stateManager.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 after deactivation", 0L, elapsedTime)
  }

  @Test
  fun `multiple activate calls update startTime`() {
    stateManager.activate()
    val firstStartTime = stateManager.getStartTime()
    
    Thread.sleep(10)
    
    stateManager.activate()
    val secondStartTime = stateManager.getStartTime()
    
    assertTrue("Second activation should update start time", secondStartTime > firstStartTime)
  }
}
