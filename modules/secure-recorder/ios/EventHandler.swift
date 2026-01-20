import Foundation

/**
 * Handles recording events for iOS/iPadOS
 * 
 * Coordinates limit reached and error handling. Automatically stops recording when
 * limits are exceeded and notifies handlers. Manages error state transitions.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Wraps onLimitReached in Task { @MainActor } (audio callback runs on audio thread, needs main thread dispatch)
 * - onStop throws SecureRecorderError (needs try-catch)
 * - Handles stop() failure gracefully (still notifies handler with filePath if stop fails)
 */
class EventHandler {
  // Private properties
  private let sessionId: String
  private let outputFile: URL
  private let stateManager: StateManager
  private let onStop: () throws -> String
  private let onLimitReached: ((StopReason, String, String) async -> Void)?
  
  // Initializer
  internal init(
    sessionId: String,
    outputFile: URL,
    stateManager: StateManager,
    onStop: @escaping () throws -> String,
    onLimitReached: ((StopReason, String, String) async -> Void)?
  ) {
    self.sessionId = sessionId
    self.outputFile = outputFile
    self.stateManager = stateManager
    self.onStop = onStop
    self.onLimitReached = onLimitReached
  }
  
  // Internal methods
  internal func onLimitReached(reason: StopReason) {
    // Dispatch to main queue to safely call stop() (audio callback runs on audio thread)
    Task { @MainActor [weak self] in
      guard let self = self else { return }
      
      do {
        // Auto-stop recording to finalize the file
        let filePath = try self.onStop()
        
        // Notify handler if provided
        if let handler = self.onLimitReached {
          await handler(reason, self.sessionId, filePath)
        }
      } catch {
        // If stop() fails, still notify handler if possible
        if let handler = self.onLimitReached {
          await handler(reason, self.sessionId, self.outputFile.path)
        }
      }
    }
  }
  
  internal func onError(message: String) {
    stateManager.deactivate()
    // Error is logged, state updated
    // Actual cleanup will be handled by SecureRecorderModule
  }
}
