package expo.modules.securerecorder

import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File

/**
 * Unit tests for EventHandler (Android)
 * Tests verify EventHandler logic only - all dependencies are mocked
 * Each conditional branch has at least one test
 */
class EventHandlerTest {

  private lateinit var mockRecordingTimer: RecordingTimer
  private var stopCallCount: Int = 0
  private var stopResult: String = ""
  private var limitReachedCallCount: Int = 0
  private var limitReachedReason: StopReason? = null
  private var limitReachedSessionId: String? = null
  private var limitReachedFilePath: String? = null

  @Before
  fun setup() {
    mockRecordingTimer = mockk(relaxed = true)
    stopCallCount = 0
    stopResult = ""
    limitReachedCallCount = 0
    limitReachedReason = null
    limitReachedSessionId = null
    limitReachedFilePath = null
  }

  @After
  fun tearDown() {
    clearAllMocks()
  }

  // MARK: - Branch 1: onLimitReached with handler, onStop succeeds

  @Test
  fun `onLimitReached calls onStop and handler when stop succeeds`() = runBlocking {
    stopResult = "/path/to/file.dat"
    
    val onStop: suspend () -> String = {
      stopCallCount++
      stopResult
    }
    
    val onLimitReached: suspend (StopReason, String, String) -> Unit = { reason, sessionId, filePath ->
      limitReachedCallCount++
      limitReachedReason = reason
      limitReachedSessionId = sessionId
      limitReachedFilePath = filePath
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = onStop,
      onLimitReached = onLimitReached
    )
    
    eventHandler.onLimitReached(StopReason.DURATION_LIMIT)
    
    // Verify onStop was called exactly once
    assertEquals("onStop should be called exactly once", 1, stopCallCount)
    
    // Verify handler was called exactly once
    assertEquals("onLimitReached handler should be called exactly once", 1, limitReachedCallCount)
    assertEquals("Reason should match", StopReason.DURATION_LIMIT, limitReachedReason)
    assertEquals("SessionId should match", "test-session", limitReachedSessionId)
    assertEquals("FilePath should match stop result", "/path/to/file.dat", limitReachedFilePath)
  }

  // MARK: - Branch 2: onLimitReached with handler (onStop always succeeds in Android)

  @Test
  fun `onLimitReached calls handler with stop result`() = runBlocking {
    stopResult = "/custom/path.dat"
    
    val onStop: suspend () -> String = {
      stopCallCount++
      stopResult
    }
    
    val onLimitReached: suspend (StopReason, String, String) -> Unit = { reason, sessionId, filePath ->
      limitReachedCallCount++
      limitReachedReason = reason
      limitReachedFilePath = filePath
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = onStop,
      onLimitReached = onLimitReached
    )
    
    eventHandler.onLimitReached(StopReason.FILE_SIZE_LIMIT)
    
    // Verify onStop was called
    assertEquals("onStop should be called", 1, stopCallCount)
    
    // Verify handler was called with stop result
    assertEquals("Handler should be called", 1, limitReachedCallCount)
    assertEquals("Should use stop result", "/custom/path.dat", limitReachedFilePath)
  }

  // MARK: - Branch 3: onLimitReached without handler, onStop succeeds

  @Test
  fun `onLimitReached calls onStop when handler is null`() = runBlocking {
    stopResult = "/path/to/file.dat"
    
    val onStop: suspend () -> String = {
      stopCallCount++
      stopResult
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = onStop,
      onLimitReached = null
    )
    
    eventHandler.onLimitReached(StopReason.USER_STOPPED)
    
    // Verify onStop was called
    assertEquals("onStop should be called even without handler", 1, stopCallCount)
    
    // Verify handler was NOT called
    assertEquals("Handler should not be called when null", 0, limitReachedCallCount)
  }

  // MARK: - Branch 4: onError calls recordingTimer.deactivate

  @Test
  fun `onError calls recordingTimer deactivate`() {
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = { "" },
      onLimitReached = null
    )
    
    eventHandler.onError("Test error message")
    
    // Verify deactivate was called exactly once
    verify(exactly = 1) { mockRecordingTimer.deactivate() }
  }

  // MARK: - Branch 5: onLimitReached passes correct reason

  @Test
  fun `onLimitReached passes correct reason`() = runBlocking {
    stopResult = "/path/to/file.dat"
    
    val onStop: suspend () -> String = { stopResult }
    
    val onLimitReached: suspend (StopReason, String, String) -> Unit = { reason, _, _ ->
      limitReachedReason = reason
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      recordingTimer = mockRecordingTimer,
      onStop = onStop,
      onLimitReached = onLimitReached
    )
    
    val reasons = listOf(
      StopReason.DURATION_LIMIT,
      StopReason.FILE_SIZE_LIMIT,
      StopReason.USER_STOPPED,
      StopReason.ERROR
    )
    
    reasons.forEach { reason ->
      limitReachedReason = null
      eventHandler.onLimitReached(reason)
      assertEquals("Should pass correct reason", reason, limitReachedReason)
    }
  }
}
