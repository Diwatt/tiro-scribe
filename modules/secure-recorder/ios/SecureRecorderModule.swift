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
  private lazy var audioRecorder: AudioRecorder = { AudioRecorder() }()
  private lazy var audioConfig: AudioConfig = { AudioConfig() }()
  private var currentSession: Session?
  private let keyAlias = "secure_recorder_key"
  
  public func definition() -> ModuleDefinition {
    Name("SecureRecorder")
    
    Events("onRecordingStatusChanged", "onAudioChunkDecrypted")
    
    AsyncFunction("startRecording") { (sessionId: String) -> String in
      return try await self.startRecordingInternal(sessionId: sessionId)
    }
    
    AsyncFunction("stopRecording") { () -> String in
      return try await self.stopRecordingInternal()
    }
    
    AsyncFunction("getStatus") { () -> [String: Any] in
      return self.getStatusInternal()
    }
    
    AsyncFunction("hasPermission") { () -> Bool in
      return self.hasPermission()
    }
    
    AsyncFunction("stream") { (encryptedPath: String) -> Void in
      try await self.streamDecryptionInternal(encryptedPath: encryptedPath)
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
  
  private func startRecordingInternal(sessionId: String) async throws -> String {
    // Validate session ID
    guard !sessionId.isEmpty else {
      throw SecureRecorderError.initializationFailed("Session ID cannot be empty")
    }
    
    // Check if already recording
    if let session = currentSession, session.recordingTimer.isActive {
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
  
  private func stopRecordingInternal() async throws -> String {
    guard let session = currentSession else {
      throw SecureRecorderError.noRecordingInProgress
    }
    
    guard session.recordingTimer.isActive else {
      throw SecureRecorderError.noRecordingInProgress
    }
    
    // Get session info before stopping
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
  
  private func getStatusInternal() -> [String: Any] {
    guard let session = currentSession else {
      return [
        "state": RecorderState.inactive.toJsString(),
        "sessionId": "",
        "filePath": ""
      ]
    }
    
    let info = session.getInfo()
    let state = RecorderState.fromState(isRecording: info.isActive, filePath: info.filePath)
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
   * Stream decrypt encrypted audio file, emitting events for each chunk
   * 
   * MEMORY SAFE: Uses true streaming (FileHandle) to read chunks incrementally.
   * Emits "onAudioChunkDecrypted" event for each decrypted chunk immediately,
   * then discards the data to prevent OOM on large files.
   * 
   * @throws SecureRecorderError if decryption fails
   */
  private func streamDecryptionInternal(encryptedPath: String) async throws -> Void {
    let encryptedFileURL = URL(fileURLWithPath: encryptedPath)
    
    // Validate encrypted file exists
    guard FileManager.default.fileExists(atPath: encryptedPath) else {
      throw SecureRecorderError.initializationFailed("Encrypted file not found: \(encryptedPath)")
    }
    
    do {
      // Get encryption key
      let key = try keyManager.getOrCreateKey(alias: keyAlias)
      
      // Stream decrypt and emit events
      let streamManager = StreamDecryptionManager(secretKey: key, encryptedFile: encryptedFileURL)
      
      try streamManager.stream { data, index, isLast in
        // Emit event immediately - Expo SDK 54 converts Data → Uint8Array automatically
        let eventData: [String: Any] = [
          "data": data,
          "index": index,
          "isLast": isLast
        ]
        self.sendEvent("onAudioChunkDecrypted", eventData)
        
        // Data is automatically discarded after this scope
      }
      
      // Paranoid Self-Destruct: Secure Data Shredding (Overwrite + Delete)
      // Only in success path - if streaming fails, file remains for retry
      // Silently ignore deletion errors (e.g. permission issues) since streaming succeeded
      try? FileShredder.shred(fileURL: encryptedFileURL)
    } catch let error as SecureRecorderError {
      throw error
    } catch {
      throw SecureRecorderError.initializationFailed("Failed to decrypt audio: \(error.localizedDescription)")
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
