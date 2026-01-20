package expo.modules.securerecorder

import org.junit.Test
import org.junit.Assert.*

/**
 * Tests for LimitRegistry
 * 
 * ISOMORPHIC: These tests mirror the iOS LimitRegistryTests
 * to ensure identical behavior across platforms.
 */
class LimitRegistryTest {
  
  private val limiter: LimitRegistry = LimitRegistry()
  
  @Test
  fun testDurationLimitNotReached() {
    // Arrange
    val elapsedTime = 1000L // 1 second
    val limits = limiter.getLimits()
    val durationLimit = limits.first { it is Limit.Duration } as Limit.Duration
    
    // Act
    val result = durationLimit.isExceeded(elapsedTime)
    
    // Assert
    assertFalse("Duration limit should not be exceeded for 1 second", result)
  }
  
  @Test
  fun testDurationLimitReached() {
    // Arrange
    val limits = limiter.getLimits()
    val durationLimit = limits.first { it is Limit.Duration } as Limit.Duration
    val elapsedTime = durationLimit.maxValue + 1000L // Exceed by 1 second
    
    // Act
    val result = durationLimit.isExceeded(elapsedTime)
    
    // Assert
    assertTrue("Duration limit should be exceeded when time exceeds limit", result)
    assertEquals("Should have DURATION_LIMIT reason", StopReason.DURATION_LIMIT, durationLimit.reason)
  }
  
  @Test
  fun testDurationLimitAtBoundary() {
    // Arrange
    val limits = limiter.getLimits()
    val durationLimit = limits.first { it is Limit.Duration } as Limit.Duration
    
    // Act
    val atBoundary = durationLimit.isExceeded(durationLimit.maxValue)
    val justBelow = durationLimit.isExceeded(durationLimit.maxValue - 1)
    
    // Assert
    assertTrue("Duration limit should be exceeded at boundary", atBoundary)
    assertFalse("Duration limit should not be exceeded just below boundary", justBelow)
  }
  
  @Test
  fun testFileSizeLimitNotReached() {
    // Arrange
    val fileSize = 1000L // 1 KB
    val limits = limiter.getLimits()
    val fileSizeLimit = limits.first { it is Limit.FileSize } as Limit.FileSize
    
    // Act
    val result = fileSizeLimit.isExceeded(fileSize)
    
    // Assert
    assertFalse("File size limit should not be exceeded for 1 KB", result)
  }
  
  @Test
  fun testFileSizeLimitReached() {
    // Arrange
    val limits = limiter.getLimits()
    val fileSizeLimit = limits.first { it is Limit.FileSize } as Limit.FileSize
    val fileSize = fileSizeLimit.maxValue + 1000L // Exceed by 1 KB
    
    // Act
    val result = fileSizeLimit.isExceeded(fileSize)
    
    // Assert
    assertTrue("File size limit should be exceeded when size exceeds limit", result)
    assertEquals("Should have FILE_SIZE_LIMIT reason", StopReason.FILE_SIZE_LIMIT, fileSizeLimit.reason)
  }
  
  @Test
  fun testFileSizeLimitAtBoundary() {
    // Arrange
    val limits = limiter.getLimits()
    val fileSizeLimit = limits.first { it is Limit.FileSize } as Limit.FileSize
    
    // Act
    val atBoundary = fileSizeLimit.isExceeded(fileSizeLimit.maxValue)
    val justBelow = fileSizeLimit.isExceeded(fileSizeLimit.maxValue - 1)
    
    // Assert
    assertTrue("File size limit should be exceeded at boundary", atBoundary)
    assertFalse("File size limit should not be exceeded just below boundary", justBelow)
  }
  
  @Test
  fun testMaxDurationIs4Hours() {
    // Arrange & Act
    val limits = limiter.getLimits()
    val durationLimit = limits.first { it is Limit.Duration } as Limit.Duration
    val expectedMs = 4 * 60 * 60 * 1000L // 4 hours
    
    // Assert
    assertEquals("Max duration should be 4 hours", expectedMs, durationLimit.maxValue)
  }
  
  @Test
  fun testMaxFileSizeIs500MB() {
    // Arrange & Act
    val limits = limiter.getLimits()
    val fileSizeLimit = limits.first { it is Limit.FileSize } as Limit.FileSize
    val expectedBytes = 500L * 1024 * 1024 // 500MB
    
    // Assert
    assertEquals("Max file size should be 500MB", expectedBytes, fileSizeLimit.maxValue)
  }
}
