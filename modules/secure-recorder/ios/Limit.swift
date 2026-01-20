import Foundation

/**
 * Represents a single recording limit for iOS/iPadOS
 * 
 * Defines recording limits (duration or file size) to prevent exceeding memory
 * constraints during streaming decryption. Checks if a value exceeds the limit.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Enum with associated structs (Duration, FileSize)
 * - maxValue is Int64
 * - Uses static factory methods (durationDefault(), fileSizeDefault())
 */
enum Limit {
  case duration(Duration)
  case fileSize(FileSize)
  
  /**
   * Maximum value for this limit
   * 
   * Returns the maximum allowed value (duration in milliseconds or file size in bytes).
   */
  internal var maxValue: Int64 {
    switch self {
    case .duration(let limit):
      return limit.maxValue
    case .fileSize(let limit):
      return limit.maxValue
    }
  }
  
  internal var reason: StopReason {
    switch self {
    case .duration(let limit):
      return limit.reason
    case .fileSize(let limit):
      return limit.reason
    }
  }
  
  /**
   * Check if the given value exceeds this limit
   * 
   * Returns true if the value is greater than or equal to the maximum allowed value.
   */
  internal func isExceeded(value: Int64) -> Bool {
    return value >= maxValue
  }
  
  /**
   * Duration limit
   * 
   * Represents a maximum recording duration in milliseconds.
   */
  internal struct Duration {
    internal let maxValue: Int64 // milliseconds
    internal let reason: StopReason
    
    internal static let `default` = Duration(
      maxValue: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      reason: .durationLimit
    )
  }
  
  /**
   * File size limit
   * 
   * Represents a maximum file size in bytes.
   */
  internal struct FileSize {
    internal let maxValue: Int64 // bytes
    internal let reason: StopReason
    
    internal static let `default` = FileSize(
      maxValue: 500 * 1024 * 1024, // 500MB
      reason: .fileSizeLimit
    )
  }
  
  internal static func durationDefault() -> Limit {
    return .duration(.default)
  }
  
  internal static func fileSizeDefault() -> Limit {
    return .fileSize(.default)
  }
}
