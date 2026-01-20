package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for Limit
 * Tests match iOS LimitTests structure and naming
 */
class LimitTest {

  @Test
  fun `Duration limit has correct default value`() {
    val durationLimit = Limit.Duration(Limit.Duration.DEFAULT_MS)
    
    assertEquals("Default duration should be 4 hours", 4 * 60 * 60 * 1000L, durationLimit.maxValueMs)
    assertEquals("Duration limit reason should be DURATION_LIMIT", StopReason.DURATION_LIMIT, durationLimit.reason)
  }

  @Test
  fun `FileSize limit has correct default value`() {
    val fileSizeLimit = Limit.FileSize(Limit.FileSize.DEFAULT_BYTES)
    
    assertEquals("Default file size should be 500MB", 500L * 1024 * 1024, fileSizeLimit.maxSizeBytes)
    assertEquals("FileSize limit reason should be FILE_SIZE_LIMIT", StopReason.FILE_SIZE_LIMIT, fileSizeLimit.reason)
  }

  @Test
  fun `Duration limit maxValue matches maxValueMs`() {
    val durationLimit = Limit.Duration(1000L)
    
    assertEquals("maxValue should match maxValueMs for Duration", 1000L, durationLimit.maxValue)
  }

  @Test
  fun `FileSize limit maxValue matches maxSizeBytes`() {
    val fileSizeLimit = Limit.FileSize(2000L)
    
    assertEquals("maxValue should match maxSizeBytes for FileSize", 2000L, fileSizeLimit.maxValue)
  }

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

  @Test
  fun `Duration limit data class equality`() {
    val limit1 = Limit.Duration(1000L)
    val limit2 = Limit.Duration(1000L)
    val limit3 = Limit.Duration(2000L)
    
    assertEquals("Identical duration limits should be equal", limit1, limit2)
    assertNotEquals("Different duration limits should not be equal", limit1, limit3)
  }

  @Test
  fun `FileSize limit data class equality`() {
    val limit1 = Limit.FileSize(1000L)
    val limit2 = Limit.FileSize(1000L)
    val limit3 = Limit.FileSize(2000L)
    
    assertEquals("Identical file size limits should be equal", limit1, limit2)
    assertNotEquals("Different file size limits should not be equal", limit1, limit3)
  }
}
