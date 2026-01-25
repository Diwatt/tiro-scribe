import XCTest
@testable import SecureRecorderModule

/**
 * Tests for LimitRegistry
 * 
 * ISOMORPHIC: These tests mirror the Android LimitRegistryTest
 * to ensure identical behavior across platforms.
 */
class LimitRegistryTests: XCTestCase {
  
  var limiter: LimitRegistry!
  
  override func setUp() {
    super.setUp()
    limiter = LimitRegistry()
  }
  
  func testDurationLimitNotReached() {
    // Arrange
    let elapsedTime: Int64 = 1000 // 1 second in milliseconds
    let limits = limiter.getLimits()
    guard let durationLimit = limits.first(where: {
      if case .duration = $0 { return true }
      return false
    }) else {
      XCTFail("Duration limit not found")
      return
    }
    
    // Act
    let result = durationLimit.isExceeded(value: elapsedTime)
    
    // Assert
    XCTAssertFalse(result, "Duration limit should not be exceeded for 1 second")
  }
  
  func testDurationLimitReached() {
    // Arrange
    let limits = limiter.getLimits()
    guard let durationLimit = limits.first(where: {
      if case .duration = $0 { return true }
      return false
    }) else {
      XCTFail("Duration limit not found")
      return
    }
    let elapsedTime = durationLimit.maxValue + 1000 // Exceed by 1 second (1000ms)
    
    // Act
    let result = durationLimit.isExceeded(value: elapsedTime)
    
    // Assert
    XCTAssertTrue(result, "Duration limit should be exceeded when time exceeds limit")
    XCTAssertEqual(durationLimit.reason, .durationLimit, "Should have durationLimit reason")
  }
  
  func testDurationLimitAtBoundary() {
    // Arrange
    let limits = limiter.getLimits()
    guard let durationLimit = limits.first(where: {
      if case .duration = $0 { return true }
      return false
    }) else {
      XCTFail("Duration limit not found")
      return
    }
    
    // Act
    let atBoundary = durationLimit.isExceeded(value: durationLimit.maxValue)
    let justBelow = durationLimit.isExceeded(value: durationLimit.maxValue - 1)
    
    // Assert
    XCTAssertTrue(atBoundary, "Duration limit should be exceeded at boundary")
    XCTAssertFalse(justBelow, "Duration limit should not be exceeded just below boundary")
  }
  
  func testFileSizeLimitNotReached() {
    // Arrange
    let fileSize: Int64 = 1000 // 1 KB
    let limits = limiter.getLimits()
    guard let fileSizeLimit = limits.first(where: {
      if case .fileSize = $0 { return true }
      return false
    }) else {
      XCTFail("File size limit not found")
      return
    }
    
    // Act
    let result = fileSizeLimit.isExceeded(value: fileSize)
    
    // Assert
    XCTAssertFalse(result, "File size limit should not be exceeded for 1 KB")
  }
  
  func testFileSizeLimitReached() {
    // Arrange
    let limits = limiter.getLimits()
    guard let fileSizeLimit = limits.first(where: {
      if case .fileSize = $0 { return true }
      return false
    }) else {
      XCTFail("File size limit not found")
      return
    }
    let fileSize = fileSizeLimit.maxValue + 1000 // Exceed by 1 KB
    
    // Act
    let result = fileSizeLimit.isExceeded(value: fileSize)
    
    // Assert
    XCTAssertTrue(result, "File size limit should be exceeded when size exceeds limit")
    XCTAssertEqual(fileSizeLimit.reason, .fileSizeLimit, "Should have fileSizeLimit reason")
  }
  
  func testFileSizeLimitAtBoundary() {
    // Arrange
    let limits = limiter.getLimits()
    guard let fileSizeLimit = limits.first(where: {
      if case .fileSize = $0 { return true }
      return false
    }) else {
      XCTFail("File size limit not found")
      return
    }
    
    // Act
    let atBoundary = fileSizeLimit.isExceeded(value: fileSizeLimit.maxValue)
    let justBelow = fileSizeLimit.isExceeded(value: fileSizeLimit.maxValue - 1)
    
    // Assert
    XCTAssertTrue(atBoundary, "File size limit should be exceeded at boundary")
    XCTAssertFalse(justBelow, "File size limit should not be exceeded just below boundary")
  }
  
}
