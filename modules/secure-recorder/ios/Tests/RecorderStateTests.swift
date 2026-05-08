import XCTest
import Foundation

/**
 * Unit tests for RecorderState (iOS/iPadOS)
 * Tests match Android RecorderStateTest structure and naming
 */
@available(iOS 13.0, *)
class RecorderStateTests: XCTestCase {
  
  func testFromJsStringParsesValidValues() {
    XCTAssertEqual(RecorderState.inactive, RecorderState.fromJsString("inactive"))
    XCTAssertEqual(RecorderState.recording, RecorderState.fromJsString("recording"))
    XCTAssertEqual(RecorderState.paused, RecorderState.fromJsString("paused"))
    XCTAssertEqual(RecorderState.stopped, RecorderState.fromJsString("stopped"))
  }
  
  func testFromJsStringReturnsInactiveForUnknownValues() {
    XCTAssertEqual(RecorderState.inactive, RecorderState.fromJsString("unknown"))
    XCTAssertEqual(RecorderState.inactive, RecorderState.fromJsString(""))
    XCTAssertEqual(RecorderState.inactive, RecorderState.fromJsString("invalid_state"))
  }
  
  func testFromStateReturnsRecordingWhenIsRecordingIsTrue() {
    let state = RecorderState.fromState(isRecording: true, filePath: nil)
    
    XCTAssertEqual(RecorderState.recording, state)
  }
  
  func testFromStateReturnsPausedWhenIsPausedIsTrue() {
    let state = RecorderState.fromState(isRecording: false, isPaused: true, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.paused, state)
  }
  
  func testFromStateReturnsStoppedWhenFilePathIsNotNilAndNotRecording() {
    let state = RecorderState.fromState(isRecording: false, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.stopped, state)
  }
  
  func testFromStateReturnsInactiveWhenNotRecordingAndFilePathIsNil() {
    let state = RecorderState.fromState(isRecording: false, filePath: nil)
    
    XCTAssertEqual(RecorderState.inactive, state)
  }
  
  func testFromStatePrioritizesRecordingOverPausedAndStopped() {
    // When recording, should return recording even if isPaused and filePath exist
    let state = RecorderState.fromState(isRecording: true, isPaused: true, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.recording, state)
  }
  
  func testFromStatePrioritizesPausedOverStopped() {
    // When paused with file path, should return paused (not stopped)
    let state = RecorderState.fromState(isRecording: false, isPaused: true, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.paused, state)
  }
  
  func testToJsStringAndFromJsStringAreInverseOperations() {
    let states: [RecorderState] = [.inactive, .recording, .paused, .stopped]
    
    for originalState in states {
      let jsString = originalState.toJsString()
      let parsedState = RecorderState.fromJsString(jsString)
      XCTAssertEqual(originalState, parsedState, "toJsString and fromJsString should be inverse")
    }
  }
}
