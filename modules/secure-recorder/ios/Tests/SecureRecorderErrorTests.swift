import XCTest
@testable import SecureRecorder

/**
 * Unit tests for SecureRecorderError (iOS/iPadOS)
 * Tests error message formatting logic and code uniqueness
 */
@available(iOS 13.0, *)
class SecureRecorderErrorTests: XCTestCase {
  
  func testInitializationFailedExposesExpectedCode() {
    let error = SecureRecorderError.initializationFailed("Custom initialization error")

    XCTAssertEqual("INITIALIZATION_FAILED", error.code)
  }

  func testInitializationFailedIncludesCustomMessage() {
    let error = SecureRecorderError.initializationFailed("Custom initialization error")

    XCTAssertEqual("Initialization failed: Custom initialization error", error.message)
  }

  func testRecordingFailedExposesExpectedCode() {
    let error = SecureRecorderError.recordingFailed("Custom recording error")

    XCTAssertEqual("RECORDING_FAILED", error.code)
  }

  func testRecordingFailedIncludesCustomMessage() {
    let error = SecureRecorderError.recordingFailed("Custom recording error")

    XCTAssertEqual("Failed to start recording: Custom recording error", error.message)
  }

  func testStopFailedExposesExpectedCode() {
    let error = SecureRecorderError.stopFailed("Custom stop error")

    XCTAssertEqual("STOP_FAILED", error.code)
  }

  func testStopFailedIncludesCustomMessage() {
    let error = SecureRecorderError.stopFailed("Custom stop error")

    XCTAssertEqual("Failed to stop recording: Custom stop error", error.message)
  }

  func testKeychainErrorExposesExpectedCode() {
    let error = SecureRecorderError.keychainError("Custom keychain error")

    XCTAssertEqual("KEYCHAIN_ERROR", error.code)
  }

  func testKeychainErrorIncludesCustomMessage() {
    let error = SecureRecorderError.keychainError("Custom keychain error")

    XCTAssertEqual("Keychain error: Custom keychain error", error.message)
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
