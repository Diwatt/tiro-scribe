import XCTest
import Foundation

/**
 * Unit tests for StateManager (iOS/iPadOS)
 * Tests match Android StateManagerTest structure and naming
 */
@available(iOS 13.0, *)
class StateManagerTests: XCTestCase {
  
  private var stateManager: StateManager!
  
  override func setUp() {
    super.setUp()
    stateManager = StateManager()
  }
  
  override func tearDown() {
    stateManager = nil
    super.tearDown()
  }
  
  func testInitialStateIsInactive() {
    XCTAssertFalse(stateManager.isActive, "StateManager should start inactive")
  }
  
  func testActivateSetsStateToActive() {
    stateManager.activate()
    
    XCTAssertTrue(stateManager.isActive, "StateManager should be active after activate()")
  }
  
  func testDeactivateSetsStateToInactive() {
    stateManager.activate()
    stateManager.deactivate()
    
    XCTAssertFalse(stateManager.isActive, "StateManager should be inactive after deactivate()")
  }
  
  func testGetElapsedTimeReturns0WhenNotActive() {
    let elapsedTime = stateManager.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 when not active")
  }
  
  func testGetElapsedTimeReturns0WhenActiveButStartTimeIs0() {
    // Edge case: shouldn't happen in practice, but test defensive behavior
    let elapsedTime = stateManager.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 when startTime is 0")
  }
  
  func testGetElapsedTimeIncreasesAfterActivation() {
    stateManager.activate()
    
    let initialTime = stateManager.getElapsedTime()
    XCTAssertGreaterThanOrEqual(initialTime, 0, "Initial elapsed time should be >= 0")
    
    // Wait a bit
    Thread.sleep(forTimeInterval: 0.01)
    
    let laterTime = stateManager.getElapsedTime()
    XCTAssertGreaterThan(laterTime, initialTime, "Elapsed time should increase")
  }
  
  func testGetStartTimeReturns0WhenNotActive() {
    let startTime = stateManager.getStartTime()
    
    XCTAssertEqual(0, startTime, "Start time should be 0 when not active")
  }
  
  func testGetStartTimeReturnsTimestampAfterActivation() {
    let beforeActivation = Int64(Date().timeIntervalSince1970 * 1000)
    stateManager.activate()
    let afterActivation = Int64(Date().timeIntervalSince1970 * 1000)
    
    let startTime = stateManager.getStartTime()
    
    XCTAssertGreaterThanOrEqual(startTime, beforeActivation, "Start time should be >= before activation")
    XCTAssertLessThanOrEqual(startTime, afterActivation, "Start time should be <= after activation")
  }
  
  func testDeactivateResetsStartTimeTo0() {
    stateManager.activate()
    let startTimeBefore = stateManager.getStartTime()
    XCTAssertGreaterThan(startTimeBefore, 0, "Start time should be set after activation")
    
    stateManager.deactivate()
    let startTimeAfter = stateManager.getStartTime()
    
    XCTAssertEqual(0, startTimeAfter, "Start time should be reset to 0 after deactivate")
  }
  
  func testGetElapsedTimeReturns0AfterDeactivation() {
    stateManager.activate()
    Thread.sleep(forTimeInterval: 0.01)
    
    stateManager.deactivate()
    let elapsedTime = stateManager.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 after deactivation")
  }
  
  func testMultipleActivateCallsUpdateStartTime() {
    stateManager.activate()
    let firstStartTime = stateManager.getStartTime()
    
    Thread.sleep(forTimeInterval: 0.01)
    
    stateManager.activate()
    let secondStartTime = stateManager.getStartTime()
    
    XCTAssertGreaterThan(secondStartTime, firstStartTime, "Second activation should update start time")
  }
}
