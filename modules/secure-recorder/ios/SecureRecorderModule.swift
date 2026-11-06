import ExpoModulesCore
import AVFoundation
import Foundation

/**
 * Expo module for SecureRecorder on iOS/iPadOS
 * 
 * Thin wrapper that delegates to Session. Provides Expo module interface for
 * starting/stopping recordings, checking permissions, and decrypting audio files.
 * Manages session lifecycle and emits status change events.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Async methods (Swift async/await)
 * - Uses applicationSupportDirectory for file storage (FileManager.url(for:in:appropriateFor:create:))
 * - Permission check via AVAudioSession.recordPermission
 * - Error enum (SecureRecorderError) with code property
 * - KeyManager initialized without context (no context needed for Keychain)
 * 
 * ERROR CODE MAPPING (to TypeScript SecureRecorderError.code):
 * - .recordingInProgress → "RECORDING_IN_PROGRESS"
 * - .noRecordingInProgress → "NO_RECORDING_IN_PROGRESS"
 * - .permissionDenied → "PERMISSION_DENIED"
 * - .initializationFailed → "INITIALIZATION_FAILED"
 * - .keychainError → "KEYCHAIN_ERROR"
 * - .recordingFailed → "RECORDING_FAILED"
 * - .stopFailed → "STOP_FAILED"
 * 
 * All errors include code property that Expo framework converts to JavaScript {code, message} objects.
 */
public class SecureRecorderModule: Module {
  private lazy var keyManager: KeyManager = { KeyManager() }()
  private lazy var audioConfig: AudioConfig = { AudioConfig() }()
  private lazy var audioRecorder: AudioRecorder = { AudioRecorder(audioConfig: audioConfig) }()
  private var currentSession: Session?
  private let keyAlias = "secure_recorder_key"
  private var decryptedStreamReaders: [String: StreamDecryptionManager] = [:]
  
  public func definition() -> ModuleDefinition {
    Name("SecureRecorder")
    
    Events("onRecordingStatusChanged")
    
    AsyncFunction("start") { (sessionId: String) -> String in
      return try await self.start(sessionId: sessionId)
    }
    
    AsyncFunction("stop") {
      return try await self.stop()
    }
    
    AsyncFunction("pause") {
      return try await self.pause()
    }
    
    AsyncFunction("resume") {
      return try await self.resume()
    }
    
    AsyncFunction("getStatus") {
      return self.status()
    }
    
    AsyncFunction("hasPermission") {
      return self.hasPermission()
    }

    AsyncFunction("openDecryptedStream") { (encryptedPath: String) -> String in
      return try await self.openDecryptedStream(encryptedPath: encryptedPath)
    }

    AsyncFunction("readNextChunk") { (readerId: String) -> [String: Any] in
      return try await self.readNextChunk(readerId: readerId)
    }

    AsyncFunction("closeDecryptedStream") { (readerId: String) -> Void in
      return try await self.closeDecryptedStream(readerId: readerId)
    }

    AsyncFunction("encryptFile") { (inputPath: String, outputPath: String) -> String in
      return try await self.encryptFile(inputPath: inputPath, outputPath: outputPath)
    }
    
    AsyncFunction("encryptBytes") { (data: Data, outputPath: String) -> String in
      return try await self.encryptBytes(data: data, outputPath: outputPath)
    }
  }
  
  private func emitStatusChanged(state: RecorderState, sessionId: String, filePath: String, reason: StopReason? = nil) {
    var eventData: [String: Any] = [
      "state": state.toJsString(),
      "sessionId": sessionId,
      "filePath": filePath
    ]
    if let reason = reason {
      eventData["reason"] = reason.toJsString()
    }
    sendEvent("onRecordingStatusChanged", eventData)
  }
  
  private func cleanupSession() {
    if let session = currentSession {
      session.cleanup()
    }
    currentSession = nil
  }

  /**
   * Checks if recording is currently in progress.
   * - Returns: true if a session exists and is actively recording
   */
  private func isRecording() -> Bool {
    guard let session = currentSession else {
      return false
    }
    return session.recordingTimer.isActive
  }
  
  private func start(sessionId: String) async throws -> String {
    // Validate session ID
    guard !sessionId.isEmpty else {
      throw SecureRecorderError.initializationFailed("Session ID cannot be empty")
    }
    
    // Check if already recording
    if isRecording() {
      throw SecureRecorderError.recordingInProgress
    }
    
    // Check permission
    guard hasPermission() else {
      throw SecureRecorderError.permissionDenied
    }
    
    do {
      // Create output file path
      let fileURL = try createOutputFileURL(sessionId: sessionId)
      
      // Create handler for limit events (async closure)
      let onLimitReached: (StopReason, String, String) async -> Void = { [weak self] reason, sessionId, filePath in
        guard let self = self else { return }
        // Clear session reference (stop() was already called by Session)
        self.currentSession = nil
        self.emitStatusChanged(state: .stopped, sessionId: sessionId, filePath: filePath, reason: reason)
      }
      
      // Create new recording session with handler
      let session = Session(
        sessionId: sessionId,
        outputFile: fileURL,
        keyManager: keyManager,
        audioRecorder: audioRecorder,
        audioConfig: audioConfig,
        onLimitReached: onLimitReached
      )
      
      // Start session
      let filePath = try session.start(keyAlias: keyAlias)
      currentSession = session
      
      emitStatusChanged(state: .recording, sessionId: sessionId, filePath: filePath)
      
      return filePath
    } catch let error as SecureRecorderError {
      cleanupSession()
      throw error
    } catch {
      cleanupSession()
      throw SecureRecorderError.initializationFailed(error.localizedDescription)
    }
  }
  
  private func stop() async throws -> String {
    guard let session = currentSession else {
      throw SecureRecorderError.noRecordingInProgress
    }
    let sessionInfo = session.getInfo()

    do {
      let filePath = try session.stop()
      currentSession = nil

      emitStatusChanged(state: .stopped, sessionId: sessionInfo.sessionId, filePath: filePath, reason: .userStopped)

      return filePath
    } catch let error as SecureRecorderError {
      cleanupSession()
      throw error
    } catch {
      cleanupSession()
      throw SecureRecorderError.stopFailed(error.localizedDescription)
    }
  }
  
  private func pause() async throws -> String {
    guard isRecording() else {
      throw SecureRecorderError.noRecordingInProgress
    }
    let session = currentSession!
    let sessionInfo = session.getInfo()

    do {
      let filePath = try session.pause()
      emitStatusChanged(state: .paused, sessionId: sessionInfo.sessionId, filePath: filePath)
      return filePath
    } catch let error as SecureRecorderError {
      throw error
    } catch {
      throw SecureRecorderError.stopFailed(error.localizedDescription)
    }
  }
  
  private func resume() async throws -> String {
    guard let session = currentSession else {
      throw SecureRecorderError.noRecordingInProgress
    }
    guard session.recordingTimer.isActive == false else {
      throw SecureRecorderError.recordingInProgress
    }
    let sessionInfo = session.getInfo()

    do {
      let filePath = try session.resume()
      emitStatusChanged(state: .recording, sessionId: sessionInfo.sessionId, filePath: filePath)
      return filePath
    } catch let error as SecureRecorderError {
      throw error
    } catch {
      throw SecureRecorderError.initializationFailed(error.localizedDescription)
    }
  }
  
  private func status() -> [String: Any] {
    guard let session = currentSession else {
      return [
        "state": RecorderState.inactive.toJsString(),
        "sessionId": "",
        "filePath": ""
      ]
    }
    
    let info = session.getInfo()
    // Session exists but not active = paused
    let isPaused = !info.isActive
    let state = RecorderState.fromState(isRecording: info.isActive, isPaused: isPaused, filePath: info.filePath)
    return [
      "state": state.toJsString(),
      "sessionId": info.sessionId,
      "filePath": info.filePath
    ]
  }
  
  private func createOutputFileURL(sessionId: String) throws -> URL {
    let fileManager = FileManager.default
    let appSupportDir = try fileManager.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    return appSupportDir.appendingPathComponent("\(sessionId).dat")
  }
  
  /**
   * Opens a pull reader on an encrypted audio file: readNextChunk() returns
   * each decrypted block in stream order until the reader is exhausted.
   *
   * @throws SecureRecorderError if the file does not exist
   */
  private func openDecryptedStream(encryptedPath: String) async throws -> String {
    guard FileManager.default.fileExists(atPath: encryptedPath) else {
      throw SecureRecorderError.initializationFailed("Encrypted file not found: \(encryptedPath)")
    }

    let key = try keyManager.getOrCreateKey(alias: keyAlias)
    let readerId = UUID().uuidString
    decryptedStreamReaders[readerId] = StreamDecryptionManager(secretKey: key, encryptedFile: URL(fileURLWithPath: encryptedPath))

    return readerId
  }

  /**
   * Decrypts and returns the next block for the reader.
   * The last data block carries isLast=true; the call after it returns an
   * empty block with isLast=true and closes the reader.
   *
   * @throws SecureRecorderError if the reader is unknown
   */
  private func readNextChunk(readerId: String) async throws -> [String: Any] {
    guard let streamManager = decryptedStreamReaders[readerId] else {
      throw SecureRecorderError.stopFailed("Unknown decrypted stream reader: \(readerId)")
    }

    let chunk = try streamManager.readNext()
    if let chunk = chunk {
      if chunk.isLast {
        decryptedStreamReaders.removeValue(forKey: readerId)
      }

      return ["data": chunk.data, "isLast": chunk.isLast]
    }

    decryptedStreamReaders.removeValue(forKey: readerId)

    return ["data": Data(), "isLast": true]
  }

  /**
   * Releases the native reader early when the consumer abandons mid-stream.
   */
  private func closeDecryptedStream(readerId: String) async throws {
    if let streamManager = decryptedStreamReaders.removeValue(forKey: readerId) {
      streamManager.close()
    }
  }

  /**
   * Encrypt an existing file using the same key as recording.
   * Reads input file in chunks and writes encrypted output.
   *
   * @param inputPath Path to the unencrypted input file
   * @param outputPath Path where the encrypted file will be written
   * @return The output path
   */
  private func encryptFile(inputPath: String, outputPath: String) async throws -> String {
    let inputURL = URL(fileURLWithPath: inputPath)
    let outputURL = URL(fileURLWithPath: outputPath)

    guard FileManager.default.fileExists(atPath: inputPath) else {
      throw SecureRecorderError.initializationFailed("Input file not found: \(inputPath)")
    }

    do {
      let key = try keyManager.getOrCreateKey(alias: keyAlias)
      let encryptionStream = EncryptionStream(secretKey: key, outputFile: outputURL)

      try encryptionStream.initialize()

      let fileHandle = try FileHandle(forReadingFrom: inputURL)
      defer {
        try? fileHandle.close()
      }

      while let chunk = try? fileHandle.read(upToCount: 8192), !chunk.isEmpty {
        try encryptionStream.write(data: chunk)
      }

      try encryptionStream.close()

      return outputPath
    } catch let error as SecureRecorderError {
      throw error
    } catch {
      throw SecureRecorderError.initializationFailed("Failed to encrypt file: \(error.localizedDescription)")
    }
  }
  
  /**
   * Encrypt a byte array using the same key and chunk format
   * used by the recording pipeline.
   *
   * @param data Raw bytes to encrypt
   * @param outputPath Path where the encrypted file will be written
   * @return The output path
   */
  private func encryptBytes(data: Data, outputPath: String) async throws -> String {
    let outputURL = URL(fileURLWithPath: outputPath)

    do {
      let key = try keyManager.getOrCreateKey(alias: keyAlias)
      let encryptionStream = EncryptionStream(secretKey: key, outputFile: outputURL)

      try encryptionStream.initialize()

      let chunkSize = 16384
      var offset = 0
      while offset < data.count {
        let end = min(offset + chunkSize, data.count)
        let chunk = data.subdata(in: offset..<end)
        try encryptionStream.write(data: chunk)
        offset = end
      }

      try encryptionStream.close()

      return outputPath
    } catch let error as SecureRecorderError {
      throw error
    } catch {
      throw SecureRecorderError.initializationFailed("Failed to encrypt bytes: \(error.localizedDescription)")
    }
  }

  /**
   * Check if microphone recording permission is granted
   * Note: Permission requests are handled via expo-audio in JavaScript
   */
  private func hasPermission() -> Bool {
    return AVAudioSession.sharedInstance().recordPermission == .granted
  }
}
