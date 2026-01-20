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
 * - installTap() method for buffer callbacks (push-based audio capture)
 * - Throws SecureRecorderError enum
 * - Configures AVAudioSession for recording
 */
class AudioRecorder {
  // Internal methods
  /**
   * Start audio recording
   * Configures AVAudioSession and creates AVAudioEngine
   * 
   * @return Tuple of (AVAudioEngine, AVAudioInputNode)
   * @throws SecureRecorderError if audio session configuration or engine creation fails
   */
  internal func start() throws -> (AVAudioEngine, AVAudioInputNode) {
    // Configure audio session for recording
    let audioSession = AVAudioSession.sharedInstance()
    
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: [])
      try audioSession.setActive(true)
    } catch {
      throw SecureRecorderError.initializationFailed("Failed to configure audio session: \(error.localizedDescription)")
    }
    
    // Create and prepare audio engine
    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    
    // Prepare engine (doesn't start it - that happens when tap is installed)
    engine.prepare()
    
    return (engine, inputNode)
  }
  
  /**
   * Stop audio recording
   * Stops engine and removes tap from input node
   * 
   * Safe to call multiple times (idempotent)
   */
  internal func stop(engine: AVAudioEngine, inputNode: AVAudioInputNode) {
    // Remove tap (safe to call even if no tap exists)
    inputNode.removeTap(onBus: 0)
    
    // Stop engine if running
    if engine.isRunning {
      engine.stop()
    }
    
    // Deactivate audio session (best effort - failures are non-critical during cleanup)
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      // Session deactivation failure is acceptable during cleanup
      // Audio session will be reset on next recording start
    }
  }
  
  /**
   * Install tap on input node to capture audio buffers
   * 
   * Installs a tap on the input node to receive audio buffers via callback.
   * Automatically starts the audio engine after installing the tap.
   * 
   * @param inputNode Input node to tap
   * @param bufferSize Buffer size in frames
   * @param format Audio format for the tap
   * @param block Callback invoked for each audio buffer
   */
  internal func installTap(
    on inputNode: AVAudioInputNode,
    bufferSize: AVAudioFrameCount,
    format: AVAudioFormat,
    block: @escaping (AVAudioPCMBuffer, AVAudioTime) -> Void
  ) {
    // Remove existing tap if present (safe to call even if no tap exists)
    inputNode.removeTap(onBus: 0)
    
    // Install tap
    inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format, block: block)
    
    // Start engine to begin capturing
    // Note: Engine must be started after tap is installed
    guard let engine = inputNode.engine else {
      inputNode.removeTap(onBus: 0)
      return
    }
    
    do {
      try engine.start()
    } catch {
      // If engine start fails, remove tap
      inputNode.removeTap(onBus: 0)
    }
  }
}
