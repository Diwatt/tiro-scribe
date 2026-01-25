import Foundation
import AVFoundation

/**
 * Handles audio data processing pipeline for iOS/iPadOS
 * 
 * Processes audio data from AudioRecord, encrypts it, and writes to disk.
 * Checks recording limits (duration and file size) in loop iterations to prevent
 * exceeding memory constraints during streaming decryption.
 * 
 * ISOMORPHIC: Matches Android Pipeline architecture
 * - Loop-based processing (process() function)
 * - Actively reads from AudioRecord in loop (pull-based)
 * - Limit checking in loop iteration
 * - Uses FileManager.attributesOfItem[.size] for file size
 */
class Pipeline {
  private let audioRecord: AudioRecord
  private let encryptionStream: EncryptionStreamProtocol
  private let audioConfig: AudioConfig
  private let outputFile: URL
  private let limiter: LimitRegistryProtocol
  private let recordingTimer: RecordingTimerProtocol
  private let onLimitReached: (StopReason) -> Void
  private let onError: (String) -> Void
  
  internal init(
    audioRecord: AudioRecord,
    encryptionStream: EncryptionStreamProtocol,
    audioConfig: AudioConfig,
    outputFile: URL,
    limiter: LimitRegistryProtocol,
    recordingTimer: RecordingTimerProtocol,
    onLimitReached: @escaping (StopReason) -> Void,
    onError: @escaping (String) -> Void
  ) {
    self.audioRecord = audioRecord
    self.encryptionStream = encryptionStream
    self.audioConfig = audioConfig
    self.outputFile = outputFile
    self.limiter = limiter
    self.recordingTimer = recordingTimer
    self.onLimitReached = onLimitReached
    self.onError = onError
  }
  
  /**
   * Process audio data in loop (isomorphic with Android Pipeline.process())
   * 
   * Reads from AudioRecord in a loop, encrypts data, and writes to disk.
   * Checks limits on each iteration and stops when limit is reached or error occurs.
   */
  internal func process() {
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: audioConfig.bufferSize)
    defer { buffer.deallocate() }
    
    while recordingTimer.isActive {
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
      
      // Read audio data from AudioRecord (isomorphic: matches Android audioRecord.read())
      let bytesRead = audioRecord.read(buffer, offset: 0, size: audioConfig.bufferSize)
      
      if bytesRead > 0 {
        // Convert buffer to Data for encryption
        let dataToWrite = Data(bytes: buffer, count: bytesRead)
        
        // Encrypt and write
        do {
          try encryptionStream.write(data: dataToWrite)
        } catch {
          onError("Error encrypting audio data: \(error.localizedDescription)")
          return
        }
      } else if bytesRead < 0 {
        // Error reading from AudioRecord
        onError("AudioRecord read error: \(bytesRead)")
        return
      }
      // bytesRead == 0 means no data available (non-blocking), continue loop
    }
  }
  
  private func isLimitExceeded(limits: [Limit], isType: (Limit) -> Bool, value: Int64) -> Bool {
    guard let limit = limits.first(where: isType), limit.isExceeded(value: value) else {
      return false
    }
    onLimitReached(limit.reason)
    return true
  }
}
