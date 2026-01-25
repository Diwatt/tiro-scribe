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
  private var audioRecord: AudioRecord!
  private var eventHandler: EventHandler!
  private var pipeline: Pipeline?
  private var recordingQueue: DispatchQueue?
  
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
    
    // Start audio recording (returns AudioRecord wrapper - isomorphic with Android)
    audioRecord = try audioRecorder.start()
    
    // Initialize event handler
    initializeEventHandler()
    
    // Activate state
    recordingTimer.activate()
    
    // Create pipeline for audio processing (isomorphic with Android)
    pipeline = Pipeline(
      audioRecord: audioRecord,
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
    
    // Start recording (isomorphic: matches Android AudioRecord.startRecording())
    try audioRecord.startRecording()
    
    // Start pipeline processing loop in background queue (isomorphic with Android coroutine)
    guard let pipelineRef = pipeline else {
      recordingTimer.deactivate()
      throw SecureRecorderError.initializationFailed("Pipeline not initialized")
    }
    
    let queue = DispatchQueue(label: "com.tiroscribe.secure-recorder.pipeline", qos: .userInitiated)
    recordingQueue = queue
    
    queue.async { [weak pipelineRef, weak self] in
      pipelineRef?.process()
      // Pipeline loop completed (limit reached or error)
      // EventHandler will handle cleanup via onLimitReached/onError
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
    // Stop audio recording (isomorphic: matches Android AudioRecorder.stop())
    if audioRecord != nil {
      audioRecorder.stop(record: audioRecord)
    }
    
    // Close encryption stream safely
    if encryptionStream != nil {
      encryptionStream.close()
    }
    
    // Deactivate timer
    recordingTimer.deactivate()
    
    audioRecord = nil
    pipeline = nil
    recordingQueue = nil
    
    return outputFile.path
  }
  
  /**
   * Cleanup session resources
   * Safe to call even if session wasn't fully initialized
   */
  internal func cleanup() {
    if audioRecord != nil {
      audioRecorder.stop(record: audioRecord)
    }
    
    // Close encryption stream safely
    if encryptionStream != nil {
      encryptionStream.close()
    }
    
    recordingTimer.deactivate()
    audioRecord = nil
    pipeline = nil
    recordingQueue = nil
  }
  
  /**
   * Get session information
   */
  internal func getInfo() -> (sessionId: String, filePath: String, isActive: Bool) {
    return (sessionId, outputFile.path, recordingTimer.isActive)
  }
}
