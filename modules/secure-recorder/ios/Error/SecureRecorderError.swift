import Foundation

/**
 * Error types for SecureRecorder operations on iOS/iPadOS
 * 
 * Represents errors that can occur during recording operations. Provides error codes
 * and messages that are converted to JavaScript {code, message} objects by Expo framework.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Swift enum with associated values
 * - code is computed property (switch-based)
 * - message is computed property (delegates to localizedDescription)
 */
public enum SecureRecorderError: Error {
  case recordingInProgress
  case permissionDenied
  case noRecordingInProgress
  case initializationFailed(String)
  case recordingFailed(String)
  case stopFailed(String)
  case keychainError(String)
  
  /**
   * Error code for JavaScript/TypeScript compatibility
   * Matches TypeScript SecureRecorderError.code values
   */
  public var code: String {
    switch self {
    case .recordingInProgress:
      return "RECORDING_IN_PROGRESS"
    case .permissionDenied:
      return "PERMISSION_DENIED"
    case .noRecordingInProgress:
      return "NO_RECORDING_IN_PROGRESS"
    case .initializationFailed:
      return "INITIALIZATION_FAILED"
    case .recordingFailed:
      return "RECORDING_FAILED"
    case .stopFailed:
      return "STOP_FAILED"
    case .keychainError:
      return "KEYCHAIN_ERROR"
    }
  }
  
  /**
   * Error message for JavaScript/TypeScript compatibility
   * Matches TypeScript SecureRecorderError.message values
   */
  public var message: String {
    return localizedDescription
  }
  
  public var localizedDescription: String {
    switch self {
    case .recordingInProgress:
      return "Recording already in progress"
    case .permissionDenied:
      return "Microphone permission not granted"
    case .noRecordingInProgress:
      return "No recording in progress"
    case .initializationFailed(let message):
      return "Initialization failed: \(message)"
    case .recordingFailed(let message):
      return "Failed to start recording: \(message)"
    case .stopFailed(let message):
      return "Failed to stop recording: \(message)"
    case .keychainError(let message):
      return "Keychain error: \(message)"
    }
  }
}
