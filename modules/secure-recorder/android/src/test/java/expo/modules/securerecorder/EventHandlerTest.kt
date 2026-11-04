package expo.modules.securerecorder

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Unit tests for EventHandler (Android).
 * Each StopReason forwarding is its own test - no loops, one assertion scenario each.
 */
class EventHandlerTest {

  private lateinit var mockRecordingTimer: RecordingTimerInterface
  private var stopCallCount: Int = 0
  private var stopResult: String = ""
  private var limitReachedCallCount: Int = 0
  private var limitReachedReason: StopReason? = null
  private var limitReachedFilePath: String? = null

  @Before
  fun setup() {
    mockRecordingTimer = mockk(relaxed = true)
    stopCallCount = 0
    stopResult = ""
    limitReachedCallCount = 0
    limitReachedReason = null
    limitReachedFilePath = null
  }

  @Test
  fun `onLimitReached calls onStop once and forwards DURATION_LIMIT with the stop result`() = runBlocking {
    val eventHandler = createHandlerWithRecordingCallbacks()

    eventHandler.onLimitReached(StopReason.DURATION_LIMIT)

    assertEquals(1, stopCallCount)
    assertEquals(1, limitReachedCallCount)
    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
    assertEquals("/path/to/file.dat", limitReachedFilePath)
  }

  @Test
  fun `onLimitReached forwards FILE_SIZE_LIMIT`() = runBlocking {
    val eventHandler = createHandlerWithRecordingCallbacks()

    eventHandler.onLimitReached(StopReason.FILE_SIZE_LIMIT)

    assertEquals(StopReason.FILE_SIZE_LIMIT, limitReachedReason)
    assertEquals(1, stopCallCount)
  }

  @Test
  fun `onLimitReached forwards USER_STOPPED`() = runBlocking {
    val eventHandler = createHandlerWithRecordingCallbacks()

    eventHandler.onLimitReached(StopReason.USER_STOPPED)

    assertEquals(StopReason.USER_STOPPED, limitReachedReason)
    assertEquals(1, stopCallCount)
  }

  @Test
  fun `onLimitReached forwards ERROR`() = runBlocking {
    val eventHandler = createHandlerWithRecordingCallbacks()

    eventHandler.onLimitReached(StopReason.ERROR)

    assertEquals(StopReason.ERROR, limitReachedReason)
    assertEquals(1, stopCallCount)
  }

  @Test
  fun `onLimitReached calls onStop when no module handler is registered`() = runBlocking {
    var stopCallCount = 0
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = { stopCallCount++; "/path/to/file.dat" },
      onLimitReached = null
    )

    eventHandler.onLimitReached(StopReason.USER_STOPPED)

    assertEquals(1, stopCallCount)
    assertEquals(0, limitReachedCallCount)
  }

  @Test
  fun `onError deactivates the recording timer`() {
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = { "" },
      onLimitReached = null
    )

    eventHandler.onError("Test error message")

    verify(exactly = 1) { mockRecordingTimer.deactivate() }
  }

  private fun createHandlerWithRecordingCallbacks(): EventHandler {
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = {
        stopCallCount++
        stopResult
      },
      onLimitReached = { reason, _, filePath ->
        limitReachedCallCount++
        limitReachedReason = reason
        limitReachedFilePath = filePath
      }
    )
    stopResult = "/path/to/file.dat"
    return eventHandler
  }
}
