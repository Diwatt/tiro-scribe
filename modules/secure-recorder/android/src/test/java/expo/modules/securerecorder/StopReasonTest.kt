package expo.modules.securerecorder

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for StopReason conversion logic.
 * Each mapping branch of toJsString / fromJsString gets its own test.
 */
class StopReasonTest {

  @Test
  fun `toJsString maps DURATION_LIMIT to duration_limit`() {
    assertEquals("duration_limit", StopReason.DURATION_LIMIT.toJsString())
  }

  @Test
  fun `toJsString maps FILE_SIZE_LIMIT to file_size_limit`() {
    assertEquals("file_size_limit", StopReason.FILE_SIZE_LIMIT.toJsString())
  }

  @Test
  fun `toJsString maps USER_STOPPED to user_stopped`() {
    assertEquals("user_stopped", StopReason.USER_STOPPED.toJsString())
  }

  @Test
  fun `toJsString maps ERROR to error`() {
    assertEquals("error", StopReason.ERROR.toJsString())
  }

  @Test
  fun `fromJsString parses duration_limit`() {
    assertEquals(StopReason.DURATION_LIMIT, StopReason.fromJsString("duration_limit"))
  }

  @Test
  fun `fromJsString parses file_size_limit`() {
    assertEquals(StopReason.FILE_SIZE_LIMIT, StopReason.fromJsString("file_size_limit"))
  }

  @Test
  fun `fromJsString parses user_stopped`() {
    assertEquals(StopReason.USER_STOPPED, StopReason.fromJsString("user_stopped"))
  }

  @Test
  fun `fromJsString parses error`() {
    assertEquals(StopReason.ERROR, StopReason.fromJsString("error"))
  }

  @Test
  fun `fromJsString defaults unknown values to ERROR`() {
    assertEquals(StopReason.ERROR, StopReason.fromJsString("invalid_reason"))
  }
}
