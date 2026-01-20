package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for StopReason
 * Tests match iOS StopReasonTests structure and naming
 */
class StopReasonTest {

  @Test
  fun `toJsString returns correct values`() {
    assertEquals("duration_limit", StopReason.DURATION_LIMIT.toJsString())
    assertEquals("file_size_limit", StopReason.FILE_SIZE_LIMIT.toJsString())
    assertEquals("user_stopped", StopReason.USER_STOPPED.toJsString())
    assertEquals("error", StopReason.ERROR.toJsString())
  }

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
