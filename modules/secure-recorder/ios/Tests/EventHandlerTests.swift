import XCTest
import Foundation

/**
 * Unit tests for EventHandler (iOS/iPadOS)
 * Tests event coordination with mocks
 */
@available(iOS 13.0, *)
class EventHandlerTests: XCTestCase {
  
  private var mockStateManager: StateManager!
  private var stopCalled: Bool = false
  private var stopResult: String = ""
  private var limitReachedCalled: Bool = false
  private var limitReachedReason: StopReason?
  private var limitReachedSessionId: String?
  private var limitReachedFilePath: String?
  
  override func setUp() {
    super.setUp()
    mockStateManager = StateManager()
    stopCalled = false
    stopResult = ""
    limitReachedCalled = false
    limitReachedReason = nil
    limitReachedSessionId = nil
    limitReachedFilePath = nil
  }
  
  override func tearDown() {
    mockStateManager = nil
    super.tearDown()
  }
  
  func testOnLimitReachedCallsOnStopAndOnLimitReachedHandler() {
    let expectation = XCTestExpectation(description: "onLimitReached called")
    stopResult = "/path/to/file.dat"
    
    let onStop: () throws -> String = {
      self.stopCalled = true
      return self.stopResult
    }
    
    let onLimitReached: (StopReason, String, String) async -> Void = { reason, sessionId, filePath in
      self.limitReachedCalled = true
      self.limitReachedReason = reason
      self.limitReachedSessionId = sessionId
      self.limitReachedFilePath = filePath
      expectation.fulfill()
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      stateManager: mockStateManager,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    eventHandler.onLimitReached(reason: .durationLimit)
    
    wait(for: [expectation], timeout: 1.0)
    
    XCTAssertTrue(stopCalled, "onStop should be called")
    XCTAssertTrue(limitReachedCalled, "onLimitReached handler should be called")
    XCTAssertEqual(.durationLimit, limitReachedReason)
    XCTAssertEqual("test-session", limitReachedSessionId)
    XCTAssertEqual("/path/to/file.dat", limitReachedFilePath)
  }
  
  func testOnLimitReachedWorksWithoutOnLimitReachedHandler() {
    stopResult = "/path/to/file.dat"
    
    let onStop: () throws -> String = {
      self.stopCalled = true
      return self.stopResult
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      stateManager: mockStateManager,
      onStop: onStop,
      onLimitReached: nil
    )
    
    eventHandler.onLimitReached(reason: .fileSizeLimit)
    
    // Wait a bit for async Task to complete
    Thread.sleep(forTimeInterval: 0.1)
    
    XCTAssertTrue(stopCalled, "onStop should be called even without handler")
    XCTAssertFalse(limitReachedCalled, "onLimitReached handler should not be called when nil")
  }
  
  func testOnErrorDeactivatesStateManager() {
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      stateManager: mockStateManager,
      onStop: { "" },
      onLimitReached: nil
    )
    
    mockStateManager.activate()
    XCTAssertTrue(mockStateManager.isActive, "State should be active before error")
    
    eventHandler.onError(message: "Test error message")
    
    XCTAssertFalse(mockStateManager.isActive, "State should be deactivated after error")
  }
  
  func testOnLimitReachedHandlesStopFailureGracefully() {
    let expectation = XCTestExpectation(description: "onLimitReached called even on stop failure")
    
    let onStop: () throws -> String = {
      throw SecureRecorderError.stopFailed("Stop failed")
    }
    
    let onLimitReached: (StopReason, String, String) async -> Void = { reason, sessionId, filePath in
      self.limitReachedCalled = true
      self.limitReachedReason = reason
      self.limitReachedSessionId = sessionId
      self.limitReachedFilePath = filePath
      expectation.fulfill()
    }
    
    let outputFile = FileManager.default.temporaryDirectory.appendingPathComponent("test.dat")
    let eventHandler = EventHandler(
      sessionId: "test-session",
      outputFile: outputFile,
      stateManager: mockStateManager,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    eventHandler.onLimitReached(reason: .durationLimit)
    
    wait(for: [expectation], timeout: 1.0)
    
    // Should still call handler with filePath from outputFile
    XCTAssertTrue(limitReachedCalled, "Handler should be called even if stop fails")
    XCTAssertEqual(outputFile.path, limitReachedFilePath, "Should use outputFile path when stop fails")
  }
  
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
      stateManager: mockStateManager,
      onStop: onStop,
      onLimitReached: onLimitReached
    )
    
    let reasons: [StopReason] = [.durationLimit, .fileSizeLimit, .userStopped, .error]
    
    for reason in reasons {
      eventHandler.onLimitReached(reason: reason)
    }
    
    wait(for: [expectation], timeout: 2.0)
    
    // Last reason should be error
    XCTAssertEqual(.error, limitReachedReason)
  }
}
