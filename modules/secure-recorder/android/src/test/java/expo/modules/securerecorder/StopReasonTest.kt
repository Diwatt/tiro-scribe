package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for StopReason
 * Tests conversion logic and error handling
 */
class StopReasonTest {

  @Test
  fun `fromJsString parses valid values`() {
    assertEquals(StopReason.DURATION_LIMIT, StopReason.fromJsString("duration_limit"))
    assertEquals(StopReason.FILE_SIZE_LIMIT, StopReason.fromJsString("file_size_limit"))
    assertEquals(StopReason.USER_STOPPED, StopReason.fromJsString("user_stopped"))
    assertEquals(StopReason.ERROR, StopReason.fromJsString("error"))
  }

  @Test
  fun `fromJsString returns ERROR for unknown values`() {
    assertEquals(StopReason.ERROR, StopReason.fromJsString("unknown"))
    assertEquals(StopReason.ERROR, StopReason.fromJsString(""))
    assertEquals(StopReason.ERROR, StopReason.fromJsString("invalid_reason"))
  }

  @Test
  fun `toJsString and fromJsString are inverse operations`() {
    val reasons = listOf(
      StopReason.DURATION_LIMIT,
      StopReason.FILE_SIZE_LIMIT,
      StopReason.USER_STOPPED,
      StopReason.ERROR
    )
    
    reasons.forEach { originalReason ->
      val jsString = originalReason.toJsString()
      val parsedReason = StopReason.fromJsString(jsString)
      assertEquals("toJsString and fromJsString should be inverse", originalReason, parsedReason)
    }
  }
}
