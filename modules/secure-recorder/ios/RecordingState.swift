import Foundation

/**
 * Immutable recording state (thread-safe)
 */
struct RecordingState {
  let isRecording: Bool
  let sessionId: String?
  let filePath: String?
  
  static let idle = RecordingState(isRecording: false, sessionId: nil, filePath: nil)
}
