import XCTest
import Foundation
@testable import SecureRecorder

/**
 * Unit tests for Pipeline (iOS/iPadOS)
 *
 * Pipeline consumes the AudioRecordProtocol seam: the loop is driven by a scripted
 * MockAudioRecord and a MockRecordingTimer that deactivates once reads are exhausted.
 * Each conditional branch has at least one test.
 */
class PipelineTests: XCTestCase {

  private var mockAudioRecord: MockAudioRecord!
  private var mockEncryptionStream: MockEncryptionStream!
  private var audioConfig: AudioConfig!
  private var outputFile: URL!
  private var mockLimiter: MockLimitRegistry!
  private var mockRecordingTimer: MockRecordingTimer!
  private var limitReachedReason: StopReason?
  private var errorMessage: String?

  override func setUp() {
    super.setUp()

    let tempDir = FileManager.default.temporaryDirectory
    outputFile = tempDir.appendingPathComponent("test_pipeline_\(UUID().uuidString).dat")
    FileManager.default.createFile(atPath: outputFile.path, contents: nil, attributes: nil)

    mockAudioRecord = MockAudioRecord()
    mockEncryptionStream = MockEncryptionStream()
    audioConfig = AudioConfig()
    mockLimiter = MockLimitRegistry()
    mockRecordingTimer = MockRecordingTimer()
    limitReachedReason = nil
    errorMessage = nil
  }

  override func tearDown() {
    if FileManager.default.fileExists(atPath: outputFile.path) {
      try? FileManager.default.removeItem(at: outputFile)
    }
    mockAudioRecord = nil
    mockEncryptionStream = nil
    audioConfig = nil
    outputFile = nil
    mockLimiter = nil
    mockRecordingTimer = nil
    limitReachedReason = nil
    errorMessage = nil
    super.tearDown()
  }

  // MARK: - Branch: timer inactive stops the loop immediately

  func testProcessReturnsImmediatelyWhenTimerIsInactive() {
    mockRecordingTimer.setActive(false)

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(0, mockAudioRecord.readCallCount, "read should not be called when timer is inactive")
    XCTAssertEqual(0, mockLimiter.getLimitsCallCount, "getLimits should not be called when timer is inactive")
    XCTAssertEqual(0, mockRecordingTimer.getElapsedTimeCallCount, "getElapsedTime should not be called when timer is inactive")
    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "write should not be called when timer is inactive")
    XCTAssertNil(errorMessage, "No error should be reported when timer is inactive")
  }

  // MARK: - Branch: duration limit exceeded

  func testProcessStopsWhenDurationLimitIsExceeded() {
    mockRecordingTimer.setActive(true)
    mockRecordingTimer.setElapsedTime(1000)
    mockLimiter.setLimits([.duration(Limit.Duration(maxValue: 500, reason: .durationLimit))])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(1, mockRecordingTimer.getElapsedTimeCallCount, "getElapsedTime should be checked once")
    XCTAssertEqual(.durationLimit, limitReachedReason, "onLimitReached should fire with durationLimit")
    XCTAssertEqual(0, mockAudioRecord.readCallCount, "read should not happen after limit stop")
    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "write should not happen after limit stop")
  }

  // MARK: - Branch: duration limit not exceeded

  func testProcessContinuesWhenDurationLimitIsNotExceeded() {
    mockRecordingTimer.setActive(true)
    mockRecordingTimer.setElapsedTime(100)
    mockLimiter.setLimits([.duration(Limit.Duration(maxValue: 500, reason: .durationLimit))])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(1, mockAudioRecord.readCallCount, "read should happen when duration limit is not exceeded")
    XCTAssertNil(limitReachedReason, "onLimitReached should not fire below the limit")
  }

  // MARK: - Branch: file size limit exceeded

  func testProcessStopsWhenFileSizeLimitIsExceeded() throws {
    let fileHandle = try FileHandle(forWritingTo: outputFile)
    try fileHandle.truncate(atOffset: 1024 * 1024)
    try fileHandle.close()
    mockRecordingTimer.setActive(true)
    mockRecordingTimer.setElapsedTime(100)
    mockLimiter.setLimits([.fileSize(Limit.FileSize(maxValue: 500 * 1024, reason: .fileSizeLimit))])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(.fileSizeLimit, limitReachedReason, "onLimitReached should fire with fileSizeLimit")
    XCTAssertEqual(0, mockAudioRecord.readCallCount, "read should not happen after file size stop")
    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "write should not happen after file size stop")
  }

  // MARK: - Branch: file size limit not exceeded

  func testProcessContinuesWhenFileSizeLimitIsNotExceeded() throws {
    let fileHandle = try FileHandle(forWritingTo: outputFile)
    try fileHandle.truncate(atOffset: 100 * 1024)
    try fileHandle.close()
    mockRecordingTimer.setActive(true)
    mockRecordingTimer.setElapsedTime(100)
    mockLimiter.setLimits([.fileSize(Limit.FileSize(maxValue: 500 * 1024, reason: .fileSizeLimit))])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(1, mockAudioRecord.readCallCount, "read should happen when file size is below the limit")
    XCTAssertNil(limitReachedReason, "onLimitReached should not fire below the limit")
  }

  // MARK: - Branch: file size check fails (missing file)

  func testProcessContinuesWhenFileSizeCheckFails() {
    try? FileManager.default.removeItem(at: outputFile)
    mockRecordingTimer.setActive(true)
    mockRecordingTimer.setElapsedTime(100)
    mockLimiter.setLimits([])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(1, mockAudioRecord.readCallCount, "read should happen even if the file size check fails")
    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "read returned 0, nothing to write")
    XCTAssertNil(errorMessage, "Missing file for size check should not produce an error")
  }

  // MARK: - Branch: bytes read > 0 writes encrypted data

  func testProcessWritesEncryptedDataWhenReadReturnsBytes() {
    mockRecordingTimer.setActive(true)
    mockLimiter.setLimits([])
    let payload = Data(repeating: 0x5A, count: audioConfig.bufferSize)
    mockAudioRecord.readPayload = payload
    mockAudioRecord.readResults = [audioConfig.bufferSize, audioConfig.bufferSize]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(2, mockEncryptionStream.writeCallCount, "Each successful read should produce one write")
    XCTAssertEqual([payload, payload], mockEncryptionStream.writeData, "Written data should match the audio payload")
    XCTAssertNil(errorMessage, "No error expected when writes succeed")
  }

  // MARK: - Branch: bytes read == 0 continues without writing

  func testProcessContinuesWithoutWritingWhenReadReturnsZero() {
    mockRecordingTimer.setActive(true)
    mockLimiter.setLimits([])
    mockAudioRecord.readResults = [0]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "write should not be called when no data is available")
    XCTAssertNil(errorMessage, "Zero bytes read is not an error")
  }

  // MARK: - Branch: bytes read < 0 reports error

  func testProcessReportsErrorWhenReadFails() {
    mockRecordingTimer.setActive(true)
    mockLimiter.setLimits([])
    mockAudioRecord.readResults = [-1]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertEqual(mockAudioRecord.readCallCount, 1, "read should be attempted once")
    XCTAssertNotNil(errorMessage, "onError should fire when read returns a negative value")
    XCTAssertTrue(errorMessage?.contains("AudioRecord read error") == true, "Error message should mention the read failure")
    XCTAssertEqual(0, mockEncryptionStream.writeCallCount, "write should not be called after a read error")
  }

  // MARK: - Branch: encryption write throws

  func testProcessReportsErrorWhenWriteThrows() {
    mockEncryptionStream.shouldThrowOnWrite = true
    mockRecordingTimer.setActive(true)
    mockLimiter.setLimits([])
    let payload = Data(repeating: 0x11, count: 64)
    mockAudioRecord.readPayload = payload
    mockAudioRecord.readResults = [64]
    mockRecordingTimer.isActiveOverride = { [weak self] in self?.mockAudioRecord.readResults.isEmpty == false }

    let pipeline = createPipeline()
    pipeline.process()

    XCTAssertNotNil(errorMessage, "onError should fire when the encryption write throws")
    XCTAssertTrue(errorMessage?.contains("Error encrypting audio data") == true, "Error message should mention encryption failure")
    XCTAssertEqual(1, mockEncryptionStream.writeCallCount, "Loop should stop after the write failure")
  }

  // MARK: - Helpers

  private func createPipeline() -> Pipeline {
    return Pipeline(
      audioRecord: mockAudioRecord,
      encryptionStream: mockEncryptionStream,
      audioConfig: audioConfig,
      outputFile: outputFile,
      limiter: mockLimiter,
      recordingTimer: mockRecordingTimer,
      onLimitReached: { [weak self] reason in
        self?.limitReachedReason = reason
      },
      onError: { [weak self] message in
        self?.errorMessage = message
      }
    )
  }
}
