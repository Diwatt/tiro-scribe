import XCTest
import Foundation

/**
 * Unit tests for Limit (iOS/iPadOS)
 * Tests match Android LimitTest structure and naming
 */
@available(iOS 13.0, *)
class LimitTests: XCTestCase {
  
  func testDurationLimitHasCorrectDefaultValue() {
    let durationLimit = Limit.durationDefault()
    
    if case .duration(let limit) = durationLimit {
      XCTAssertEqual(4 * 60 * 60 * 1000, limit.maxValue, "Default duration should be 4 hours")
      XCTAssertEqual(StopReason.durationLimit, limit.reason, "Duration limit reason should be durationLimit")
    } else {
      XCTFail("durationDefault() should return .duration case")
    }
  }
  
  func testFileSizeLimitHasCorrectDefaultValue() {
    let fileSizeLimit = Limit.fileSizeDefault()
    
    if case .fileSize(let limit) = fileSizeLimit {
      XCTAssertEqual(500 * 1024 * 1024, limit.maxValue, "Default file size should be 500MB")
      XCTAssertEqual(StopReason.fileSizeLimit, limit.reason, "FileSize limit reason should be fileSizeLimit")
    } else {
      XCTFail("fileSizeDefault() should return .fileSize case")
    }
  }
  
  func testDurationLimitMaxValueMatchesStructValue() {
    let duration = Limit.Duration.default
    let limit = Limit.duration(duration)
    
    XCTAssertEqual(duration.maxValue, limit.maxValue, "maxValue should match Duration.maxValue")
  }
  
  func testFileSizeLimitMaxValueMatchesStructValue() {
    let fileSize = Limit.FileSize.default
    let limit = Limit.fileSize(fileSize)
    
    XCTAssertEqual(fileSize.maxValue, limit.maxValue, "maxValue should match FileSize.maxValue")
  }
  
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
  
  func testDurationLimitReasonProperty() {
    let duration = Limit.Duration.default
    let limit = Limit.duration(duration)
    
    XCTAssertEqual(StopReason.durationLimit, limit.reason, "Duration limit should have durationLimit reason")
  }
  
  func testFileSizeLimitReasonProperty() {
    let fileSize = Limit.FileSize.default
    let limit = Limit.fileSize(fileSize)
    
    XCTAssertEqual(StopReason.fileSizeLimit, limit.reason, "FileSize limit should have fileSizeLimit reason")
  }
}
