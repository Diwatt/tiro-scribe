import XCTest
import Foundation

/**
 * Unit tests for RecordingTimer (iOS/iPadOS)
 * Tests match Android RecordingTimerTest structure and naming
 */
@available(iOS 13.0, *)
class RecordingTimerTests: XCTestCase {
  
  private var recordingTimer: RecordingTimer!
  
  override func setUp() {
    super.setUp()
    recordingTimer = RecordingTimer()
  }
  
  override func tearDown() {
    recordingTimer = nil
    super.tearDown()
  }
  
  func testInitialStateIsInactive() {
    XCTAssertFalse(recordingTimer.isActive, "RecordingTimer should start inactive")
  }
  
  func testActivateSetsStateToActive() {
    recordingTimer.activate()
    
    XCTAssertTrue(recordingTimer.isActive, "RecordingTimer should be active after activate()")
  }
  
  func testDeactivateSetsStateToInactive() {
    recordingTimer.activate()
    recordingTimer.deactivate()
    
    XCTAssertFalse(recordingTimer.isActive, "RecordingTimer should be inactive after deactivate()")
  }
  
  func testGetElapsedTimeReturnsZeroWhenNotActive() {
    let elapsedTime = recordingTimer.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 when not active")
  }
  
  func testGetElapsedTimeReturnsZeroWhenActiveButStartTimeIsZero() {
    let elapsedTime = recordingTimer.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 when startTime is 0")
  }
  
  func testGetElapsedTimeIncreasesAfterActivation() {
    recordingTimer.activate()
    
    let initialTime = recordingTimer.getElapsedTime()
    XCTAssertTrue(initialTime >= 0, "Initial elapsed time should be >= 0")
    
    // Wait a bit
    Thread.sleep(forTimeInterval: 0.01)
    
    let laterTime = recordingTimer.getElapsedTime()
    XCTAssertTrue(laterTime > initialTime, "Elapsed time should increase")
  }
  
  func testGetStartTimeReturnsZeroWhenNotActive() {
    let startTime = recordingTimer.getStartTime()
    
    XCTAssertEqual(0, startTime, "Start time should be 0 when not active")
  }
  
  func testGetStartTimeReturnsTimestampWhenActive() {
    recordingTimer.activate()
    
    let startTime = recordingTimer.getStartTime()
    XCTAssertTrue(startTime > 0, "Start time should be > 0 when active")
  }
  
  func testGetStartTimeIsSetOnActivation() {
    recordingTimer.activate()
    let startTimeBefore = recordingTimer.getStartTime()
    
    recordingTimer.deactivate()
    let startTimeAfter = recordingTimer.getStartTime()
    
    XCTAssertEqual(0, startTimeAfter, "Start time should be reset to 0 after deactivate()")
  }
  
  func testGetElapsedTimeReturnsZeroAfterDeactivation() {
    recordingTimer.activate()
    
    recordingTimer.deactivate()
    let elapsedTime = recordingTimer.getElapsedTime()
    
    XCTAssertEqual(0, elapsedTime, "Elapsed time should be 0 after deactivation")
  }
  
  func testActivateUpdatesStartTime() {
    recordingTimer.activate()
    let firstStartTime = recordingTimer.getStartTime()
    
    Thread.sleep(forTimeInterval: 0.01)
    recordingTimer.activate()
    let secondStartTime = recordingTimer.getStartTime()
    
    XCTAssertTrue(secondStartTime > firstStartTime, "Start time should be updated on reactivation")
  }
}
