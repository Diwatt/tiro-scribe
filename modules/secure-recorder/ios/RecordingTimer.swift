import Foundation

/**
 * Recording timer for iOS/iPadOS
 * 
 * Thread-safe timer for recording sessions. Tracks active state and
 * elapsed time using DispatchQueue synchronization. Returns elapsed time in milliseconds.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses DispatchQueue for thread-safe synchronization
 * - Explicit queue-based synchronization (stateQueue.sync)
 * - getElapsedTime() returns milliseconds (Int64)
 * - Returns 0 if not active
 */
class RecordingTimer {
  private let stateQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.timer")
  private var _isActive: Bool = false
  private var startTimeMs: Int64 = 0
  
  internal var isActive: Bool {
    return stateQueue.sync { _isActive }
  }
  
  internal func activate() {
    stateQueue.sync {
      _isActive = true
      startTimeMs = Int64(Date().timeIntervalSince1970 * 1000)
    }
  }
  
  internal func deactivate() {
    stateQueue.sync {
      _isActive = false
      startTimeMs = 0
    }
  }
  
  /**
   * Get elapsed time in milliseconds
   * 
   * Returns the elapsed time since recording started, or 0 if not active.
   */
  internal func getElapsedTime() -> Int64 {
    return stateQueue.sync {
      if !_isActive || startTimeMs == 0 {
        return 0
      }
      let currentTimeMs = Int64(Date().timeIntervalSince1970 * 1000)
      return currentTimeMs - startTimeMs
    }
  }
  
  /**
   * Get start time in milliseconds since epoch
   * 
   * Returns the timestamp when recording was activated, or 0 if not active.
   */
  internal func getStartTime() -> Int64 {
    return stateQueue.sync { startTimeMs }
  }
}
