import Foundation

/**
 * Recording limit registry for iOS/iPadOS
 * 
 * Maintains a collection of recording limits (duration and file size) to ensure
 * streaming decryption fits in memory. Provides access to all configured limits.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses [Limit] array
 * - Uses static factory methods (.durationDefault(), .fileSizeDefault())
 * 
 * SECURITY: Recording limits to ensure streaming decryption fits in memory
 * - Max duration: 4 hours (configurable)
 * - Max file size: 500MB (derived from duration at 16kHz mono 16-bit)
 */
class LimitRegistry {
  private let limits: [Limit] = [
    .durationDefault(),
    .fileSizeDefault()
  ]
  
  internal func getLimits() -> [Limit] {
    return limits
  }
}
