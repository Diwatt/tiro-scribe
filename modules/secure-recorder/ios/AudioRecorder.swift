import Foundation
import AVFoundation

/**
 * Audio recorder implementation for iOS/iPadOS
 * 
 * Provides audio recording abstraction using AudioRecord wrapper.
 * Configures AVAudioSession for recording and creates AudioRecord instances.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses AudioRecord wrapper (isomorphic with Android AudioRecord API)
 * - start() returns AudioRecord instance
 * - stop() takes AudioRecord parameter
 * - Throws SecureRecorderError enum
 * - Configures AVAudioSession for recording
 * - AudioRecord handles push-to-pull conversion internally
 */
class AudioRecorder {
  private let sessionFactory: () -> AudioSessionProtocol
  private let factory: () -> AVAudioEngine
  private let audioConfig: AudioConfig
  
  internal init(
    audioConfig: AudioConfig,
    sessionFactory: @escaping () -> AudioSessionProtocol = { AVAudioSession.sharedInstance() },
    factory: @escaping () -> AVAudioEngine = { AVAudioEngine() }
  ) {
    self.audioConfig = audioConfig
    self.sessionFactory = sessionFactory
    self.factory = factory
  }
  
  /**
   * Start audio recording
   * Configures AVAudioSession and creates AudioRecord wrapper
   * 
   * @return AudioRecord instance (isomorphic with Android)
   * @throws SecureRecorderError if audio session configuration or engine creation fails
   */
  internal func start() throws -> AudioRecord {
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
    
    // Prepare engine (doesn't start it - that happens in AudioRecord.startRecording())
    engine.prepare()
    
    // Create session cleanup closure
    let onRelease = createSessionCleanup()
    
    // Create AudioRecord wrapper (isomorphic with Android)
    let audioRecord = AudioRecord(
      engine: engine,
      inputNode: inputNode,
      audioConfig: audioConfig,
      onRelease: onRelease
    )
    
    return audioRecord
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
   * Stops and releases AudioRecord
   * 
   * Isomorphic: Matches Android AudioRecorder.stop() behavior
   * Safe to call multiple times (idempotent)
   */
  internal func stop(record: AudioRecord) {
    // Stop recording if active
    if record.recordingState == AudioRecord.RECORDSTATE_RECORDING {
      record.stop()
    }
    
    // Release resources (handles session cleanup via onRelease closure)
    if record.state != AudioRecord.STATE_UNINITIALIZED {
      record.release()
    }
  }
}
