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
  private let encryptionStream: EncryptionStreamProtocol
  private let audioConfig: AudioConfig
  private let outputFile: URL
  private let limiter: LimitRegistryProtocol
  private let recordingTimer: RecordingTimerProtocol
  private let onLimitReached: (StopReason) -> Void
  private let onError: (String) -> Void
  private var hasError: Bool = false
  private let errorQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.pipeline.error")
  private var converter: AVAudioConverter?
  private var targetFormat: AVAudioFormat?
  
  internal init(
    encryptionStream: EncryptionStreamProtocol,
    audioConfig: AudioConfig,
    outputFile: URL,
    limiter: LimitRegistryProtocol,
    recordingTimer: RecordingTimerProtocol,
    onLimitReached: @escaping (StopReason) -> Void,
    onError: @escaping (String) -> Void
  ) {
    self.encryptionStream = encryptionStream
    self.audioConfig = audioConfig
    self.outputFile = outputFile
    self.limiter = limiter
    self.recordingTimer = recordingTimer
    self.onLimitReached = onLimitReached
    self.onError = onError
    
    // Create target format (16kHz mono PCM-16) for conversion
    self.targetFormat = audioConfig.createFormat()
  }
  
  internal func processAudioBuffer(buffer: AVAudioPCMBuffer) {
    // Early return if already in error state (prevents error spam)
    if errorQueue.sync(execute: { hasError }) {
      return
    }
    
    // Early return if timer is deactivated (error already handled)
    guard recordingTimer.isActive else {
      return
    }
    
    // Convert buffer to target format (16kHz) if needed
    let processedBuffer: AVAudioPCMBuffer
    if buffer.format.sampleRate != audioConfig.sampleRate {
      // Need format conversion
      guard let converted = convertBuffer(buffer) else {
        // Conversion failed - error already logged, skip this buffer
        return
      }
      processedBuffer = converted
    } else {
      // Already at target format
      processedBuffer = buffer
    }
    
    guard let channelData = processedBuffer.int16ChannelData else {
      errorQueue.sync(execute: { hasError = true })
      onError("No channel data available")
      return
    }
    
    // SECURITY: Check all limits
    let limits = limiter.getLimits()
    
    // Check duration limit
    let elapsedTime = recordingTimer.getElapsedTime()
    if isLimitExceeded(limits: limits, isType: { if case .duration = $0 { return true }; return false }, value: elapsedTime) {
      return
    }
    
    // Check file size limit
    if let fileSize = try? FileManager.default.attributesOfItem(atPath: outputFile.path)[.size] as? Int64 {
      if isLimitExceeded(limits: limits, isType: { if case .fileSize = $0 { return true }; return false }, value: fileSize) {
        return
      }
    }
    
    let frameLength = Int(processedBuffer.frameLength)
    let channelCount = Int(processedBuffer.format.channelCount)
    let dataSize = frameLength * channelCount * MemoryLayout<Int16>.size
    
    // Convert PCM data to Data
    let audioData = Data(bytes: channelData.pointee, count: dataSize)
    
    // Encrypt and write
    do {
      try encryptionStream.write(data: audioData)
    } catch {
      // Set error flag to prevent spam (only report error once)
      errorQueue.sync(execute: { hasError = true })
      onError("Error encrypting audio buffer: \(error.localizedDescription)")
    }
  }
  
  private func isLimitExceeded(limits: [Limit], isType: (Limit) -> Bool, value: Int64) -> Bool {
    guard let limit = limits.first(where: isType), limit.isExceeded(value: value) else {
      return false
    }
    onLimitReached(limit.reason)
    return true
  }
  
  /**
   * Convert audio buffer from input format to target format (16kHz)
   * 
   * Uses AVAudioConverter to resample and convert format if needed.
   * Returns nil if conversion fails (caller should handle gracefully).
   */
  private func convertBuffer(_ inputBuffer: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    guard let targetFormat = targetFormat else {
      return nil
    }
    
    // Lazy initialize converter on first use
    if converter == nil {
      guard let newConverter = AVAudioConverter(from: inputBuffer.format, to: targetFormat) else {
        errorQueue.sync(execute: { hasError = true })
        onError("Failed to create audio format converter")
        return nil
      }
      converter = newConverter
    }
    
    guard let converter = converter else {
      return nil
    }
    
    // Calculate output buffer size
    let inputSampleRate = inputBuffer.format.sampleRate
    let outputSampleRate = targetFormat.sampleRate
    let ratio = outputSampleRate / inputSampleRate
    let outputFrameCapacity = AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio)
    
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outputFrameCapacity) else {
      return nil
    }
    
    // Perform conversion
    var error: NSError?
    var inputProvided = false
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      if !inputProvided {
        inputProvided = true
        outStatus.pointee = .haveData
        return inputBuffer
      } else {
        outStatus.pointee = .noDataNow
        return nil
      }
    }
    
    let status = converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)
    
    // Check for errors or incomplete conversion
    if let error = error {
      errorQueue.sync(execute: { hasError = true })
      onError("Audio format conversion failed: \(error.localizedDescription)")
      return nil
    }
    
    // Verify conversion produced output
    if outputBuffer.frameLength == 0 {
      return nil
    }
    
    return outputBuffer
  }
}
