import ExpoModulesCore
import AVFoundation
import Foundation

/**
 * Main SecureRecorder Expo module
 * Orchestrates audio recording with streaming encryption
 */
public class SecureRecorderModule: Module {
  // Dependencies (DIP)
  private let keyManager: KeyManager
  private let permissionManager: PermissionManager
  private let audioRecorder: AudioRecorder
  
  // Recording state (thread-safe access)
  private let stateQueue = DispatchQueue(label: "com.tiroscribe.secure-recorder.state")
  private var _recordingState: RecordingState = .idle
  private var recordingState: RecordingState {
    get {
      return stateQueue.sync { _recordingState }
    }
    set {
      stateQueue.sync { _recordingState = newValue }
    }
  }
  private var encryptionStream: EncryptionStreamManager?
  private var audioEngine: AVAudioEngine?
  private var inputNode: AVAudioInputNode?
  
  // Configuration
  private let keychainService = "com.tiroscribe.secure-recorder"
  private let keychainKey = "secure_recorder_encryption_key"
  private let keyAlias = "secure_recorder_key"
  
  public override init() {
    // Initialize dependencies
    self.keyManager = KeychainKeyManager(
      keychainService: keychainService,
      keychainKey: keychainKey
    )
    self.permissionManager = IOSPermissionManager()
    self.audioRecorder = AVAudioEngineRecorder()
    super.init()
  }
  
  public func definition() -> ModuleDefinition {
    Name("SecureRecorder")
    
    AsyncFunction("startRecording") { (sessionId: String) -> String in
      return try await self.startRecording(sessionId: sessionId)
    }
    
    AsyncFunction("stopRecording") { () -> String in
      return try await self.stopRecording()
    }
    
    AsyncFunction("getStatus") { () -> [String: Any?] in
      return self.getStatus()
    }
    
    AsyncFunction("hasPermission") { () -> Bool in
      return self.permissionManager.has()
    }
    
    AsyncFunction("requestPermission") { () -> Bool in
      return await self.permissionManager.request()
    }
  }
  
  private func startRecording(sessionId: String) async throws -> String {
    // Validate session ID
    guard !sessionId.isEmpty else {
      throw SecureRecorderError.initializationFailed("Session ID cannot be empty")
    }
    
    // Check if already recording and check permission (thread-safe)
    let canStart = stateQueue.sync {
      // Check if already recording
      if _recordingState.isRecording {
        return false
      }
      return true
    }
    
    guard canStart else {
      throw SecureRecorderError.recordingInProgress
    }
    
    // Check permission
    guard permissionManager.has() else {
      throw SecureRecorderError.permissionDenied
    }
    
    // Continue with recording setup
    return try await startRecordingInternal(sessionId: sessionId)
  }
  
  private func startRecordingInternal(sessionId: String) async throws -> String {
    do {
      // Get or create encryption key
      let key = try keyManager.getOrCreateKey(alias: keyAlias)
      
      // Create encrypted file in app's private directory (equivalent to Android's filesDir)
      let fileManager = FileManager.default
      let appSupportDir = try fileManager.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
      )
      let fileURL = appSupportDir.appendingPathComponent("\(sessionId).dat")
      
      // Remove file if it exists
      if FileManager.default.fileExists(atPath: fileURL.path) {
        try FileManager.default.removeItem(at: fileURL)
      }
      
      // Initialize encryption stream
      encryptionStream = EncryptionStreamManager(secretKey: key, outputFile: fileURL)
      try encryptionStream!.initialize()
      
      // Start audio recording
      let (engine, node, format) = try audioRecorder.start()
      audioEngine = engine
      inputNode = node
      
      // Install tap to capture audio buffers
      audioRecorder.installTap(
        on: node,
        bufferSize: 4096,
        format: format
      ) { [weak self] buffer, _ in
        self?.processAudioBuffer(buffer: buffer)
      }
      
      // Update state (thread-safe)
      stateQueue.sync {
        _recordingState = RecordingState(
          isRecording: true,
          sessionId: sessionId,
          filePath: fileURL.path
        )
      }
      
      return fileURL.path
    } catch {
      cleanup()
      if let secureError = error as? SecureRecorderError {
        throw secureError
      }
      throw SecureRecorderError.initializationFailed(error.localizedDescription)
    }
  }
  
  private func processAudioBuffer(buffer: AVAudioPCMBuffer) {
    guard let encryptionStream = encryptionStream,
          let channelData = buffer.int16ChannelData else {
      return
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
      // Log error but don't throw - recording will continue
      print("Error encrypting audio buffer: \(error.localizedDescription)")
    }
  }
  
  private func stopRecording() async throws -> String {
    let isRecording = stateQueue.sync {
      return _recordingState.isRecording
    }
    
    guard isRecording else {
      throw SecureRecorderError.noRecordingInProgress
    }
    
    return try await stopRecordingInternal()
  }
  
  private func stopRecordingInternal() async throws -> String {
    do {
      // Stop audio recording
      if let engine = audioEngine, let node = inputNode {
        audioRecorder.stop(engine: engine, inputNode: node)
      }
      
      // Finalize encryption (writes authentication tag)
      try encryptionStream?.finalize()
      
      // Close encryption stream
      encryptionStream?.close()
      encryptionStream = nil
      
      let filePath = stateQueue.sync { _recordingState.filePath ?? "" }
      
      // Reset state (thread-safe)
      stateQueue.sync {
        _recordingState = .idle
      }
      audioEngine = nil
      inputNode = nil
      
      return filePath
    } catch {
      cleanup()
      if let secureError = error as? SecureRecorderError {
        throw secureError
      }
      throw SecureRecorderError.stopFailed(error.localizedDescription)
    }
  }
  
  private func getStatus() -> [String: Any?] {
    let state = recordingState
    return [
      "isRecording": state.isRecording,
      "sessionId": state.sessionId,
      "filePath": state.filePath
    ]
  }
  
  private func cleanup() {
    stateQueue.sync {
      if let engine = audioEngine, let node = inputNode {
        audioRecorder.stop(engine: engine, inputNode: node)
      }
      
      encryptionStream?.finalize()
      encryptionStream?.close()
      encryptionStream = nil
      
      _recordingState = .idle
      audioEngine = nil
      inputNode = nil
    }
  }
}
