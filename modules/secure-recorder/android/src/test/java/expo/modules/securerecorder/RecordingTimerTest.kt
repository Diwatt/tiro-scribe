package expo.modules.securerecorder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for RecordingTimer.
 * Tests match iOS RecordingTimerTests structure and naming.
 */
class RecordingTimerTest {

  private lateinit var recordingTimer: RecordingTimer

  @Before
  fun setup() {
    recordingTimer = RecordingTimer()
  }

  @Test
  fun `initial state is inactive`() {
    assertFalse(recordingTimer.isActive)
  }

  @Test
  fun `activate sets state to active`() {
    recordingTimer.activate()

    assertTrue(recordingTimer.isActive)
  }

  @Test
  fun `deactivate sets state to inactive`() {
    recordingTimer.activate()

    recordingTimer.deactivate()

    assertFalse(recordingTimer.isActive)
  }

  @Test
  fun `getElapsedTime returns 0 when the timer is not active`() {
    val elapsedTime = recordingTimer.getElapsedTime()

    assertEquals(0L, elapsedTime)
  }

  @Test
  fun `getElapsedTime increases after activation`() {
    recordingTimer.activate()

    val initialTime = recordingTimer.getElapsedTime()
    Thread.sleep(10)
    val laterTime = recordingTimer.getElapsedTime()

    assertTrue("Elapsed time should increase while active", laterTime > initialTime)
  }

  @Test
  fun `getElapsedTime returns 0 after deactivation`() {
    recordingTimer.activate()

    recordingTimer.deactivate()
    val elapsedTime = recordingTimer.getElapsedTime()

    assertEquals(0L, elapsedTime)
  }

  @Test
  fun `getStartTime returns 0 when not active`() {
    val startTime = recordingTimer.getStartTime()

    assertEquals(0L, startTime)
  }

  @Test
  fun `getStartTime is set to a timestamp on activation`() {
    recordingTimer.activate()

    val startTime = recordingTimer.getStartTime()

    assertTrue("Start time should be set when active", startTime > 0)
  }

  @Test
  fun `deactivate resets start time to 0`() {
    recordingTimer.activate()
    recordingTimer.getStartTime()

    recordingTimer.deactivate()

    assertEquals(0L, recordingTimer.getStartTime())
  }

  @Test
  fun `reactivate updates the start time`() {
    recordingTimer.activate()
    val firstStartTime = recordingTimer.getStartTime()

    Thread.sleep(10)
    recordingTimer.activate()
    val secondStartTime = recordingTimer.getStartTime()

    assertTrue("Start time should be updated on reactivation", secondStartTime > firstStartTime)
  }
}
