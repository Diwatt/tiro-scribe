package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for Limit
 * Tests isExceeded logic and equality
 */
class LimitTest {

  @Test
  fun `isExceeded returns false when value is below limit`() {
    val limit = Limit.Duration(1000L)
    
    assertFalse("Value below limit should not be exceeded", limit.isExceeded(500L))
  }

  @Test
  fun `isExceeded returns true when value equals limit`() {
    val limit = Limit.Duration(1000L)
    
    assertTrue("Value equal to limit should be exceeded", limit.isExceeded(1000L))
  }

  @Test
  fun `isExceeded returns true when value exceeds limit`() {
    val limit = Limit.Duration(1000L)
    
    assertTrue("Value above limit should be exceeded", limit.isExceeded(1500L))
  }

  @Test
  fun `Duration limit isExceeded works with milliseconds`() {
    val limit = Limit.Duration(3600000L) // 1 hour
    
    assertFalse("30 minutes should not exceed 1 hour limit", limit.isExceeded(30 * 60 * 1000L))
    assertTrue("2 hours should exceed 1 hour limit", limit.isExceeded(2 * 60 * 60 * 1000L))
  }

  @Test
  fun `FileSize limit isExceeded works with bytes`() {
    val limit = Limit.FileSize(1024L) // 1KB
    
    assertFalse("512 bytes should not exceed 1KB limit", limit.isExceeded(512L))
    assertTrue("2KB should exceed 1KB limit", limit.isExceeded(2048L))
  }
}
