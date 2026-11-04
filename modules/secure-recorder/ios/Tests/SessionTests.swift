import XCTest
import Foundation
@testable import SecureRecorder

/**
 * Unit tests for Session (iOS/iPadOS)
 *
 * Session is exercised with a mocked key store and mocked audio hardware
 * (MockAudioSession + MockAudioEngine) so lifecycle tests are deterministic
 * on the simulator - no real microphone or Keychain access is involved.
 */
class SessionTests: XCTestCase {

  private var mockKeyManager: MockKeyManager!
  private var audioConfig: AudioConfig!
  private var outputFile: URL!
  private var session: Session!

  override func setUp() {
    super.setUp()

    mockKeyManager = MockKeyManager()
    audioConfig = AudioConfig()

    let tempDir = FileManager.default.temporaryDirectory
    outputFile = tempDir.appendingPathComponent("test_session_\(UUID().uuidString).dat")

    session = createSession()
  }

  override func tearDown() {
    session?.cleanup()
    session = nil

    if FileManager.default.fileExists(atPath: outputFile.path) {
      try? FileManager.default.removeItem(at: outputFile)
    }

    mockKeyManager = nil
    audioConfig = nil
    outputFile = nil

    super.tearDown()
  }

  // MARK: - Start

  func testStartReturnsFilePathAndActivatesSession() throws {
    let filePath = try session.start(keyAlias: "test-key-alias")

    XCTAssertEqual(outputFile.path, filePath, "start should return the output file path")
    XCTAssertTrue(FileManager.default.fileExists(atPath: filePath), "Output file should exist after start")
    XCTAssertTrue(session.getInfo().isActive, "Session should be active after start")
    XCTAssertEqual("test-key-alias", mockKeyManager.lastAlias, "Key should be requested with the provided alias")
  }

  func testStartReplacesExistingOutputFileWithEmptyFile() throws {
    try Data(repeating: 0xFF, count: 512).write(to: outputFile)

    _ = try session.start(keyAlias: "test-key-alias")
    defer { _ = try? session.stop() }

    let fileSize = try FileManager.default.attributesOfItem(atPath: outputFile.path)[.size] as? Int
    XCTAssertEqual(0, fileSize, "Fresh start should replace the previous file with an empty one")
  }

  func testStartThrowsWhenKeyManagerFails() {
    mockKeyManager.shouldThrow = true

    XCTAssertThrowsError(try session.start(keyAlias: "test-key-alias")) { error in
      if let recorderError = error as? SecureRecorderError,
         case .keychainError(let message) = recorderError {
        XCTAssertTrue(message.contains("Mock keychain error"), "Error should carry the key manager failure")
      } else {
        XCTFail("Expected SecureRecorderError.keychainError, got \(error)")
      }
    }
    XCTAssertFalse(session.getInfo().isActive, "Session should stay inactive when start fails")
  }

  // MARK: - Pause / Resume / Stop

  func testPauseAfterStartReturnsFilePathAndDeactivatesSession() throws {
    _ = try session.start(keyAlias: "test-key-alias")

    let filePath = try session.pause()

    XCTAssertEqual(outputFile.path, filePath, "pause should return the output file path")
    XCTAssertFalse(session.getInfo().isActive, "Session should be inactive after pause")
  }

  func testResumeAfterPauseRestartsCapture() throws {
    _ = try session.start(keyAlias: "test-key-alias")
    _ = try session.pause()

    let filePath = try session.resume()
    defer { _ = try? session.stop() }

    XCTAssertEqual(outputFile.path, filePath, "resume should return the output file path")
    XCTAssertTrue(session.getInfo().isActive, "Session should be active again after resume")
  }

  func testStopAfterStartReturnsFilePathAndDeactivatesSession() throws {
    _ = try session.start(keyAlias: "test-key-alias")

    let filePath = try session.stop()

    XCTAssertEqual(outputFile.path, filePath, "stop should return the output file path")
    XCTAssertFalse(session.getInfo().isActive, "Session should be inactive after stop")
  }

  func testPauseThrowsWhenNotRecording() {
    XCTAssertThrowsError(try session.pause()) { error in
      if let recorderError = error as? SecureRecorderError,
         case .noRecordingInProgress = recorderError {
        XCTAssertEqual("NO_RECORDING_IN_PROGRESS", recorderError.code)
      } else {
        XCTFail("Expected SecureRecorderError.noRecordingInProgress")
      }
    }
  }

  func testResumeThrowsWhenNeverStarted() {
    XCTAssertThrowsError(try session.resume()) { error in
      if let recorderError = error as? SecureRecorderError,
         case .initializationFailed(let message) = recorderError {
        XCTAssertTrue(message.contains("No encryption stream"), "Should mention missing encryption stream")
      } else {
        XCTFail("Expected SecureRecorderError.initializationFailed")
      }
    }
  }

  // MARK: - Info / Cleanup

  func testGetInfoReturnsCorrectValues() {
    let info = session.getInfo()

    XCTAssertEqual("test-session", info.sessionId, "Session ID should match")
    XCTAssertEqual(outputFile.path, info.filePath, "File path should match")
    XCTAssertFalse(info.isActive, "Session should not be active initially")
  }

  func testSessionCleanupIsIdempotent() {
    session.cleanup()
    session.cleanup()
    session.cleanup()

    XCTAssertFalse(session.getInfo().isActive, "Cleanup should leave the session inactive without crashing")
  }

  // MARK: - Helpers

  private func createSession() -> Session {
    let audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: { MockAudioSession() },
      factory: { MockAudioEngine() }
    )

    return Session(
      sessionId: "test-session",
      outputFile: outputFile,
      keyManager: mockKeyManager,
      audioRecorder: audioRecorder,
      audioConfig: audioConfig
    )
  }
}
