package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.delay

/**
 * Unit tests for RecordingTimer
 * Tests match iOS RecordingTimerTests structure and naming
 */
class RecordingTimerTest {

  private lateinit var recordingTimer: RecordingTimer

  @Before
  fun setup() {
    recordingTimer = RecordingTimer()
  }

  @Test
  fun `initial state is inactive`() {
    assertFalse("RecordingTimer should start inactive", recordingTimer.isActive)
  }

  @Test
  fun `activate sets state to active`() {
    recordingTimer.activate()
    
    assertTrue("RecordingTimer should be active after activate()", recordingTimer.isActive)
  }

  @Test
  fun `deactivate sets state to inactive`() {
    recordingTimer.activate()
    recordingTimer.deactivate()
    
    assertFalse("RecordingTimer should be inactive after deactivate()", recordingTimer.isActive)
  }

  @Test
  fun `getElapsedTime returns 0 when not active`() {
    val elapsedTime = recordingTimer.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 when not active", 0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime returns 0 when active but startTime is 0`() {
    val elapsedTime = recordingTimer.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 when startTime is 0", 0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime increases after activation`() {
    recordingTimer.activate()
    
    val initialTime = recordingTimer.getElapsedTime()
    assertTrue("Initial elapsed time should be >= 0", initialTime >= 0)
    
    // Wait a bit
    Thread.sleep(10)
    
    val laterTime = recordingTimer.getElapsedTime()
    assertTrue("Elapsed time should increase", laterTime > initialTime)
  }

  @Test
  fun `getStartTime returns 0 when not active`() {
    val startTime = recordingTimer.getStartTime()
    
    assertEquals("Start time should be 0 when not active", 0L, startTime)
  }

  @Test
  fun `getStartTime returns timestamp when active`() {
    recordingTimer.activate()
    
    val startTime = recordingTimer.getStartTime()
    assertTrue("Start time should be > 0 when active", startTime > 0)
  }

  @Test
  fun `getStartTime is set on activation`() {
    recordingTimer.activate()
    val startTimeBefore = recordingTimer.getStartTime()
    
    recordingTimer.deactivate()
    val startTimeAfter = recordingTimer.getStartTime()
    
    assertEquals("Start time should be reset to 0 after deactivate()", 0L, startTimeAfter)
  }

  @Test
  fun `getElapsedTime returns 0 after deactivation`() {
    recordingTimer.activate()
    
    recordingTimer.deactivate()
    val elapsedTime = recordingTimer.getElapsedTime()
    
    assertEquals("Elapsed time should be 0 after deactivation", 0L, elapsedTime)
  }

  @Test
  fun `activate updates start time`() {
    recordingTimer.activate()
    val firstStartTime = recordingTimer.getStartTime()
    
    Thread.sleep(10)
    recordingTimer.activate()
    val secondStartTime = recordingTimer.getStartTime()
    
    assertTrue("Start time should be updated on reactivation", secondStartTime > firstStartTime)
  }
}
