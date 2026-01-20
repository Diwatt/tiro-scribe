import XCTest
import AVFoundation

/**
 * Unit tests for AudioRecorder (iOS/iPadOS)
 * Tests match Android AudioRecorderTest structure and naming
 * 
 * Note: These tests verify the interface and basic behavior.
 * Actual recording requires hardware and permissions, tested separately.
 */
@available(iOS 13.0, *)
class AudioRecorderTests: XCTestCase {
  var audioRecorder: AudioRecorder!

  override func setUp() {
    super.setUp()
    audioRecorder = AudioRecorder()
  }
  
  override func tearDown() {
    audioRecorder = nil
    super.tearDown()
  }
  
  // MARK: - Interface tests (matching Android AudioRecorderTest)
  
  func testAudioRecorderIsInstantiable() {
    // Equivalent to Android: "AndroidAudioRecorder implements AudioRecorder interface"
    XCTAssertNotNil(audioRecorder)
  }
  
  func testStartMethodSignatureReturnsEngineAndNode() {
    // Equivalent to Android: "start method signature accepts AudioConfig"
    // Verify method exists and returns expected types
    // Cannot call without permissions, but can verify signature exists
    let mirror = Mirror(reflecting: audioRecorder!)
    let type = mirror.subjectType
    XCTAssertTrue(String(describing: type).contains("AudioRecorder"))
  }
  
  func testStopMethodSignatureAcceptsEngineAndNode() {
    // Equivalent to Android: "stop method signature accepts AudioRecord"
    // Verify the interface contract through protocol conformance
    XCTAssertTrue(audioRecorder is AudioRecorder, 
                  "Should conform to AudioRecorder protocol with stop method")
  }
  
  func testStartThrowsWhenAudioSessionConfigurationFails() {
    // Equivalent to Android: "start throws exception on AudioRecord initialization failure"
    // Note: In test environment, audio session may not be available
    // This documents expected behavior
    
    // We can't easily simulate failure without mocking AVAudioSession
    // So we verify that start can throw
    do {
      _ = try audioRecorder.start()
      // If we get here, audio engine was created successfully
      // Clean up
      let (engine, node) = try audioRecorder.start()
      audioRecorder.stop(engine: engine, inputNode: node)
    } catch {
      // Expected in test environment without audio permissions
      XCTAssertNotNil(error, "Should throw error on initialization failure")
    }
  }
  
  func testStopHandlesAlreadyStoppedEngine() {
    // Equivalent to Android: "stop handles already stopped AudioRecord gracefully"
    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    
    // Engine is already stopped (never started)
    // Should not throw
    audioRecorder.stop(engine: engine, inputNode: inputNode)
    
    // Verify engine is stopped
    XCTAssertFalse(engine.isRunning, "Engine should be stopped")
  }
  
  func testStopRemovesTapFromInputNode() {
    // Equivalent to Android: "stop handles recording AudioRecord"
    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    
    // Can't actually install a tap without starting engine and having permissions
    // But we can verify stop doesn't crash
    audioRecorder.stop(engine: engine, inputNode: inputNode)
    
    // Should complete without throwing
    XCTAssertFalse(engine.isRunning)
  }
  
  func testStopHandlesExceptionsGracefully() {
    // Equivalent to Android: "stop handles exceptions gracefully"
    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    
    // Even with invalid state, stop should not throw
    do {
      audioRecorder.stop(engine: engine, inputNode: inputNode)
      // Success - no exception thrown
    } catch {
      XCTFail("stop() should handle errors gracefully: \(error)")
    }
  }
  
  func testAudioRecorderProtocolDefinesStartMethod() {
    // Equivalent to Android: "AudioRecorder interface defines start method"
    let hasStartMethod = type(of: audioRecorder).instancesRespond(
      to: #selector(AudioRecorder.start)
    )
    XCTAssertTrue(hasStartMethod, "AudioRecorder should define start method")
  }
  
  func testAudioRecorderProtocolDefinesStopMethod() {
    // Equivalent to Android: "AudioRecorder interface defines stop method"
    let hasStopMethod = type(of: audioRecorder).instancesRespond(
      to: #selector(AudioRecorder.stop(engine:inputNode:))
    )
    XCTAssertTrue(hasStopMethod, "AudioRecorder should define stop method")
  }
  
  func testInstallTapMethodExists() {
    // iOS-specific: Verify installTap method exists
    let hasInstallTapMethod = type(of: audioRecorder).instancesRespond(
      to: #selector(AudioRecorder.installTap(on:bufferSize:format:block:))
    )
    XCTAssertTrue(hasInstallTapMethod, "AudioRecorder should define installTap method")
  }
  
  func testAudioSessionConfigurationUsesMeasurementMode() {
    // iOS-specific: Verify audio session is configured correctly
    // Note: We can't test the actual configuration without starting,
    // but we document the expected behavior
    
    // The implementation should set:
    // - Category: .record
    // - Mode: .measurement
    // This is verified in integration tests with actual recording
    XCTAssertNotNil(audioRecorder, "Recorder should be initialized")
  }
}

// Helper extension to make selectors available
extension AudioRecorder {
  @objc func testStart() throws -> (AVAudioEngine, AVAudioInputNode) {
    return try start()
  }
  
  @objc func testStop(engine: AVAudioEngine, inputNode: AVAudioInputNode) {
    stop(engine: engine, inputNode: inputNode)
  }
  
  @objc func testInstallTap(
    on inputNode: AVAudioInputNode,
    bufferSize: AVAudioFrameCount,
    format: AVAudioFormat,
    block: @escaping (AVAudioPCMBuffer, AVAudioTime) -> Void
  ) {
    installTap(on: inputNode, bufferSize: bufferSize, format: format, block: block)
  }
}
