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

  func testCreateFormatReturnsValidAVAudioFormat() {
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format, "createFormat should produce a non-nil AVAudioFormat")
    guard let format = format else { return }
    XCTAssertEqual(format.sampleRate, 16000.0, accuracy: 0.0001, "Sample rate should be 16kHz")
    XCTAssertEqual(format.channelCount, 1, "Channel count should be mono (1)")
    XCTAssertTrue(format.isInterleaved, "Format should be interleaved as configured")
    XCTAssertEqual(format.commonFormat, .pcmFormatInt16, "PCM format should be 16-bit integer")
  }

  func testBufferSizeIsMemoizedAndStableAcrossAccesses() {
    // lazy var should compute once and then be stable
    let first = audioConfig.bufferSize
    let second = audioConfig.bufferSize
    XCTAssertEqual(first, second, "Buffer size should be memoized and not change between accesses")
  }

  func testTargetFramesCalculationCommentExpectation() {
    // Validate target frames for 10ms at 16kHz would be 160, but min of 256 wins
    let targetFrames = Int(16000.0 * 0.01)
    XCTAssertEqual(targetFrames, 160, "Target frames for 10ms at 16kHz should be 160")
    XCTAssertEqual(audioConfig.bufferSize, 256, "Minimum buffer size should override target frames when larger")
  }

  func testFormatMatchesConfigurationConstants() {
    // Ensure format reflects the class constants to avoid accidental divergence
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format)
    guard let format = format else { return }
    // Reflect on AudioConfig constants via the instance
    XCTAssertEqual(format.sampleRate, audioConfig.sampleRate, accuracy: 0.0001)
    XCTAssertEqual(format.channelCount, AVAudioChannelCount(audioConfig.channelCount))
  }

  func testInterleavingIsTrueAsSpecified() {
    // Explicit check of interleaving contract
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format)
    XCTAssertTrue(format?.isInterleaved == true)
  }

  func testBitDepthConstantAndFormatBitsConsistency() {
    XCTAssertEqual(audioConfig.bitDepth, 16, "Bit depth constant should be 16")
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format, "createFormat should produce a non-nil AVAudioFormat")
    guard let format = format else { return }
    let asbd = format.streamDescription.pointee
    XCTAssertEqual(asbd.mBitsPerChannel, 16, "AVAudioFormat bits per channel should be 16 for pcmFormatInt16")
    XCTAssertEqual(format.commonFormat, .pcmFormatInt16, "Common format should be pcmFormatInt16 for 16-bit PCM")
  }

  func testFormatBytesPerFrameMatchesBitDepthAndChannels() {
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format)
    guard let format = format else { return }
    let asbd = format.streamDescription.pointee
    let expectedBytesPerFrame = UInt32((audioConfig.bitDepth / 8) * audioConfig.channelCount)
    XCTAssertEqual(asbd.mBytesPerFrame, expectedBytesPerFrame, "Bytes per frame should equal (bitDepth/8) * channelCount")
  }

  func testFormatChannelsPerFrameMatchesChannelCount() {
    let format = audioConfig.createFormat()
    XCTAssertNotNil(format)
    guard let format = format else { return }
    let asbd = format.streamDescription.pointee
    XCTAssertEqual(asbd.mChannelsPerFrame, UInt32(audioConfig.channelCount), "ASBD channels per frame should match AudioConfig.channelCount")
    XCTAssertEqual(format.channelCount, AVAudioChannelCount(audioConfig.channelCount), "AVAudioFormat channelCount should match AudioConfig.channelCount")
  }

  func testBufferDurationIsAtLeastTenMilliseconds() {
    let durationSeconds = Double(audioConfig.bufferSize) / audioConfig.sampleRate
    XCTAssertGreaterThanOrEqual(durationSeconds, 0.01, "Buffer duration should be >= 10 ms")
  }

  func testCreateFormatIsIdempotentInAttributes() {
    let first = audioConfig.createFormat()
    let second = audioConfig.createFormat()
    XCTAssertNotNil(first)
    XCTAssertNotNil(second)
    guard let f1 = first, let f2 = second else { return }
    XCTAssertEqual(f1.sampleRate, f2.sampleRate, "Sample rate should be consistent across createFormat calls")
    XCTAssertEqual(f1.channelCount, f2.channelCount, "Channel count should be consistent across createFormat calls")
    XCTAssertEqual(f1.commonFormat, f2.commonFormat, "Common format should be consistent across createFormat calls")
    XCTAssertEqual(f1.isInterleaved, f2.isInterleaved, "Interleaving should be consistent across createFormat calls")

    let a1 = f1.streamDescription.pointee
    let a2 = f2.streamDescription.pointee
    XCTAssertEqual(a1.mBitsPerChannel, a2.mBitsPerChannel, "Bits per channel should be consistent across createFormat calls")
    XCTAssertEqual(a1.mBytesPerFrame, a2.mBytesPerFrame, "Bytes per frame should be consistent across createFormat calls")
  }
}
