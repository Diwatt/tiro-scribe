import XCTest
import AVFoundation

/**
 * Unit tests for AudioConfig (iOS/iPadOS)
 * Tests buffer size calculation logic
 */
@available(iOS 13.0, *)
class AudioConfigTests: XCTestCase {
  var audioConfig: AudioConfig!

  override func setUp() {
    super.setUp()
    audioConfig = AudioConfig()
  }
  
  override func tearDown() {
    audioConfig = nil
    super.tearDown()
  }
    
  func testBufferSizeCalculationUsesMaxOfTargetAndMinimum() {
    // Buffer size calculation: max(targetFrames, minFrames) where targetFrames = sampleRate * 0.01
    // At 16kHz: targetFrames = 160, minFrames = 256, so max(160, 256) = 256
    let bufferSize = audioConfig.bufferSize
    XCTAssertEqual(256, bufferSize, "When target (160) < minimum (256), should return minimum")
    XCTAssertLessThanOrEqual(bufferSize, 4096, "Buffer size should not be excessive")
  }
}
