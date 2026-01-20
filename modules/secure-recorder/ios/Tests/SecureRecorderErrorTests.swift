import XCTest
import Foundation

/**
 * Unit tests for SecureRecorderError (iOS/iPadOS)
 * Tests error code and message properties for all error cases
 */
@available(iOS 13.0, *)
class SecureRecorderErrorTests: XCTestCase {
  
  func testRecordingInProgressError() {
    let error = SecureRecorderError.recordingInProgress
    
    XCTAssertEqual("RECORDING_IN_PROGRESS", error.code)
    XCTAssertEqual("Recording already in progress", error.message)
    XCTAssertEqual("Recording already in progress", error.localizedDescription)
  }
  
  func testPermissionDeniedError() {
    let error = SecureRecorderError.permissionDenied
    
    XCTAssertEqual("PERMISSION_DENIED", error.code)
    XCTAssertEqual("Microphone permission not granted", error.message)
    XCTAssertEqual("Microphone permission not granted", error.localizedDescription)
  }
  
  func testNoRecordingInProgressError() {
    let error = SecureRecorderError.noRecordingInProgress
    
    XCTAssertEqual("NO_RECORDING_IN_PROGRESS", error.code)
    XCTAssertEqual("No recording in progress", error.message)
    XCTAssertEqual("No recording in progress", error.localizedDescription)
  }
  
  func testInitializationFailedError() {
    let customMessage = "Custom initialization error"
    let error = SecureRecorderError.initializationFailed(customMessage)
    
    XCTAssertEqual("INITIALIZATION_FAILED", error.code)
    XCTAssertEqual("Initialization failed: \(customMessage)", error.message)
    XCTAssertEqual("Initialization failed: \(customMessage)", error.localizedDescription)
  }
  
  func testRecordingFailedError() {
    let customMessage = "Custom recording error"
    let error = SecureRecorderError.recordingFailed(customMessage)
    
    XCTAssertEqual("RECORDING_FAILED", error.code)
    XCTAssertEqual("Failed to start recording: \(customMessage)", error.message)
    XCTAssertEqual("Failed to start recording: \(customMessage)", error.localizedDescription)
  }
  
  func testStopFailedError() {
    let customMessage = "Custom stop error"
    let error = SecureRecorderError.stopFailed(customMessage)
    
    XCTAssertEqual("STOP_FAILED", error.code)
    XCTAssertEqual("Failed to stop recording: \(customMessage)", error.message)
    XCTAssertEqual("Failed to stop recording: \(customMessage)", error.localizedDescription)
  }
  
  func testKeychainError() {
    let customMessage = "Custom keychain error"
    let error = SecureRecorderError.keychainError(customMessage)
    
    XCTAssertEqual("KEYCHAIN_ERROR", error.code)
    XCTAssertEqual("Keychain error: \(customMessage)", error.message)
    XCTAssertEqual("Keychain error: \(customMessage)", error.localizedDescription)
  }
  
  func testMessageDelegatesToLocalizedDescription() {
    let error = SecureRecorderError.initializationFailed("test")
    
    XCTAssertEqual(error.localizedDescription, error.message, "message should delegate to localizedDescription")
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
