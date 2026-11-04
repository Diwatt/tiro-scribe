import Foundation
import AVFoundation
@testable import SecureRecorder

/**
 * Shared mock implementations for iOS tests
 *
 * Centralized mock classes to avoid duplication across test files.
 * Every mock conforms to a source protocol - no concrete types are faked.
 */

// MARK: - Mock EncryptionStream

class MockEncryptionStream: EncryptionStreamProtocol {
  var initializeCallCount = 0
  var writeCallCount = 0
  var closeCallCount = 0
  var flushCallCount = 0
  var writeData: [Data] = []
  var shouldThrowOnWrite = false
  var shouldThrowOnInitialize = false
  var shouldThrowOnFlush = false

  func initialize() throws {
    initializeCallCount += 1
    if shouldThrowOnInitialize {
      throw SecureRecorderError.recordingFailed("Mock initialization error")
    }
  }

  func write(data: Data) throws {
    writeCallCount += 1
    writeData.append(data)
    if shouldThrowOnWrite {
      throw SecureRecorderError.recordingFailed("Mock write error")
    }
  }

  func flush() throws {
    flushCallCount += 1
    if shouldThrowOnFlush {
      throw SecureRecorderError.recordingFailed("Mock flush error")
    }
  }

  func close() {
    closeCallCount += 1
  }

  func reset() {
    writeCallCount = 0
    writeData = []
    initializeCallCount = 0
    closeCallCount = 0
    flushCallCount = 0
    shouldThrowOnWrite = false
    shouldThrowOnInitialize = false
    shouldThrowOnFlush = false
  }
}

// MARK: - Mock LimitRegistry

class MockLimitRegistry: LimitRegistryProtocol {
  private var _limits: [Limit] = []
  var getLimitsCallCount = 0

  func setLimits(_ limits: [Limit]) {
    _limits = limits
  }

  func getLimits() -> [Limit] {
    getLimitsCallCount += 1
    return _limits
  }

  func reset() {
    getLimitsCallCount = 0
    _limits = []
  }
}

// MARK: - Mock RecordingTimer

class MockRecordingTimer: RecordingTimerProtocol {
  private var _isActive: Bool = false
  private var _elapsedTime: Int64 = 0
  private var _startTime: Int64 = 0

  var activateCallCount = 0
  var deactivateCallCount = 0
  var getElapsedTimeCallCount = 0
  var getStartTimeCallCount = 0
  var isActiveOverride: (() -> Bool)?

  var isActive: Bool {
    if let isActiveOverride = isActiveOverride {
      return isActiveOverride()
    }
    return _isActive
  }

  func activate() {
    activateCallCount += 1
    _isActive = true
    _startTime = Int64(Date().timeIntervalSince1970 * 1000)
  }

  func deactivate() {
    deactivateCallCount += 1
    _isActive = false
    _elapsedTime = 0
    _startTime = 0
  }

  func getElapsedTime() -> Int64 {
    getElapsedTimeCallCount += 1
    return _isActive ? _elapsedTime : 0
  }

  func getStartTime() -> Int64 {
    getStartTimeCallCount += 1
    return _startTime
  }

  func setElapsedTime(_ time: Int64) {
    _elapsedTime = time
  }

  func setActive(_ active: Bool) {
    _isActive = active
  }

  func reset() {
    _isActive = false
    _elapsedTime = 0
    _startTime = 0
    isActiveOverride = nil
    getElapsedTimeCallCount = 0
    getStartTimeCallCount = 0
    activateCallCount = 0
    deactivateCallCount = 0
  }
}

// MARK: - Mock AudioRecord (Pipeline seam)

class MockAudioRecord: AudioRecordProtocol {
  var readResults: [Int] = []
  var readPayload = Data()
  var readCallCount = 0
  var lastReadOffset: Int?
  var lastReadSize: Int?

  func read(_ buffer: UnsafeMutablePointer<UInt8>, offset: Int, size: Int) -> Int {
    readCallCount += 1
    lastReadOffset = offset
    lastReadSize = size

    guard !readResults.isEmpty else {
      return 0
    }

    let result = readResults.removeFirst()
    guard result > 0 else {
      return result
    }

    let bytesToCopy = min(size, readPayload.count)
    readPayload.withUnsafeBytes { bytes in
      guard let baseAddress = bytes.baseAddress else { return }
      memcpy(buffer.advanced(by: offset), baseAddress, bytesToCopy)
    }
    return min(result, bytesToCopy)
  }
}

// MARK: - Mock KeyManager

class MockKeyManager: KeyManagerProtocol {
  var getOrCreateKeyCallCount = 0
  var lastAlias: String?
  var shouldThrow = false
  var keyData = Data(repeating: 0xAB, count: 32)

  func getOrCreateKey(alias: String) throws -> Data {
    getOrCreateKeyCallCount += 1
    lastAlias = alias
    if shouldThrow {
      throw SecureRecorderError.keychainError("Mock keychain error")
    }
    return keyData
  }
}

// MARK: - Mock AudioSession

class MockAudioSession: AudioSessionProtocol {
  var setCategoryCallCount = 0
  var setCategoryCategory: AVAudioSession.Category?
  var setCategoryMode: AVAudioSession.Mode?
  var setCategoryOptions: AVAudioSession.CategoryOptions?
  var setCategoryShouldThrow = false

  var setActiveCallCount = 0
  var setActiveActive: Bool?
  var setActiveOptions: AVAudioSession.SetActiveOptions?
  var setActiveShouldThrow = false

  func setCategory(_ category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions) throws {
    setCategoryCallCount += 1
    setCategoryCategory = category
    setCategoryMode = mode
    setCategoryOptions = options

    if setCategoryShouldThrow {
      throw NSError(domain: "MockAudioSession", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
    }
  }

  func setActive(_ active: Bool, options: AVAudioSession.SetActiveOptions) throws {
    setActiveCallCount += 1
    setActiveActive = active
    setActiveOptions = options

    if setActiveShouldThrow {
      throw NSError(domain: "MockAudioSession", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
    }
  }
}

// MARK: - Mock AudioEngine

class MockAudioEngine: AudioEngineProtocol {
  private var _isRunning = false
  var audioInputNode: AudioInputNodeProtocol = MockAudioInputNode()
  var startCallCount = 0
  var stopCallCount = 0
  var prepareCallCount = 0
  var startShouldThrow = false

  var isRunning: Bool { _isRunning }

  func prepare() {
    prepareCallCount += 1
  }

  func start() throws {
    startCallCount += 1
    if startShouldThrow {
      throw NSError(domain: "MockAudioEngine", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock start error"])
    }
    _isRunning = true
  }

  func stop() {
    stopCallCount += 1
    _isRunning = false
  }
}

// MARK: - Mock AudioInputNode

class MockAudioInputNode: AudioInputNodeProtocol {
  var installTapCallCount = 0
  var removeTapCallCount = 0
  private var installedTap: ((AVAudioPCMBuffer, AVAudioTime) -> Void)?
  private let fmt: AVAudioFormat

  init() {
    self.fmt = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000.0, channels: 1, interleaved: true)!
  }

  func inputFormat(forBus bus: AVAudioNodeBus) -> AVAudioFormat {
    return fmt
  }

  func installTap(onBus bus: AVAudioNodeBus, bufferSize: AVAudioFrameCount, format: AVAudioFormat?, block tapBlock: @escaping AVAudioNodeTapBlock) {
    installTapCallCount += 1
    installedTap = tapBlock
  }

  func removeTap(onBus bus: AVAudioNodeBus) {
    removeTapCallCount += 1
    installedTap = nil
  }

  func triggerTap(buffer: AVAudioPCMBuffer) {
    guard let tap = installedTap else { return }
    let time = AVAudioTime(sampleTime: 0, atRate: buffer.format.sampleRate)
    tap(buffer, time)
  }
}
