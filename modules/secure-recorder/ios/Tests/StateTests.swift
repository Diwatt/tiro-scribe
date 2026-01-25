import XCTest
import Foundation

/**
 * Unit tests for State (iOS/iPadOS)
 * Tests match Android StateTest structure and naming
 */
@available(iOS 13.0, *)
class StateTests: XCTestCase {
  
  // MARK: - Equality and hash logic
  
  func testStructProvidesEquality() {
    let state1 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state2 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state3 = State(isRecording: true, sessionId: "session2", filePath: "/path1")
    
    XCTAssertEqual(state1, state2, "Identical states should be equal")
    XCTAssertNotEqual(state1, state3, "Different session IDs should not be equal")
  }
  
  func testStructProvidesHashValue() {
    let state1 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    let state2 = State(isRecording: true, sessionId: "session1", filePath: "/path1")
    
    XCTAssertEqual(state1.hashValue, state2.hashValue, 
                   "Equal states should have equal hash values")
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
