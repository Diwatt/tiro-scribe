import Foundation

/**
 * Recording state enum for iOS/iPadOS
 * 
 * Represents the current state of the recording session. Provides conversion to/from
 * JavaScript string format for Expo module communication.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Swift enum (case-based)
 * - camelCase naming (.inactive, .recording, .stopped)
 */
enum RecorderState {
  case inactive
  case recording
  case paused
  case stopped
  
  /**
   * Convert to string for JavaScript/TypeScript compatibility
   */
  internal func toJsString() -> String {
    switch self {
    case .inactive:
      return "inactive"
    case .recording:
      return "recording"
    case .paused:
      return "paused"
    case .stopped:
      return "stopped"
    }
  }
  
  /**
   * Parse from JavaScript string
   * 
   * Converts string representation back to RecorderState enum.
   * Used primarily for testing round-trip conversion (toJsString -> fromJsString).
   */
  internal static func fromJsString(_ value: String) -> RecorderState {
    switch value {
    case "inactive":
      return .inactive
    case "recording":
      return .recording
    case "paused":
      return .paused
    case "stopped":
      return .stopped
    default:
      return .inactive // Default to inactive for unknown values
    }
  }
  
  /**
   * Calculate state from isRecording flag, isPaused flag, and filePath
   * Used internally to convert from State struct to RecorderState enum
   */
  internal static func fromState(isRecording: Bool, isPaused: Bool = false, filePath: String?) -> RecorderState {
    if isRecording {
      return .recording
    } else if isPaused {
      return .paused
    } else if filePath != nil {
      return .stopped
    } else {
      return .inactive
    }
  }
}
