import Foundation
import AVFoundation

/**
 * Audio recorder implementation for iOS/iPadOS
 * 
 * Provides audio recording abstraction using AVAudioEngine and AVAudioInputNode.
 * Configures AVAudioSession for recording and manages audio engine lifecycle.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses AVAudioEngine/AVAudioInputNode (iOS audio framework)
 * - start() returns (AVAudioEngine, AVAudioInputNode) tuple
 * - stop() takes engine and node parameters
 * - Throws SecureRecorderError enum
 * - Configures AVAudioSession for recording
 * - Tap installation handled by Session (push-based audio capture)
 */
class AudioRecorder {
  private let sessionFactory: () -> AudioSessionProtocol
  private let factory: () -> AVAudioEngine
  
  internal init(
    sessionFactory: @escaping () -> AudioSessionProtocol = { AVAudioSession.sharedInstance() },
    factory: @escaping () -> AVAudioEngine = { AVAudioEngine() }
  ) {
    self.sessionFactory = sessionFactory
    self.factory = factory
  }
  
  /**
   * Start audio recording
   * Configures AVAudioSession and creates AVAudioEngine
   * 
   * @return Tuple of (AVAudioEngine, AVAudioInputNode)
   * @throws SecureRecorderError if audio session configuration or engine creation fails
   */
  internal func start() throws -> (AVAudioEngine, AVAudioInputNode) {
    // Configure audio session for recording
    let audioSession = sessionFactory()
    
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: [])
      try audioSession.setActive(true, options: [])
    } catch {
      throw SecureRecorderError.initializationFailed("Failed to configure audio session: \(error.localizedDescription)")
    }
    
    // Create and prepare audio engine
    let engine = factory()
    let inputNode = engine.inputNode
    
    // Prepare engine (doesn't start it - that happens when tap is installed)
    engine.prepare()
    
    return (engine, inputNode)
  }
  
  /**
   * Create session cleanup closure for AudioRecord
   * 
   * Returns a closure that deactivates AVAudioSession when called.
   * This allows AudioRecord to handle session cleanup during release()
   * while keeping AudioRecord decoupled from AVAudioSession directly.
   */
  internal func createSessionCleanup() -> () -> Void {
    return { [weak self] in
      guard let self = self else { return }
      let audioSession = self.sessionFactory()
      do {
        try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
      } catch {
        // Session deactivation failure is acceptable during cleanup
        // Audio session will be reset on next recording start
      }
    }
  }
  
  /**
   * Stop audio recording
   * Stops engine and removes tap from input node
   * 
   * Safe to call multiple times (idempotent)
   * 
   * Note: This method is kept for backward compatibility.
   * New code should use AudioRecord.stop()/release() which handle session cleanup.
   */
  internal func stop(engine: AVAudioEngine, inputNode: AVAudioInputNode) {
    // Remove tap (safe to call even if no tap exists)
    inputNode.removeTap(onBus: 0)
    
    // Stop engine if running
    if engine.isRunning {
      engine.stop()
    }
    
    // Deactivate audio session (best effort - failures are non-critical during cleanup)
    let audioSession = sessionFactory()
    do {
      try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      // Session deactivation failure is acceptable during cleanup
      // Audio session will be reset on next recording start
    }
  }
}
