package expo.modules.securerecorder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for LimitRegistry defaults.
 * The registry's own limits (4h duration, 500MB file size) are verified, one boundary per test.
 */
class LimitRegistryTest {

  private val registry: LimitRegistry = LimitRegistry()

  @Test
  fun `registry exposes the four hour duration limit`() {
    val durationLimit = registry.getLimits().filterIsInstance<Limit.Duration>().first()

    assertEquals(Limit.Duration.DEFAULT_MS, durationLimit.maxValue)
  }

  @Test
  fun `registry exposes the 500MB file size limit`() {
    val fileSizeLimit = registry.getLimits().filterIsInstance<Limit.FileSize>().first()

    assertEquals(Limit.FileSize.DEFAULT_BYTES, fileSizeLimit.maxValue)
  }

  @Test
  fun `registry exposes exactly two limits`() {
    assertEquals(2, registry.getLimits().size)
  }

  @Test
  fun `registry duration limit is not exceeded for a one second recording`() {
    val durationLimit = registry.getLimits().filterIsInstance<Limit.Duration>().first()

    assertFalse(durationLimit.isExceeded(1000L))
  }

  @Test
  fun `registry duration limit is exceeded past its maximum`() {
    val durationLimit = registry.getLimits().filterIsInstance<Limit.Duration>().first()

    assertTrue(durationLimit.isExceeded(durationLimit.maxValue + 1000L))
  }

  @Test
  fun `registry duration limit carries the DURATION_LIMIT stop reason`() {
    val durationLimit = registry.getLimits().filterIsInstance<Limit.Duration>().first()

    assertEquals(StopReason.DURATION_LIMIT, durationLimit.reason)
  }

  @Test
  fun `registry file size limit is not exceeded for a small file`() {
    val fileSizeLimit = registry.getLimits().filterIsInstance<Limit.FileSize>().first()

    assertFalse(fileSizeLimit.isExceeded(1000L))
  }

  @Test
  fun `registry file size limit is exceeded past its maximum`() {
    val fileSizeLimit = registry.getLimits().filterIsInstance<Limit.FileSize>().first()

    assertTrue(fileSizeLimit.isExceeded(fileSizeLimit.maxValue + 1000L))
  }

  @Test
  fun `registry file size limit carries the FILE_SIZE_LIMIT stop reason`() {
    val fileSizeLimit = registry.getLimits().filterIsInstance<Limit.FileSize>().first()

    assertEquals(StopReason.FILE_SIZE_LIMIT, fileSizeLimit.reason)
  }
}
