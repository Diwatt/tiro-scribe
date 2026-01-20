package expo.modules.securerecorder

import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File

/**
 * Unit tests for EventHandler
 * Tests event coordination with mocks
 */
class EventHandlerTest {

  private lateinit var mockStateManager: StateManager
  private var stopCalled: Boolean = false
  private var stopResult: String = ""
  private var limitReachedCalled: Boolean = false
  private var limitReachedReason: StopReason? = null
  private var limitReachedSessionId: String? = null
  private var limitReachedFilePath: String? = null

  @Before
  fun setup() {
    mockStateManager = mockk(relaxed = true)
    stopCalled = false
    stopResult = ""
    limitReachedCalled = false
    limitReachedReason = null
    limitReachedSessionId = null
    limitReachedFilePath = null
  }

  @After
  fun tearDown() {
    clearAllMocks()
  }

  @Test
  fun `onLimitReached calls onStop and onLimitReached handler`() = runBlocking {
    stopResult = "/path/to/file.dat"
    
    val onStop: suspend () -> String = {
      stopCalled = true
      stopResult
    }
    
    val onLimitReached: suspend (StopReason, String, String) -> Unit = { reason, sessionId, filePath ->
      limitReachedCalled = true
      limitReachedReason = reason
      limitReachedSessionId = sessionId
      limitReachedFilePath = filePath
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      stateManager = mockStateManager,
      onStop = onStop,
      onLimitReached = onLimitReached
    )
    
    eventHandler.onLimitReached(StopReason.DURATION_LIMIT)
    
    assertTrue("onStop should be called", stopCalled)
    assertTrue("onLimitReached handler should be called", limitReachedCalled)
    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
    assertEquals("test-session", limitReachedSessionId)
    assertEquals("/path/to/file.dat", limitReachedFilePath)
  }

  @Test
  fun `onLimitReached works without onLimitReached handler`() = runBlocking {
    stopResult = "/path/to/file.dat"
    
    val onStop: suspend () -> String = {
      stopCalled = true
      stopResult
    }
    
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      stateManager = mockStateManager,
      onStop = onStop,
      onLimitReached = null
    )
    
    eventHandler.onLimitReached(StopReason.FILE_SIZE_LIMIT)
    
    assertTrue("onStop should be called even without handler", stopCalled)
    assertFalse("onLimitReached handler should not be called when null", limitReachedCalled)
  }

  @Test
  fun `onError deactivates state manager`() {
    val eventHandler = EventHandler(
      sessionId = "test-session",
      outputFile = File("/path/to/file.dat"),
      stateManager = mockStateManager,
      onStop = { "" },
      onLimitReached = null
    )
    
    eventHandler.onError("Test error message")
    
    verify(exactly = 1) { mockStateManager.deactivate() }
  }

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
      stateManager = mockStateManager,
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
