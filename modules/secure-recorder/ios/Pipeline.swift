import Foundation
import AVFoundation

/**
 * Handles audio data processing pipeline for iOS/iPadOS
 * 
 * Processes audio buffers from AVAudioEngine tap, encrypts them, and writes to disk.
 * Checks recording limits (duration and file size) on each buffer to prevent exceeding
 * memory constraints during streaming decryption.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Callback-based processing (processAudioBuffer invoked per buffer)
 * - Receives buffers from AVAudioEngine tap (push-based)
 * - Limit checking per buffer callback
 * - Uses FileManager.attributesOfItem[.size] for file size
 */
class Pipeline {
  // Private properties
  private let encryptionStream: EncryptionStream
  private let audioConfig: AudioConfig
  private let outputFile: URL
  private let limiter: LimitRegistry
  private let stateManager: StateManager
  private let onLimitReached: (StopReason) -> Void
  private let onError: (String) -> Void
  private var hasError: Bool = false
  private let errorQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.pipeline.error")
  
  // Initializer
  internal init(
    encryptionStream: EncryptionStream,
    audioConfig: AudioConfig,
    outputFile: URL,
    limiter: LimitRegistry,
    stateManager: StateManager,
    onLimitReached: @escaping (StopReason) -> Void,
    onError: @escaping (String) -> Void
  ) {
    self.encryptionStream = encryptionStream
    self.audioConfig = audioConfig
    self.outputFile = outputFile
    self.limiter = limiter
    self.stateManager = stateManager
    self.onLimitReached = onLimitReached
    self.onError = onError
  }
  
  // Private methods
  private func isLimitExceeded(limits: [Limit], isType: (Limit) -> Bool, value: Int64) -> Bool {
    guard let limit = limits.first(where: isType), limit.isExceeded(value: value) else {
      return false
    }
    onLimitReached(limit.reason)
    return true
  }
  
  // Internal methods
  internal func processAudioBuffer(buffer: AVAudioPCMBuffer) {
    // Early return if already in error state (prevents error spam)
    if errorQueue.sync({ hasError }) {
      return
    }
    
    // Early return if state manager is deactivated (error already handled)
    guard stateManager.isActive else {
      return
    }
    
    guard let channelData = buffer.int16ChannelData else {
      errorQueue.sync { hasError = true }
      onError("No channel data available")
      return
    }
    
    // SECURITY: Check all limits
    let limits = limiter.getLimits()
    
    // Check duration limit
    let elapsedTime = stateManager.getElapsedTime()
    if isLimitExceeded(limits: limits, isType: { if case .duration = $0 { return true }; return false }, value: elapsedTime) {
      return
    }
    
    // Check file size limit
    if let fileSize = try? FileManager.default.attributesOfItem(atPath: outputFile.path)[.size] as? Int64 {
      if isLimitExceeded(limits: limits, isType: { if case .fileSize = $0 { return true }; return false }, value: fileSize) {
        return
      }
    }
    
    let frameLength = Int(buffer.frameLength)
    let channelCount = Int(buffer.format.channelCount)
    let dataSize = frameLength * channelCount * MemoryLayout<Int16>.size
    
    // Convert PCM data to Data
    let audioData = Data(bytes: channelData.pointee, count: dataSize)
    
    // Encrypt and write
    do {
      try encryptionStream.write(data: audioData)
    } catch {
      // Set error flag to prevent spam (only report error once)
      errorQueue.sync { hasError = true }
      onError("Error encrypting audio buffer: \(error.localizedDescription)")
    }
  }
}
