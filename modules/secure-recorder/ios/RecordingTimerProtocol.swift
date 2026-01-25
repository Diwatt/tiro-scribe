import Foundation

/**
 * Protocol for recording timer operations (for testability)
 * 
 * Allows mocking RecordingTimer in tests without requiring real time tracking
 */
internal protocol RecordingTimerProtocol {
  var isActive: Bool { get }
  func activate()
  func deactivate()
  func getElapsedTime() -> Int64
  func getStartTime() -> Int64
}

extension RecordingTimer: RecordingTimerProtocol {}
