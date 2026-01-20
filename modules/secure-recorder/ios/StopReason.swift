import Foundation

/**
 * Reason why recording was stopped for iOS/iPadOS
 * 
 * Represents the reason a recording session was stopped. Provides conversion to/from
 * JavaScript string format for Expo module communication.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Swift enum (case-based)
 * - camelCase naming (.durationLimit, .fileSizeLimit, .userStopped, .error)
 */
enum StopReason {
  case durationLimit
  case fileSizeLimit
  case userStopped
  case error
  
  /**
   * Convert to string for JavaScript/TypeScript compatibility
   */
  internal func toJsString() -> String {
    switch self {
    case .durationLimit:
      return "duration_limit"
    case .fileSizeLimit:
      return "file_size_limit"
    case .userStopped:
      return "user_stopped"
    case .error:
      return "error"
    }
  }
  
  /**
   * Parse from JavaScript string (for backward compatibility)
   */
  internal static func fromJsString(_ value: String) -> StopReason {
    switch value {
    case "duration_limit":
      return .durationLimit
    case "file_size_limit":
      return .fileSizeLimit
    case "user_stopped":
      return .userStopped
    case "error":
      return .error
    default:
      return .error // Default to error for unknown values
    }
  }
}
