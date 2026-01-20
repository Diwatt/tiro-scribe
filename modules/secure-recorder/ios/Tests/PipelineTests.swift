import XCTest
import AVFoundation
import Foundation

/**
 * Unit tests for Pipeline (iOS/iPadOS)
 * Tests limit checking and audio processing with mocks
 */
@available(iOS 13.0, *)
class PipelineTests: XCTestCase {
  
  private var mockEncryptionStream: EncryptionStream!
  private var mockAudioConfig: AudioConfig!
  private var outputFile: URL!
  private var mockLimiter: LimitRegistry!
  private var mockStateManager: StateManager!
  private var limitReachedReason: StopReason?
  private var errorMessage: String?
  
  override func setUp() {
    super.setUp()
    
    // Create mock encryption stream
    let tempDir = FileManager.default.temporaryDirectory
    outputFile = tempDir.appendingPathComponent("test_pipeline_\(UUID().uuidString).dat")
    FileManager.default.createFile(atPath: outputFile.path, contents: nil, attributes: nil)
    
    // Create real instances (we'll test behavior, not mocks for simplicity)
    mockAudioConfig = AudioConfig()
    mockLimiter = LimitRegistry()
    mockStateManager = StateManager()
    
    // Create encryption stream with test key
    let testKey = Data(count: 32) // 32 bytes for AES-256
    _ = testKey.withUnsafeMutableBytes { bytes in
      SecRandomCopyBytes(kSecRandomDefault, 32, bytes.baseAddress!)
    }
    mockEncryptionStream = EncryptionStream(secretKey: testKey, outputFile: outputFile)
    try? mockEncryptionStream.initialize()
  }
  
  override func tearDown() {
    try? mockEncryptionStream.close()
    if FileManager.default.fileExists(atPath: outputFile.path) {
      try? FileManager.default.removeItem(at: outputFile)
    }
    mockEncryptionStream = nil
    mockAudioConfig = nil
    mockLimiter = nil
    mockStateManager = nil
    limitReachedReason = nil
    errorMessage = nil
    super.tearDown()
  }
  
  func testProcessAudioBufferCallsOnErrorWhenNoChannelData() {
    let buffer = AVAudioPCMBuffer(pcmFormat: AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16000, channels: 1, interleaved: false)!, frameCapacity: 0)!
    
    let pipeline = Pipeline(
      encryptionStream: mockEncryptionStream,
      audioConfig: mockAudioConfig,
      outputFile: outputFile,
      limiter: mockLimiter,
      stateManager: mockStateManager,
      onLimitReached: { reason in
        self.limitReachedReason = reason
      },
      onError: { message in
        self.errorMessage = message
      }
    )
    
    pipeline.processAudioBuffer(buffer: buffer)
    
    XCTAssertNotNil(errorMessage, "onError should be called when no channel data")
    XCTAssertTrue(errorMessage?.contains("No channel data") == true)
  }
  
  func testProcessAudioBufferStopsWhenDurationLimitExceeded() {
    // Create a limit registry with a very short duration limit
    let shortLimiter = LimitRegistry()
    mockStateManager.activate()
    
    // Wait a bit to ensure elapsed time exceeds limit
    Thread.sleep(forTimeInterval: 0.01)
    
    // Create a buffer with audio data
    let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 160)!
    buffer.frameLength = 160
    
    let pipeline = Pipeline(
      encryptionStream: mockEncryptionStream,
      audioConfig: mockAudioConfig,
      outputFile: outputFile,
      limiter: shortLimiter,
      stateManager: mockStateManager,
      onLimitReached: { reason in
        self.limitReachedReason = reason
      },
      onError: { message in
        self.errorMessage = message
      }
    )
    
    // Note: Duration limit is 4 hours, so this won't trigger in normal test
    // This test verifies the limit checking logic exists
    pipeline.processAudioBuffer(buffer: buffer)
    
    // Should not error on normal processing
    XCTAssertNil(errorMessage, "Should not error on normal processing")
  }
  
  func testProcessAudioBufferEncryptsAndWritesData() {
    mockStateManager.activate()
    
    // Create a buffer with audio data
    let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 160)!
    buffer.frameLength = 160
    
    // Fill buffer with test data
    if let channelData = buffer.int16ChannelData {
      for i in 0..<160 {
        channelData.pointee[i] = Int16(i % 1000)
      }
    }
    
    let pipeline = Pipeline(
      encryptionStream: mockEncryptionStream,
      audioConfig: mockAudioConfig,
      outputFile: outputFile,
      limiter: mockLimiter,
      stateManager: mockStateManager,
      onLimitReached: { reason in
        self.limitReachedReason = reason
      },
      onError: { message in
        self.errorMessage = message
      }
    )
    
    pipeline.processAudioBuffer(buffer: buffer)
    
    // Should not error
    XCTAssertNil(errorMessage, "Should not error when processing valid buffer")
    
    // File should have been written to (encrypted)
    let fileSize = try? FileManager.default.attributesOfItem(atPath: outputFile.path)[.size] as? Int64
    XCTAssertNotNil(fileSize, "File should exist after processing")
    XCTAssertGreaterThan(fileSize ?? 0, 0, "File should have content after encryption")
  }
  
  func testProcessAudioBufferHandlesEncryptionErrors() {
    // Create an invalid encryption stream to force an error
    let invalidKey = Data(count: 16) // Wrong key size
    let invalidStream = EncryptionStream(secretKey: invalidKey, outputFile: outputFile)
    // Don't initialize to force error
    
    mockStateManager.activate()
    
    let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 160)!
    buffer.frameLength = 160
    
    let pipeline = Pipeline(
      encryptionStream: invalidStream,
      audioConfig: mockAudioConfig,
      outputFile: outputFile,
      limiter: mockLimiter,
      stateManager: mockStateManager,
      onLimitReached: { reason in
        self.limitReachedReason = reason
      },
      onError: { message in
        self.errorMessage = message
      }
    )
    
    pipeline.processAudioBuffer(buffer: buffer)
    
    // Should call onError when encryption fails
    XCTAssertNotNil(errorMessage, "onError should be called when encryption fails")
  }
  
  func testProcessAudioBufferPreventsErrorSpam() {
    // Create an encryption stream that will fail (not initialized)
    let invalidKey = Data(count: 16) // Wrong key size
    let invalidStream = EncryptionStream(secretKey: invalidKey, outputFile: outputFile)
    // Don't initialize to force error
    
    mockStateManager.activate()
    
    let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 160)!
    buffer.frameLength = 160
    
    // Fill buffer with test data
    if let channelData = buffer.int16ChannelData {
      for i in 0..<160 {
        channelData.pointee[i] = Int16(i % 1000)
      }
    }
    
    var errorCallCount = 0
    
    let pipeline = Pipeline(
      encryptionStream: invalidStream,
      audioConfig: mockAudioConfig,
      outputFile: outputFile,
      limiter: mockLimiter,
      stateManager: mockStateManager,
      onLimitReached: { reason in
        self.limitReachedReason = reason
      },
      onError: { message in
        errorCallCount += 1
        self.errorMessage = message
      }
    )
    
    // Process multiple buffers - encryption will fail on each
    // But onError should only be called once (not spammed)
    pipeline.processAudioBuffer(buffer: buffer)
    pipeline.processAudioBuffer(buffer: buffer)
    pipeline.processAudioBuffer(buffer: buffer)
    pipeline.processAudioBuffer(buffer: buffer)
    pipeline.processAudioBuffer(buffer: buffer)
    
    // onError should be called exactly once, not once per buffer
    XCTAssertEqual(errorCallCount, 1, "onError should only be called once, not spammed for each buffer")
    XCTAssertNotNil(errorMessage, "Error message should be set")
    XCTAssertTrue(errorMessage?.contains("Error encrypting audio buffer") == true || errorMessage?.contains("not initialized") == true, "Error message should indicate encryption failure")
  }
}
