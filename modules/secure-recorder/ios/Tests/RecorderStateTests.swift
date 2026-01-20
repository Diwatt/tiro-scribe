import XCTest
import Foundation

/**
 * Unit tests for RecorderState (iOS/iPadOS)
 * Tests match Android RecorderStateTest structure and naming
 */
@available(iOS 13.0, *)
class RecorderStateTests: XCTestCase {
  
  func testToJsStringReturnsCorrectValues() {
    XCTAssertEqual("inactive", RecorderState.inactive.toJsString())
    XCTAssertEqual("recording", RecorderState.recording.toJsString())
    XCTAssertEqual("stopped", RecorderState.stopped.toJsString())
  }
  
  func testFromJsStringParsesValidValues() {
    XCTAssertEqual(RecorderState.inactive, RecorderState.fromJsString("inactive"))
    XCTAssertEqual(RecorderState.recording, RecorderState.fromJsString("recording"))
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
  
  func testFromStateReturnsStoppedWhenFilePathIsNotNilAndNotRecording() {
    let state = RecorderState.fromState(isRecording: false, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.stopped, state)
  }
  
  func testFromStateReturnsInactiveWhenNotRecordingAndFilePathIsNil() {
    let state = RecorderState.fromState(isRecording: false, filePath: nil)
    
    XCTAssertEqual(RecorderState.inactive, state)
  }
  
  func testFromStatePrioritizesRecordingOverStopped() {
    // When recording, should return recording even if filePath exists
    let state = RecorderState.fromState(isRecording: true, filePath: "/path/to/file.dat")
    
    XCTAssertEqual(RecorderState.recording, state)
  }
  
  func testToJsStringAndFromJsStringAreInverseOperations() {
    let states: [RecorderState] = [.inactive, .recording, .stopped]
    
    for originalState in states {
      let jsString = originalState.toJsString()
      let parsedState = RecorderState.fromJsString(jsString)
      XCTAssertEqual(originalState, parsedState, "toJsString and fromJsString should be inverse")
    }
  }
}
