import Foundation

/**
 * Error types for SecureRecorder operations
 */
enum SecureRecorderError: Error {
  case recordingInProgress
  case permissionDenied
  case noRecordingInProgress
  case initializationFailed(String)
  case recordingFailed(String)
  case stopFailed(String)
  case keychainError(String)
  
  var localizedDescription: String {
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
