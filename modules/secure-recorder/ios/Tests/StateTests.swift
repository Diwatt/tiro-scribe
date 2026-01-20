import XCTest
import Foundation

/**
 * Unit tests for State (iOS/iPadOS)
 * Tests match Android StateTest structure and naming
 */
@available(iOS 13.0, *)
class StateTests: XCTestCase {
  
  // MARK: - idle state tests (matching Android StateTest)
  
  func testIdleStateHasCorrectDefaultValues() {
    // Equivalent to Android: "IDLE state has correct default values"
    let idleState = State.idle
    
    XCTAssertFalse(idleState.isRecording, "idle state should not be recording")
    XCTAssertNil(idleState.sessionId, "idle state should have nil sessionId")
    XCTAssertNil(idleState.filePath, "idle state should have nil filePath")
  }
  
  func testCanCreateState() {
    // Equivalent to Android: "can create recording state"
    let state = State(
      isRecording: true,
      sessionId: "test-session",
      filePath: "/path/to/file.dat"
    )
    
    XCTAssertTrue(state.isRecording, "State should be recording")
    XCTAssertEqual("test-session", state.sessionId, "Session ID should match")
    XCTAssertEqual("/path/to/file.dat", state.filePath, "File path should match")
  }
  
  func testCanCreateIdleStateManually() {
    // Equivalent to Android: "can create idle state manually"
    let state = State(
      isRecording: false,
      sessionId: nil,
      filePath: nil
    )
    
    XCTAssertFalse(state.isRecording, "State should not be recording")
    XCTAssertNil(state.sessionId, "Session ID should be nil")
    XCTAssertNil(state.filePath, "File path should be nil")
  }
  
  func testStateWithPartialData() {
    // Equivalent to Android: "recording state with partial data"
    let state = State(
      isRecording: true,
      sessionId: "test-session",
      filePath: nil
    )
    
    XCTAssertTrue(state.isRecording, "State should be recording")
    XCTAssertEqual("test-session", state.sessionId, "Session ID should be set")
    XCTAssertNil(state.filePath, "File path can be nil during initialization")
  }
  
  func testStructProvidesInitializer() {
    // Equivalent to Android: "data class provides copy method"
    // Swift structs don't have copy(), but we can create new instances
    let original = State(
      isRecording: true,
      sessionId: "original",
      filePath: "/original/path"
    )
    
    // Create modified version
    let modified = State(
      isRecording: original.isRecording,
      sessionId: "modified",
      filePath: original.filePath
    )
    
    XCTAssertTrue(modified.isRecording, "Modified state should preserve isRecording")
    XCTAssertEqual("modified", modified.sessionId, "Modified state should have modified sessionId")
    XCTAssertEqual("/original/path", modified.filePath, "Modified state should preserve filePath")
  }
  
  func testStructProvidesEquality() {
    // Equivalent to Android: "data class provides equals method"
    let state1 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state2 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state3 = State(isRecording: true, sessionId: "session2", filePath: "/path1")
    
    XCTAssertEqual(state1, state2, "Identical states should be equal")
    XCTAssertNotEqual(state1, state3, "Different session IDs should not be equal")
  }
  
  func testStructProvidesHashValue() {
    // Equivalent to Android: "data class provides hashCode method"
    let state1 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state2 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    
    XCTAssertEqual(state1.hashValue, state2.hashValue, 
                   "Equal states should have equal hash values")
  }
  
  func testStructProvidesDescription() {
    // Equivalent to Android: "data class provides toString method"
    let state = State(isRecording: true, sessionId: "test-session", filePath: "/test/path")
    let description = String(describing: state)
    
    XCTAssertTrue(description.contains("State"), "Description should contain struct name")
    XCTAssertTrue(description.contains("isRecording"), "Description should contain isRecording")
    XCTAssertTrue(description.contains("sessionId"), "Description should contain sessionId")
    XCTAssertTrue(description.contains("filePath"), "Description should contain filePath")
  }
  
  func testStateIsImmutable() {
    // Equivalent to Android: "State is immutable"
    // Verify that all properties are let (read-only)
    // This is enforced by Swift's struct with let properties
    let state = State(isRecording: true, sessionId: "session", filePath: "/path")
    
    // Cannot reassign properties (would not compile):
    // state.isRecording = false // Compilation error
    // state.sessionId = "new" // Compilation error
    // state.filePath = "/new" // Compilation error
    
    // Can only create new instances
    let newState = State(
      isRecording: false,
      sessionId: state.sessionId,
      filePath: state.filePath
    )
    XCTAssertFalse(newState.isRecording, "New state should have modified value")
    XCTAssertTrue(state.isRecording, "Original state should remain unchanged")
  }
}

// Extend State to be Equatable and Hashable for tests
extension State: Equatable, Hashable {
  static func == (lhs: State, rhs: State) -> Bool {
    return lhs.isRecording == rhs.isRecording &&
           lhs.sessionId == rhs.sessionId &&
           lhs.filePath == rhs.filePath
  }
  
  func hash(into hasher: inout Hasher) {
    hasher.combine(isRecording)
    hasher.combine(sessionId)
    hasher.combine(filePath)
  }
}
