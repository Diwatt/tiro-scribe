import XCTest
import AVFoundation
@testable import SecureRecorder

@available(iOS 13.0, *)
class AudioRecordTests: XCTestCase {
  var engine: MockAudioEngine!
  var inputNode: MockAudioInputNode!
  var audioConfig: AudioConfig!
  var onReleaseCallCount: Int!
  var record: AudioRecord!

  override func setUp() {
    super.setUp()
    engine = MockAudioEngine()
    inputNode = MockAudioInputNode()
    audioConfig = AudioConfig()
    onReleaseCallCount = 0
    record = AudioRecord(engine: engine, inputNode: inputNode, audioConfig: audioConfig) { [weak self] in
      self?.onReleaseCallCount += 1
    }
  }

  override func tearDown() {
    record = nil
    onReleaseCallCount = nil
    audioConfig = nil
    inputNode = nil
    engine = nil
    super.tearDown()
  }

  // MARK: - O - One Case (Happy Path / Idempotency)

  func testStartRecordingStartsEngineAndIsIdempotent() throws {
    XCTAssertEqual(AudioRecord.STATE_INITIALIZED, record.state)
    XCTAssertEqual(AudioRecord.RECORDSTATE_STOPPED, record.recordingState)

    try record.startRecording()
    XCTAssertTrue(engine.startCallCount == 1, "engine.start() should be called once")
    XCTAssertEqual(AudioRecord.RECORDSTATE_RECORDING, record.recordingState)
    XCTAssertEqual(1, inputNode.installTapCallCount, "installTap should be called once")

    // Second call should be idempotent (no extra engine starts or taps)
    try record.startRecording()
    XCTAssertTrue(engine.startCallCount == 1, "engine.start() should not be called again")
    XCTAssertEqual(1, inputNode.installTapCallCount, "installTap should not be called again")
  }

  // MARK: - Z - Zero Cases (Empty/Null/Missing Data)

  func testReadReturnsZeroWhenNoDataAvailable() throws {
    try record.startRecording()
    var buffer = [UInt8](repeating: 0, count: 1024)
    let bytesRead = record.read(&buffer, offset: 0, size: buffer.count)
    XCTAssertEqual(0, bytesRead, "read should return 0 when no data is available")
  }

  func testReadReturnsNegativeWhenNotRecording() {
    var buffer = [UInt8](repeating: 0, count: 256)
    let bytesRead = record.read(&buffer, offset: 0, size: buffer.count)
    XCTAssertLessThan(bytesRead, 0, "read should return negative when not recording")
  }

  func testReadReturnsNegativeAfterRelease() throws {
    try record.startRecording()
    record.release()

    var buffer = [UInt8](repeating: 0, count: 256)
    let bytesRead = record.read(&buffer, offset: 0, size: buffer.count)
    XCTAssertLessThan(bytesRead, 0, "read should return negative after release")
  }

  // MARK: - B - Boundary / Data Flow Cases

  func testTapBuffersAreQueuedAndReadable() throws {
    try record.startRecording()

    // Prepare a PCM buffer matching input format (hardware format from inputNode)
    let format = inputNode.inputFormat(forBus: 0)
    let frames: AVAudioFrameCount = 160
    guard let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else {
      XCTFail("Failed to create AVAudioPCMBuffer")
      return
    }
    pcm.frameLength = frames
    if let channelData = pcm.int16ChannelData {
      for i in 0..<Int(frames) {
        channelData.pointee[i] = Int16(i % Int(Int16.max))
      }
    }

    // Simulate tap delivering data twice
    inputNode.triggerTap(buffer: pcm)
    inputNode.triggerTap(buffer: pcm)

    var out = [UInt8](repeating: 0, count: 4096)

    // First read should return > 0
    let r1 = record.read(&out, offset: 0, size: out.count)
    XCTAssertGreaterThan(r1, 0, "First read should return bytes > 0")

    // Second read should return > 0
    let r2 = record.read(&out, offset: 0, size: out.count)
    XCTAssertGreaterThan(r2, 0, "Second read should return bytes > 0")

    // Third read should return 0 (no more data)
    let r3 = record.read(&out, offset: 0, size: out.count)
    XCTAssertEqual(0, r3, "Subsequent read should return 0 when queue is empty")
  }

  func testStopClearsQueueAndStopsEngineIdempotently() throws {
    try record.startRecording()

    // Enqueue one buffer via tap
    let format = inputNode.inputFormat(forBus: 0)
    let frames: AVAudioFrameCount = 160
    let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)!
    pcm.frameLength = frames
    if let channelData = pcm.int16ChannelData {
      for i in 0..<Int(frames) { channelData.pointee[i] = Int16(i) }
    }
    inputNode.triggerTap(buffer: pcm)

    // Stop should clear queue, remove tap and stop engine
    // Note: startRecording pre-cleans the tap (removeTap) before installing its own,
    // so the total count after stop is 2.
    record.stop()
    XCTAssertEqual(AudioRecord.RECORDSTATE_STOPPED, record.recordingState)
    XCTAssertEqual(2, inputNode.removeTapCallCount, "removeTap should be called by start pre-clean and stop")
    XCTAssertEqual(1, engine.stopCallCount, "engine.stop should be called once")

    // Further reads should return negative (not recording)
    var out = [UInt8](repeating: 0, count: 1024)
    let r = record.read(&out, offset: 0, size: out.count)
    XCTAssertLessThan(r, 0, "read should return negative when stopped")

    // Idempotent stop
    record.stop()
    XCTAssertEqual(2, inputNode.removeTapCallCount, "removeTap should not be called again")
    XCTAssertEqual(1, engine.stopCallCount, "stop should not be called again when already stopped")
  }

  func testReleaseTransitionsStateAndIsIdempotent() throws {
    try record.startRecording()

    record.release()
    XCTAssertEqual(AudioRecord.STATE_UNINITIALIZED, record.state)
    XCTAssertEqual(1, onReleaseCallCount, "onRelease should be invoked once")

    // Subsequent calls idempotent
    record.release()
    XCTAssertEqual(1, onReleaseCallCount, "onRelease should not be invoked again")
  }

  func testQueueMaxSizeDropsOldest() throws {
    try record.startRecording()

    let format = inputNode.inputFormat(forBus: 0)
    let frames: AVAudioFrameCount = 160
    guard let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { return }
    pcm.frameLength = frames
    if let channelData = pcm.int16ChannelData {
      for i in 0..<Int(frames) { channelData.pointee[i] = Int16(1) }
    }

    // Push more than maxQueueSize (10)
    for _ in 0..<12 {
      inputNode.triggerTap(buffer: pcm)
    }

    var totalReadsWithData = 0
    var tmp = [UInt8](repeating: 0, count: 4096)
    while true {
      let n = record.read(&tmp, offset: 0, size: tmp.count)
      if n > 0 { totalReadsWithData += 1 } else { break }
    }

    XCTAssertEqual(10, totalReadsWithData, "Should only retain up to maxQueueSize buffers")
  }
}
