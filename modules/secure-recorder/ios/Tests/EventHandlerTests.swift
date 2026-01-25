import XCTest
import Foundation

/**
 * Unit tests for EventHandler (iOS/iPadOS)
 * Tests verify EventHandler logic only - all dependencies are mocked
 * Each conditional branch has at least one test
 */
@available(iOS 13.0, *)
class EventHandlerTests: XCTestCase {
  
  private var mockRecordingTimer: MockRecordingTimer!
  private var stopCallCount: Int = 0
  private var stopResult: String = ""
  private var stopShouldThrow: Bool = false
  private var limitReachedCallCount: Int = 0
  private var limitReachedReason: StopReason?
  private var limitReachedSessionId: String?
  private var limitReachedFilePath: String?
  
  override func setUp() {
    super.setUp()
    mockRecordingTimer = MockRecordingTimer()
    stopCallCount = 0
    stopResult = ""
    stopShouldThrow = false
    limitReachedCallCount = 0
    limitReachedReason = nil
    limitReachedSessionId = nil
    limitReachedFilePath = nil
  }
  
  override func tearDown() {
    mockRecordingTimer = nil
    super.tearDown()
  }
  
  // MARK: - Branch 1: onLimitReached with handler, onStop succeeds
  
  func testOnLimitReachedCallsOnStopAndHandlerWhenStopSucceeds() {
    let expectation = XCTestExpectation(description: "onLimitReached called")
    stopResult = "/path/to/file.dat"
    
    let onStop: () throws -> String = {
      self.stopCallCount += 1
      if self.stopShouldThrow {
        throw SecureRecorderError.stopFailed("Stop failed")
      }
      return self.stopResult
    }
    
    let onLimitReached: (StopReason, String, String) async -> Void = { reason, sessionId, filePath in
      self.limitReachedCallCount += 1
      self.limitReachedReason = reason
      self.limitReachedSessionId = sessionId
      self.limitReachedFilePath = filePath
      expectation.fulfill()
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    eventHandler.onLimitReached(reason: .durationLimit)
    
    wait(for: [expectation], timeout: 1.0)
    
    // Verify onStop was called exactly once
    XCTAssertEqual(1, stopCallCount, "onStop should be called exactly once")
    
    // Verify handler was called exactly once
    XCTAssertEqual(1, limitReachedCallCount, "onLimitReached handler should be called exactly once")
    XCTAssertEqual(.durationLimit, limitReachedReason, "Reason should match")
    XCTAssertEqual("test-session", limitReachedSessionId, "SessionId should match")
    XCTAssertEqual("/path/to/file.dat", limitReachedFilePath, "FilePath should match stop result")
  }
  
  // MARK: - Branch 2: onLimitReached with handler, onStop throws
  
  func testOnLimitReachedCallsHandlerWithOutputFileWhenStopThrows() {
    let expectation = XCTestExpectation(description: "onLimitReached called even on stop failure")
    stopShouldThrow = true
    
    let onStop: () throws -> String = {
      self.stopCallCount += 1
      if self.stopShouldThrow {
        throw SecureRecorderError.stopFailed("Stop failed")
      }
      return self.stopResult
    }
    
    let onLimitReached: (StopReason, String, String) async -> Void = { reason, sessionId, filePath in
      self.limitReachedCallCount += 1
      self.limitReachedReason = reason
      self.limitReachedSessionId = sessionId
      self.limitReachedFilePath = filePath
      expectation.fulfill()
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    eventHandler.onLimitReached(reason: .fileSizeLimit)
    
    wait(for: [expectation], timeout: 1.0)
    
    // Verify onStop was called (and threw)
    XCTAssertEqual(1, stopCallCount, "onStop should be called once")
    
    // Verify handler was still called with outputFile path
    XCTAssertEqual(1, limitReachedCallCount, "Handler should be called even if stop fails")
    XCTAssertEqual(.fileSizeLimit, limitReachedReason, "Reason should match")
    XCTAssertEqual(outputFile.path, limitReachedFilePath, "Should use outputFile path when stop fails")
  }
  
  // MARK: - Branch 3: onLimitReached without handler, onStop succeeds
  
  func testOnLimitReachedCallsOnStopWhenHandlerIsNil() {
    stopResult = "/path/to/file.dat"
    
    let onStop: () throws -> String = {
      self.stopCallCount += 1
      return self.stopResult
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: onStop,
      onLimitReached: nil
    )
    
    eventHandler.onLimitReached(reason: .userStopped)
    
    // Wait a bit for async Task to complete
    Thread.sleep(forTimeInterval: 0.1)
    
    // Verify onStop was called
    XCTAssertEqual(1, stopCallCount, "onStop should be called even without handler")
    
    // Verify handler was NOT called
    XCTAssertEqual(0, limitReachedCallCount, "Handler should not be called when nil")
  }
  
  // MARK: - Branch 4: onLimitReached without handler, onStop throws
  
  func testOnLimitReachedCallsOnStopWhenHandlerIsNilAndStopThrows() {
    stopShouldThrow = true
    
    let onStop: () throws -> String = {
      self.stopCallCount += 1
      if self.stopShouldThrow {
        throw SecureRecorderError.stopFailed("Stop failed")
      }
      return self.stopResult
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: onStop,
      onLimitReached: nil
    )
    
    eventHandler.onLimitReached(reason: .error)
    
    // Wait a bit for async Task to complete
    Thread.sleep(forTimeInterval: 0.1)
    
    // Verify onStop was called (and threw)
    XCTAssertEqual(1, stopCallCount, "onStop should be called even when it throws and handler is nil")
    
    // Verify handler was NOT called
    XCTAssertEqual(0, limitReachedCallCount, "Handler should not be called when nil")
  }
  
  // MARK: - Branch 5: onError calls recordingTimer.deactivate
  
  func testOnErrorCallsRecordingTimerDeactivate() {
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: { "" },
      onLimitReached: nil
    )
    
    mockRecordingTimer.setActive(true)
    XCTAssertEqual(0, mockRecordingTimer.deactivateCallCount, "deactivate should not be called yet")
    
    eventHandler.onError(message: "Test error message")
    
    // Verify deactivate was called exactly once
    XCTAssertEqual(1, mockRecordingTimer.deactivateCallCount, "deactivate should be called exactly once")
    XCTAssertFalse(mockRecordingTimer.isActive, "Timer should be inactive after deactivate")
  }
  
  // MARK: - Branch 6: onLimitReached passes correct reason
  
  func testOnLimitReachedPassesCorrectReason() {
    let expectation = XCTestExpectation(description: "onLimitReached called")
    expectation.expectedFulfillmentCount = 4
    stopResult = "/path/to/file.dat"
    
    let onStop: () throws -> String = { self.stopResult }
    
    let onLimitReached: (StopReason, String, String) async -> Void = { reason, _, _ in
      self.limitReachedReason = reason
      expectation.fulfill()
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      recordingTimer: mockRecordingTimer,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    let reasons: [StopReason] = [.durationLimit, .fileSizeLimit, .userStopped, .error]
    
    for reason in reasons {
      eventHandler.onLimitReached(reason: reason)
    }
    
    wait(for: [expectation], timeout: 2.0)
    
    // Last reason should be error
    XCTAssertEqual(.error, limitReachedReason, "Last reason should be error")
  }
}

