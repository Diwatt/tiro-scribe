import XCTest
import Foundation

/**
 * Unit tests for StopReason (iOS/iPadOS)
 * Tests match Android StopReasonTest structure and naming
 */
@available(iOS 13.0, *)
class StopReasonTests: XCTestCase {
  
  func testToJsStringReturnsCorrectValues() {
    XCTAssertEqual("duration_limit", StopReason.durationLimit.toJsString())
    XCTAssertEqual("file_size_limit", StopReason.fileSizeLimit.toJsString())
    XCTAssertEqual("user_stopped", StopReason.userStopped.toJsString())
    XCTAssertEqual("error", StopReason.error.toJsString())
  }
  
  func testFromJsStringParsesValidValues() {
    XCTAssertEqual(StopReason.durationLimit, StopReason.fromJsString("duration_limit"))
    XCTAssertEqual(StopReason.fileSizeLimit, StopReason.fromJsString("file_size_limit"))
    XCTAssertEqual(StopReason.userStopped, StopReason.fromJsString("user_stopped"))
    XCTAssertEqual(StopReason.error, StopReason.fromJsString("error"))
  }
  
  func testFromJsStringReturnsErrorForUnknownValues() {
    XCTAssertEqual(StopReason.error, StopReason.fromJsString("unknown"))
    XCTAssertEqual(StopReason.error, StopReason.fromJsString(""))
    XCTAssertEqual(StopReason.error, StopReason.fromJsString("invalid_reason"))
  }
  
  func testToJsStringAndFromJsStringAreInverseOperations() {
    let reasons: [StopReason] = [.durationLimit, .fileSizeLimit, .userStopped, .error]
    
    for originalReason in reasons {
      let jsString = originalReason.toJsString()
      let parsedReason = StopReason.fromJsString(jsString)
      XCTAssertEqual(originalReason, parsedReason, "toJsString and fromJsString should be inverse")
    }
  }
}
