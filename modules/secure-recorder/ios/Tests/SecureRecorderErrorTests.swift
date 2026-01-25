import XCTest
import Foundation

/**
 * Unit tests for SecureRecorderError (iOS/iPadOS)
 * Tests error message formatting logic and code uniqueness
 */
@available(iOS 13.0, *)
class SecureRecorderErrorTests: XCTestCase {
  
  func testInitializationFailedErrorFormatsMessageCorrectly() {
    let customMessage = "Custom initialization error"
    let error = SecureRecorderError.initializationFailed(customMessage)
    
    XCTAssertEqual("INITIALIZATION_FAILED", error.code)
    XCTAssertEqual("Initialization failed: \(customMessage)", error.message)
  }
  
  func testRecordingFailedErrorFormatsMessageCorrectly() {
    let customMessage = "Custom recording error"
    let error = SecureRecorderError.recordingFailed(customMessage)
    
    XCTAssertEqual("RECORDING_FAILED", error.code)
    XCTAssertEqual("Failed to start recording: \(customMessage)", error.message)
  }
  
  func testStopFailedErrorFormatsMessageCorrectly() {
    let customMessage = "Custom stop error"
    let error = SecureRecorderError.stopFailed(customMessage)
    
    XCTAssertEqual("STOP_FAILED", error.code)
    XCTAssertEqual("Failed to stop recording: \(customMessage)", error.message)
  }
  
  func testKeychainErrorFormatsMessageCorrectly() {
    let customMessage = "Custom keychain error"
    let error = SecureRecorderError.keychainError(customMessage)
    
    XCTAssertEqual("KEYCHAIN_ERROR", error.code)
    XCTAssertEqual("Keychain error: \(customMessage)", error.message)
  }
  
  func testAllErrorCodesAreUnique() {
    let codes = [
      SecureRecorderError.recordingInProgress.code,
      SecureRecorderError.permissionDenied.code,
      SecureRecorderError.noRecordingInProgress.code,
      SecureRecorderError.initializationFailed("").code,
      SecureRecorderError.recordingFailed("").code,
      SecureRecorderError.stopFailed("").code,
      SecureRecorderError.keychainError("").code
    ]
    
    let uniqueCodes = Set(codes)
    XCTAssertEqual(codes.count, uniqueCodes.count, "All error codes should be unique")
  }
}
