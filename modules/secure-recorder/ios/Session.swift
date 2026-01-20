import Foundation
import AVFoundation

/**
 * Manages a single recording session for iOS/iPadOS
 * 
 * Orchestrates recording components (Facade pattern). Coordinates audio recording,
 * encryption, state management, and event handling. Manages session lifecycle from
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
  // Private properties
  private let keyManager: KeyManager
  private let audioRecorder: AudioRecorder
  private let audioConfig: AudioConfig
  private let limiter: LimitRegistry
  private let onLimitReached: ((StopReason, String, String) async -> Void)?
  private let sessionId: String
  private let outputFile: URL
  private var encryptionStream: EncryptionStream!
  private var audioEngine: AVAudioEngine!
  private var inputNode: AVAudioInputNode!
  private var eventHandler: EventHandler!
  private var pipeline: Pipeline?
  
  // Internal properties
  internal let stateManager = StateManager()
  
  // Initializer
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
  
  // Private methods
  private func initializeEventHandler() {
    eventHandler = EventHandler(
      sessionId: sessionId,
      outputFile: outputFile,
      stateManager: stateManager,
      onStop: { [weak self] in
        guard let self = self else { throw SecureRecorderError.initializationFailed("Session deallocated") }
        return try self.stop()
      },
      onLimitReached: onLimitReached
    )
  }
  
  // Internal methods
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
    stateManager.activate()
    
    // Create pipeline for audio processing
    pipeline = Pipeline(
      encryptionStream: encryptionStream,
      audioConfig: audioConfig,
      outputFile: outputFile,
      limiter: limiter,
      stateManager: stateManager,
      onLimitReached: { [weak self] reason in
        self?.eventHandler.onLimitReached(reason: reason)
      },
      onError: { [weak self] message in
        self?.eventHandler.onError(message: message)
      }
    )
    
    // SECURITY: Create desired audio format (16kHz mono PCM-16)
    guard let desiredFormat = audioConfig.createFormat() else {
      stateManager.deactivate()
      throw SecureRecorderError.initializationFailed("Failed to create audio format")
    }
    
    // Install tap to capture audio buffers
    guard let pipelineRef = pipeline else {
      stateManager.deactivate()
      throw SecureRecorderError.initializationFailed("Pipeline not initialized")
    }
    
    audioRecorder.installTap(
      on: node,
      bufferSize: AVAudioFrameCount(audioConfig.bufferSize),
      format: desiredFormat
    ) { [weak pipelineRef] buffer, _ in
      pipelineRef?.processAudioBuffer(buffer: buffer)
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
    
    // Deactivate state
    stateManager.deactivate()
    
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
    
    stateManager.deactivate()
    audioEngine = nil
    inputNode = nil
    pipeline = nil
  }
  
  /**
   * Get session information
   */
  internal func getInfo() -> (sessionId: String, filePath: String, isActive: Bool) {
    return (sessionId, outputFile.path, stateManager.isActive)
  }
}
