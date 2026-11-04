package expo.modules.securerecorder

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for Limit.
 * One boundary (below / at / above) per test, for both Duration and FileSize.
 */
class LimitTest {

  @Test
  fun `Duration limit is not exceeded below its maximum`() {
    val limit = Limit.Duration(1000L)

    assertFalse(limit.isExceeded(500L))
  }

  @Test
  fun `Duration limit is exceeded at its maximum`() {
    val limit = Limit.Duration(1000L)

    assertTrue(limit.isExceeded(1000L))
  }

  @Test
  fun `Duration limit is exceeded above its maximum`() {
    val limit = Limit.Duration(1000L)

    assertTrue(limit.isExceeded(1500L))
  }

  @Test
  fun `FileSize limit is not exceeded below its maximum`() {
    val limit = Limit.FileSize(1024L)

    assertFalse(limit.isExceeded(512L))
  }

  @Test
  fun `FileSize limit is exceeded at its maximum`() {
    val limit = Limit.FileSize(1024L)

    assertTrue(limit.isExceeded(1024L))
  }

  @Test
  fun `FileSize limit is exceeded above its maximum`() {
    val limit = Limit.FileSize(1024L)

    assertTrue(limit.isExceeded(2048L))
  }
}
