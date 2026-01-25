import Foundation
import AVFoundation

/**
 * AudioRecord proxy for iOS - matches Android AudioRecord API
 * 
 * Wraps AVAudioEngine/AVAudioInputNode to provide Android-like pull-based API.
 * Converts iOS push-based audio capture (tap callbacks) into pull-based model (read()).
 * 
 * ISOMORPHIC CONTRACT:
 * - Matches Android AudioRecord API surface
 * - state: STATE_INITIALIZED, STATE_UNINITIALIZED
 * - recordingState: RECORDSTATE_RECORDING, RECORDSTATE_STOPPED
 * - read(buffer:offset:size:) -> Int (bytes read)
 * - startRecording() -> starts capture
 * - stop() -> stops capture
 * - release() -> releases resources
 */
class AudioRecord {
  // State constants (matching Android)
  static let STATE_UNINITIALIZED = 0
  static let STATE_INITIALIZED = 1
  
  static let RECORDSTATE_STOPPED = 1
  static let RECORDSTATE_RECORDING = 3
  
  private let engine: AVAudioEngine
  private let inputNode: AVAudioInputNode
  private let audioConfig: AudioConfig
  private let onRelease: () -> Void // Session cleanup closure
  
  // Thread-safe state management
  // Uses concurrent queue with barrier for writes, concurrent reads for performance
  private let stateQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.audiorecord.state", attributes: .concurrent)
  private var _isRecording: Bool = false
  private var _isReleased: Bool = false
  
  // Buffer queue for converting push-based to pull-based
  // Uses serial queue to ensure thread-safe concurrent access
  private let bufferQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.audiorecord.queue", attributes: .concurrent)
  private var audioBufferQueue: [Data] = []
  private let maxQueueSize: Int = 10 // Limit queue size to prevent memory issues
  private let queueLock = NSLock()
  private var converter: AVAudioConverter?
  private var targetFormat: AVAudioFormat?
  
  internal init(engine: AVAudioEngine, inputNode: AVAudioInputNode, audioConfig: AudioConfig, onRelease: @escaping () -> Void) {
    self.engine = engine
    self.inputNode = inputNode
    self.audioConfig = audioConfig
    self.onRelease = onRelease
    
    // Create target format (16kHz mono PCM-16) for conversion
    self.targetFormat = audioConfig.createFormat()
  }
  
  /**
   * Get current state (matching Android AudioRecord.state)
   * 
   * Isomorphic: Matches Android AudioRecord.state behavior
   * - STATE_UNINITIALIZED (0): After release() is called
   * - STATE_INITIALIZED (1): After initialization, before release()
   */
  internal var state: Int {
    return stateQueue.sync {
      return _isReleased ? AudioRecord.STATE_UNINITIALIZED : AudioRecord.STATE_INITIALIZED
    }
  }
  
  /**
   * Get current recording state (matching Android AudioRecord.recordingState)
   * 
   * Isomorphic: Matches Android AudioRecord.recordingState behavior
   * - RECORDSTATE_STOPPED (1): Not recording
   * - RECORDSTATE_RECORDING (3): Currently recording
   */
  internal var recordingState: Int {
    return stateQueue.sync {
      return _isRecording ? AudioRecord.RECORDSTATE_RECORDING : AudioRecord.RECORDSTATE_STOPPED
    }
  }
  
  /**
   * Start recording (matching Android AudioRecord.startRecording())
   * 
   * Isomorphic: Matches Android AudioRecord.startRecording() behavior
   * - Throws if already released (STATE_UNINITIALIZED)
   * - Idempotent: safe to call multiple times if already recording
   * - Transitions to RECORDSTATE_RECORDING on success
   */
  internal func startRecording() throws {
    // Check state (thread-safe)
    let currentState = stateQueue.sync { _isReleased }
    guard !currentState else {
      throw NSError(domain: "AudioRecord", code: 1, userInfo: [NSLocalizedDescriptionKey: "AudioRecord is released"])
    }
    
    // Check if already recording (thread-safe, idempotent)
    let alreadyRecording = stateQueue.sync { _isRecording }
    guard !alreadyRecording else {
      return // Already recording (isomorphic: Android allows multiple calls)
    }
    
    // Get hardware format
    let hardwareFormat = inputNode.inputFormat(forBus: 0)
    
    // Calculate buffer size
    let hardwareSampleRate = hardwareFormat.sampleRate
    let targetFrames = Int(hardwareSampleRate * 0.01) // 10ms buffer
    let minFrames = 256
    let bufferSize = max(targetFrames, minFrames)
    
    // Remove existing tap if present (safe to call even if no tap exists)
    inputNode.removeTap(onBus: 0)
    
    // Install tap to capture audio buffers
    inputNode.installTap(onBus: 0, bufferSize: AVAudioFrameCount(bufferSize), format: hardwareFormat) { [weak self] buffer, _ in
      self?.handleAudioBuffer(buffer)
    }
    
    // Start engine
    do {
      try engine.start()
      // Update state (thread-safe)
      stateQueue.async(flags: .barrier) { [weak self] in
        self?._isRecording = true
      }
    } catch {
      inputNode.removeTap(onBus: 0)
      throw error
    }
  }
  
  /**
   * Read audio data (matching Android AudioRecord.read())
   * 
   * Isomorphic: Matches Android AudioRecord.read() behavior
   * - Returns bytes read (> 0) on success
   * - Returns 0 if no data available (non-blocking)
   * - Returns negative value on error (not recording or released)
   * 
   * Thread-safe: Uses serial queue for queue access, concurrent queue for state checks
   * 
   * @param buffer Buffer to read into (mutable pointer to UInt8 array)
   * @param offset Offset in buffer
   * @param size Number of bytes to read
   * @return Number of bytes read, or negative value on error
   */
  internal func read(_ buffer: UnsafeMutablePointer<UInt8>, offset: Int, size: Int) -> Int {
    // Check state (thread-safe, concurrent read)
    let (recording, released) = stateQueue.sync {
      return (_isRecording, _isReleased)
    }
    
    guard recording && !released else {
      return -1 // Error: not recording or released (isomorphic: Android returns negative on error)
    }
    
    // Access queue with lock for thread-safe read/write
    queueLock.lock()
    defer { queueLock.unlock() }
    
    // Check if data is available
    guard !audioBufferQueue.isEmpty else {
      return 0 // No data available (non-blocking, isomorphic: Android returns 0 when no data)
    }
    
    // Get data from queue
    let data = audioBufferQueue.removeFirst()
    let bytesToCopy = min(size, data.count)
    
    // Copy to buffer (memory-safe)
    data.withUnsafeBytes { bytes in
      guard let baseAddress = bytes.baseAddress else { return }
      // Use copyMemory for safe memory copy
      buffer.advanced(by: offset).initializeMemory(as: UInt8.self, from: baseAddress, count: bytesToCopy)
    }
    
    return bytesToCopy
  }
  
  /**
   * Stop recording (matching Android AudioRecord.stop())
   * 
   * Isomorphic: Matches Android AudioRecord.stop() behavior
   * - Idempotent: safe to call multiple times
   * - Transitions to RECORDSTATE_STOPPED
   * - Does NOT deactivate session (session cleanup happens in release())
   */
  internal func stop() {
    // Check state (thread-safe)
    let currentlyRecording = stateQueue.sync { _isRecording }
    guard currentlyRecording else {
      return // Already stopped (isomorphic: Android allows multiple calls)
    }
    
    // Update state first (thread-safe barrier write)
    stateQueue.async(flags: .barrier) { [weak self] in
      self?._isRecording = false
    }
    
    // Remove tap (safe to call even if no tap exists)
    inputNode.removeTap(onBus: 0)
    
    // Stop engine if running
    if engine.isRunning {
      engine.stop()
    }
    
    // Clear buffer queue (thread-safe)
    queueLock.lock()
    defer { queueLock.unlock() }
    audioBufferQueue.removeAll()
  }
  
  /**
   * Release resources (matching Android AudioRecord.release())
   * 
   * Isomorphic: Matches Android AudioRecord.release() behavior
   * - Calls stop() first (if recording)
   * - Transitions to STATE_UNINITIALIZED
   * - Deactivates AVAudioSession (via onRelease closure)
   * - Idempotent: safe to call multiple times
   */
  internal func release() {
    // Check if already released (thread-safe)
    let alreadyReleased = stateQueue.sync { _isReleased }
    guard !alreadyReleased else {
      return // Already released (isomorphic: Android allows multiple calls)
    }
    
    // Stop recording first (if active)
    stop()
    
    // Update state to released (thread-safe barrier write)
    stateQueue.async(flags: .barrier) { [weak self] in
      self?._isReleased = true
    }
    
    // Deactivate audio session (via injected closure)
    onRelease()
    
    // Clear converter and format
    converter = nil
    targetFormat = nil
    
    // Final queue cleanup (thread-safe)
    queueLock.lock()
    defer { queueLock.unlock() }
    audioBufferQueue.removeAll()
  }
  
  /**
   * Handle audio buffer from tap (push-based -> pull-based conversion)
   * 
   * Thread-safe: Uses lock for queue access, concurrent state check
   * Called from AVAudioEngine tap callback (background thread)
   */
  private func handleAudioBuffer(_ buffer: AVAudioPCMBuffer) {
    // Quick state check (concurrent read, no lock needed)
    let (recording, released) = stateQueue.sync {
      return (_isRecording, _isReleased)
    }
    
    guard recording && !released else {
      return // Not recording or released, ignore buffer
    }
    
    // Process buffer on background thread (tap callback is already on background thread)
    // Convert buffer to target format if needed
    let processedBuffer: AVAudioPCMBuffer
    if buffer.format.sampleRate != audioConfig.sampleRate {
      guard let converted = convertBuffer(buffer) else {
        return // Conversion failed, skip this buffer
      }
      processedBuffer = converted
    } else {
      processedBuffer = buffer
    }
    
    // Convert AVAudioPCMBuffer to Data
    guard let audioData = bufferToData(processedBuffer) else {
      return
    }
    
    // Add to queue (thread-safe with lock)
    queueLock.lock()
    defer { queueLock.unlock() }
    
    // Limit queue size to prevent memory growth
    if audioBufferQueue.count >= maxQueueSize {
      // Drop oldest buffer (FIFO behavior)
      audioBufferQueue.removeFirst()
    }
    audioBufferQueue.append(audioData)
  }
  
  /**
   * Convert buffer to target format (16kHz)
   */
  private func convertBuffer(_ inputBuffer: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    guard let targetFormat = targetFormat else {
      return nil
    }
    
    // Lazy initialize converter
    if converter == nil {
      guard let newConverter = AVAudioConverter(from: inputBuffer.format, to: targetFormat) else {
        return nil
      }
      converter = newConverter
    }
    
    guard let converter = converter else {
      return nil
    }
    
    // Calculate output buffer size
    let inputFrameCount = inputBuffer.frameLength
    let ratio = targetFormat.sampleRate / inputBuffer.format.sampleRate
    let outputFrameCount = AVAudioFrameCount(Double(inputFrameCount) * ratio)
    
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outputFrameCount) else {
      return nil
    }
    
    // Convert
    var error: NSError?
    let status = converter.convert(to: outputBuffer, error: &error) { _, outStatus in
      outStatus.pointee = .haveData
      return inputBuffer
    }
    
    guard status == .haveData, error == nil else {
      return nil
    }
    
    return outputBuffer
  }
  
  /**
   * Convert AVAudioPCMBuffer to Data (PCM-16 format)
   * 
   * Memory-safe: Uses Data's withUnsafeMutableBytes for safe memory management
   * Thread-safe: No shared state, can be called from any thread
   */
  private func bufferToData(_ buffer: AVAudioPCMBuffer) -> Data? {
    guard let channelData = buffer.int16ChannelData else {
      return nil
    }
    
    let frameLength = Int(buffer.frameLength)
    let channelCount = Int(buffer.format.channelCount)
    let dataSize = frameLength * channelCount * MemoryLayout<Int16>.size
    
    // Create Data with proper capacity
    var data = Data(count: dataSize)
    
    // Memory-safe copy using Data's withUnsafeMutableBytes
    data.withUnsafeMutableBytes { mutableBytes in
      guard let baseAddress = mutableBytes.baseAddress else { return }
      let ptr = baseAddress.assumingMemoryBound(to: Int16.self)
      
      if channelCount == 1 {
        // Mono: copy directly using memcpy (safe within Data's memory bounds)
        memcpy(ptr, channelData.pointee, dataSize)
      } else {
        // Multi-channel: take first channel only (mono output)
        // Safe: we're only reading from channelData and writing within dataSize bounds
        for i in 0..<frameLength {
          ptr[i] = channelData.pointee[i]
        }
      }
    }
    
    return data
  }
}
