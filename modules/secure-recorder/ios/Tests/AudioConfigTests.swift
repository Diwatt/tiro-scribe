import XCTest
import AVFoundation

/**
 * Unit tests for AudioConfig (iOS/iPadOS)
 * Tests match Android AudioConfigTest structure and naming
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
  
  // MARK: - Configuration value tests (matching Android AudioConfigTest)
  
  func testSampleRateReturns16000Hz() {
    // Equivalent to Android: "sampleRate returns 16000 Hz"
    XCTAssertEqual(16000.0, audioConfig.sampleRate, "Sample rate should be 16kHz")
  }
  
  func testChannelCountReturnsMono() {
    // Equivalent to Android: "channelConfig returns mono"
    XCTAssertEqual(1, audioConfig.channelCount, "Channel count should be 1 (mono)")
  }
  
  func testBitDepthReturns16Bit() {
    // Equivalent to Android: "audioFormat returns PCM 16-bit"
    XCTAssertEqual(16, audioConfig.bitDepth, "Bit depth should be 16 (PCM 16-bit)")
  }
  
  func testBufferSizeReturnsPositiveValue() {
    // Equivalent to Android: "bufferSize returns positive value"
    XCTAssertGreaterThan(audioConfig.bufferSize, 0, "Buffer size should be positive")
  }
  
  func testBufferSizeIsReasonable() {
    // Equivalent to Android: "bufferSize is at least minimum required"
    // 256 frames is reasonable for 16kHz audio (~16ms buffer)
    XCTAssertGreaterThanOrEqual(audioConfig.bufferSize, 256, "Buffer size should be at least 256 frames")
  }
  
  func testBufferSizeUsesFallbackWhenMinimumIsInvalid() {
    // Equivalent to Android: "bufferSize uses fallback when minimum is invalid"
    // iOS doesn't have the same fallback mechanism, but verify buffer is reasonable
    let bufferSize = audioConfig.bufferSize
    XCTAssertGreaterThanOrEqual(bufferSize, 256, "Buffer size should be reasonable")
    XCTAssertLessThanOrEqual(bufferSize, 4096, "Buffer size should not be excessive")
  }
  
  func testAudioConfigIsInstantiable() {
    // Equivalent to Android: "AudioConfig is instantiable"
    XCTAssertNotNil(audioConfig)
  }
  
  func testConfigurationValuesRemainConstant() {
    // Equivalent to Android: "configuration values remain constant"
    let sampleRate1 = audioConfig.sampleRate
    let sampleRate2 = audioConfig.sampleRate
    let channelCount1 = audioConfig.channelCount
    let channelCount2 = audioConfig.channelCount
    let bitDepth1 = audioConfig.bitDepth
    let bitDepth2 = audioConfig.bitDepth
    
    XCTAssertEqual(sampleRate1, sampleRate2, "Sample rate should remain constant")
    XCTAssertEqual(channelCount1, channelCount2, "Channel count should remain constant")
    XCTAssertEqual(bitDepth1, bitDepth2, "Bit depth should remain constant")
  }
  
  func testConfigurationUsesCorrectAudioFormat() {
    // Equivalent to Android: "configuration uses correct audio format"
    XCTAssertEqual(16000.0, audioConfig.sampleRate, "Sample rate must be 16kHz")
    XCTAssertEqual(1, audioConfig.channelCount, "Must be mono")
    XCTAssertEqual(16, audioConfig.bitDepth, "Must be 16-bit PCM")
  }
  
  // MARK: - Format creation tests (iOS-specific)
  
  func testCreateFormatReturnsValidFormat() {
    let format = audioConfig.createFormat()
    
    XCTAssertNotNil(format, "createFormat should return a non-nil AVAudioFormat")
  }
  
  func testCreateFormatUsesCorrectSampleRate() {
    guard let format = audioConfig.createFormat() else {
      XCTFail("Format should not be nil")
      return
    }
    
    XCTAssertEqual(16000.0, format.sampleRate, "Format should use 16kHz sample rate")
  }
  
  func testCreateFormatUsesCorrectChannelCount() {
    guard let format = audioConfig.createFormat() else {
      XCTFail("Format should not be nil")
      return
    }
    
    XCTAssertEqual(1, format.channelCount, "Format should use mono (1 channel)")
  }
  
  func testCreateFormatUsesPCM16() {
    guard let format = audioConfig.createFormat() else {
      XCTFail("Format should not be nil")
      return
    }
    
    XCTAssertEqual(AVAudioCommonFormat.pcmFormatInt16, format.commonFormat, 
                   "Format should use PCM Int16")
  }
  
  func testCreateFormatIsInterleaved() {
    guard let format = audioConfig.createFormat() else {
      XCTFail("Format should not be nil")
      return
    }
    
    XCTAssertTrue(format.isInterleaved, "Format should be interleaved")
  }
}
