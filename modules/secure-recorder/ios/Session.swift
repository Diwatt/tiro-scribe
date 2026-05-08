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
    let startTs = Date()
    print("[SecureRecorder][Session] start requested, sessionId=\(sessionId) at \(startTs)")
    // Get or create encryption key
    let key = try keyManager.getOrCreateKey(alias: keyAlias)
    
    // Remove file ONLY on fresh start (not resume)
    if FileManager.default.fileExists(atPath: outputFile.path) {
      try FileManager.default.removeItem(at: outputFile)
    }
    
    // Initialize encryption stream
    encryptionStream = EncryptionStream(secretKey: key, outputFile: outputFile)
    try encryptionStream.initialize()
    
    try startAudioCapture()
    
    return outputFile.path
  }
  
  /**
   * Start audio capture and pipeline processing
   * 
   * Extracted from start() to allow reuse by resume().
   * Creates pipeline, starts audio recording, and launches processing loop.
   */
  private func startAudioCapture() throws {
    audioRecord = try audioRecorder.start()
    
    initializeEventHandler()
    
    recordingTimer.activate()
    
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
    
    try audioRecord.startRecording()
    
    guard let pipelineRef = pipeline else {
      recordingTimer.deactivate()
      throw SecureRecorderError.initializationFailed("Pipeline not initialized")
    }
    
    let queue = DispatchQueue(label: "com.tiroscribe.secure-recorder.pipeline", qos: .userInitiated)
    recordingQueue = queue
    
    queue.async { [weak pipelineRef] in
      pipelineRef?.process()
    }
  }
  
  /**
   * Pause recording session
   * Stops audio capture but keeps encryption stream open for resume
   * 
   * @return File path where encrypted audio is written
   * @throws SecureRecorderError if pause fails
   */
  internal func pause() throws -> String {
    guard recordingTimer.isActive else {
      throw SecureRecorderError.noRecordingInProgress
    }
    
    // Stop audio recording
    if audioRecord != nil {
      audioRecorder.stop(record: audioRecord)
    }
    
    // Flush buffered audio to disk (encryption stream stays open)
    try encryptionStream.flush()
    
    recordingTimer.deactivate()
    pipeline = nil
    recordingQueue = nil
    audioRecord = nil
    
    return outputFile.path
  }
  
  /**
   * Resume recording session
   * Restarts audio capture to existing encryption stream
   * 
   * @return File path where encrypted audio is written
   * @throws SecureRecorderError if resume fails
   */
  internal func resume() throws -> String {
    guard !recordingTimer.isActive else {
      throw SecureRecorderError.recordingInProgress
    }
    
    guard encryptionStream != nil else {
      throw SecureRecorderError.initializationFailed("No encryption stream to resume")
    }
    
    try startAudioCapture()
    
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
    let stopTs = Date()
    print("[SecureRecorder][Session] stop requested, sessionId=\(sessionId) at \(stopTs)")
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
