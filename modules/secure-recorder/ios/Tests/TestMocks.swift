import Foundation
import AVFoundation

/**
 * Shared mock implementations for iOS tests
 * 
 * Centralized mock classes to avoid duplication across test files
 */

// MARK: - Mock EncryptionStream

class MockEncryptionStream: EncryptionStreamProtocol {
  var initializeCallCount = 0
  var writeCallCount = 0
  var closeCallCount = 0
  var writeData: [Data] = []
  var shouldThrowOnWrite = false
  var shouldThrowOnInitialize = false
  
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
  
  func close() {
    closeCallCount += 1
  }
  
  func reset() {
    writeCallCount = 0
    writeData = []
    initializeCallCount = 0
    closeCallCount = 0
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
    return _limits.isEmpty ? [.durationDefault(), .fileSizeDefault()] : _limits
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
  
  var isActive: Bool {
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
    getElapsedTimeCallCount = 0
    getStartTimeCallCount = 0
    activateCallCount = 0
    deactivateCallCount = 0
  }
}
