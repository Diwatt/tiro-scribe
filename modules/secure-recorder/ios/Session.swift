import Foundation
import AVFoundation

/**
 * Manages a single recording session for iOS/iPadOS
 * 
 * Orchestrates recording components (Facade pattern). Coordinates audio recording,
 * encryption, timing, and event handling. Manages session lifecycle from
 * initialization through cleanup.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses Swift async/await for asynchronous operations
 * - start() throws SecureRecorderError
 * - Uses AVAudioEngine/AVAudioInputNode (via AudioRecorder)
 * - Separate initializeEventHandler() method (needed for weak self capture)
 * - getInfo() returns tuple (sessionId, filePath, isActive)
 * - Explicitly removes existing file before recording (FileManager.removeItem)
 * - cleanup() has no try-catch (simpler cleanup, errors are non-critical)
 */
class Session {
  private let keyManager: KeyManagerProtocol
  private let audioRecorder: AudioRecorder
  private let audioConfig: AudioConfig
  private let limiter: LimitRegistryProtocol
  private let onLimitReached: ((StopReason, String, String) async -> Void)?
  private let sessionId: String
  private let outputFile: URL
  private var encryptionStream: EncryptionStreamProtocol!
  private var audioEngine: AVAudioEngine!
  private var inputNode: AVAudioInputNode!
  private var eventHandler: EventHandler!
  private var pipeline: Pipeline?
  
  internal let recordingTimer = RecordingTimer()
  
  internal init(
    sessionId: String,
    outputFile: URL,
    keyManager: KeyManager,
    audioRecorder: AudioRecorder,
    audioConfig: AudioConfig,
    limiter: LimitRegistry = LimitRegistry(),
    onLimitReached: ((StopReason, String, String) async -> Void)? = nil
  ) {
    self.sessionId = sessionId
    self.outputFile = outputFile
    self.keyManager = keyManager
    self.audioRecorder = audioRecorder
    self.audioConfig = audioConfig
    self.limiter = limiter
    self.onLimitReached = onLimitReached
  }
  
  private func initializeEventHandler() {
    eventHandler = EventHandler(
      sessionId: sessionId,
      outputFile: outputFile,
      recordingTimer: recordingTimer,
      onStop: { [weak self] in
        guard let self = self else { throw SecureRecorderError.initializationFailed("Session deallocated") }
        return try self.stop()
      },
      onLimitReached: onLimitReached
    )
  }
  
  /**
   * Start recording session
   * Initializes encryption and audio capture
   * 
   * @return File path where encrypted audio is being written
   * @throws SecureRecorderError if initialization fails
   */
  internal func start(keyAlias: String) throws -> String {
    // Get or create encryption key
    let key = try keyManager.getOrCreateKey(alias: keyAlias)
    
    // Remove file if it exists
    if FileManager.default.fileExists(atPath: outputFile.path) {
      try FileManager.default.removeItem(at: outputFile)
    }
    
    // Initialize encryption stream
    encryptionStream = EncryptionStream(secretKey: key, outputFile: outputFile)
    try encryptionStream.initialize()
    
    // Start audio recording
    let (engine, node) = try audioRecorder.start()
    audioEngine = engine
    inputNode = node
    
    // Initialize event handler
    initializeEventHandler()
    
    // Activate state
    recordingTimer.activate()
    
    // Create pipeline for audio processing
    pipeline = Pipeline(
      encryptionStream: encryptionStream,
      audioConfig: audioConfig,
      outputFile: outputFile,
      limiter: limiter,
      recordingTimer: recordingTimer,
      onLimitReached: { [weak self] reason in
        self?.eventHandler.onLimitReached(reason: reason)
      },
      onError: { [weak self] message in
        self?.eventHandler.onError(message: message)
      }
    )
    
    // Install tap to capture audio buffers
    // CRITICAL: Use input node's hardware format to match sample rate requirement
    // The tap format MUST match the hardware input format's sample rate
    let hardwareFormat = node.inputFormat(forBus: 0)
    
    guard let pipelineRef = pipeline else {
      recordingTimer.deactivate()
      throw SecureRecorderError.initializationFailed("Pipeline not initialized")
    }
    
    // Calculate buffer size based on hardware format
    // Use hardware sample rate for buffer calculation, but target ~10ms
    let hardwareSampleRate = hardwareFormat.sampleRate
    let targetFrames = Int(hardwareSampleRate * 0.01) // 10ms buffer
    let minFrames = 256
    let bufferSize = max(targetFrames, minFrames)
    
    // Install tap and start engine (iOS-specific: push-based audio capture)
    // Remove existing tap if present (safe to call even if no tap exists)
    node.removeTap(onBus: 0)
    
    // Install tap
    node.installTap(onBus: 0, bufferSize: AVAudioFrameCount(bufferSize), format: hardwareFormat) { [weak pipelineRef] buffer, _ in
      pipelineRef?.processAudioBuffer(buffer: buffer)
    }
    
    // Start engine to begin capturing
    // Note: Engine must be started after tap is installed
    guard let engine = node.engine else {
      node.removeTap(onBus: 0)
      recordingTimer.deactivate()
      throw SecureRecorderError.initializationFailed("Input node has no engine")
    }
    
    do {
      try engine.start()
    } catch {
      // If engine start fails, remove tap
      node.removeTap(onBus: 0)
      recordingTimer.deactivate()
      throw SecureRecorderError.initializationFailed("Failed to start audio engine: \(error.localizedDescription)")
    }
    
    return outputFile.path
  }
  
  /**
   * Stop recording session
   * Finalizes encryption and stops audio capture
   * 
   * @return File path where encrypted audio was written
   * @throws SecureRecorderError if finalization fails
   */
  internal func stop() throws -> String {
    // Stop audio recording
    if audioEngine != nil && inputNode != nil {
      audioRecorder.stop(engine: audioEngine, inputNode: inputNode)
    }
    
    // Close encryption stream safely
    if encryptionStream != nil {
      encryptionStream.close()
    }
    
    // Deactivate timer
    recordingTimer.deactivate()
    
    audioEngine = nil
    inputNode = nil
    pipeline = nil
    
    return outputFile.path
  }
  
  /**
   * Cleanup session resources
   * Safe to call even if session wasn't fully initialized
   */
  internal func cleanup() {
    if audioEngine != nil && inputNode != nil {
      audioRecorder.stop(engine: audioEngine, inputNode: inputNode)
    }
    
    // Close encryption stream safely
    if encryptionStream != nil {
      encryptionStream.close()
    }
    
    recordingTimer.deactivate()
    audioEngine = nil
    inputNode = nil
    pipeline = nil
  }
  
  /**
   * Get session information
   */
  internal func getInfo() -> (sessionId: String, filePath: String, isActive: Bool) {
    return (sessionId, outputFile.path, recordingTimer.isActive)
  }
}
