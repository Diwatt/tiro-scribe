import Foundation

/**
 * Immutable recording state (thread-safe)
 */
internal struct State {
  internal let isRecording: Bool
  internal let sessionId: String?
  internal let filePath: String?
  
  internal static let idle = State(isRecording: false, sessionId: nil, filePath: nil)
}
