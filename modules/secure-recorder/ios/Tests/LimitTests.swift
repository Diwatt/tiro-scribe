import XCTest
import Foundation

/**
 * Unit tests for Limit (iOS/iPadOS)
 * Tests match Android LimitTest structure and naming
 */
@available(iOS 13.0, *)
class LimitTests: XCTestCase {
  
  func testIsExceededReturnsFalseWhenValueIsBelowLimit() {
    let duration = Limit.Duration(maxValue: 1000, reason: .durationLimit)
    let limit = Limit.duration(duration)
    
    XCTAssertFalse(limit.isExceeded(value: 500), "Value below limit should not be exceeded")
  }
  
  func testIsExceededReturnsTrueWhenValueEqualsLimit() {
    let duration = Limit.Duration(maxValue: 1000, reason: .durationLimit)
    let limit = Limit.duration(duration)
    
    XCTAssertTrue(limit.isExceeded(value: 1000), "Value equal to limit should be exceeded")
  }
  
  func testIsExceededReturnsTrueWhenValueExceedsLimit() {
    let duration = Limit.Duration(maxValue: 1000, reason: .durationLimit)
    let limit = Limit.duration(duration)
    
    XCTAssertTrue(limit.isExceeded(value: 1500), "Value above limit should be exceeded")
  }
  
  func testDurationLimitIsExceededWorksWithMilliseconds() {
    let duration = Limit.Duration(maxValue: 3600000, reason: .durationLimit) // 1 hour
    let limit = Limit.duration(duration)
    
    XCTAssertFalse(limit.isExceeded(value: 30 * 60 * 1000), "30 minutes should not exceed 1 hour limit")
    XCTAssertTrue(limit.isExceeded(value: 2 * 60 * 60 * 1000), "2 hours should exceed 1 hour limit")
  }
  
  func testFileSizeLimitIsExceededWorksWithBytes() {
    let fileSize = Limit.FileSize(maxValue: 1024, reason: .fileSizeLimit) // 1KB
    let limit = Limit.fileSize(fileSize)
    
    XCTAssertFalse(limit.isExceeded(value: 512), "512 bytes should not exceed 1KB limit")
    XCTAssertTrue(limit.isExceeded(value: 2048), "2KB should exceed 1KB limit")
  }
}
