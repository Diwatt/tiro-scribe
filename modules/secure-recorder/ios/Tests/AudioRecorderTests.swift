import XCTest
import AVFoundation
@testable import SecureRecorder

/**
 * Unit tests for AudioRecorder (iOS/iPadOS)
 * Tests use mocks to verify behavior in isolation
 */
@available(iOS 13.0, *)
class AudioRecorderTests: XCTestCase {
  var audioRecorder: AudioRecorder!

  override func setUp() {
    super.setUp()
    // Use default factories (real implementations) for basic setup
    let audioConfig = AudioConfig()
    audioRecorder = AudioRecorder(audioConfig: audioConfig)
  }
  
  override func tearDown() {
    audioRecorder = nil
    super.tearDown()
  }
  
  // MARK: - Start behavior tests with mocks
  
  func testStartCallsDependencies() throws {
    // Create mocks to verify dependency calls
    let mockAudioSession = MockAudioSession()
    var sessionFactoryCallCount = 0
    var factoryCallCount = 0
    var createdEngine: MockAudioEngine?
    
    // Create recorder with mocked dependencies
    let audioConfig = AudioConfig()
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: {
        sessionFactoryCallCount += 1
        return mockAudioSession
      },
      factory: {
        factoryCallCount += 1
        let engine = MockAudioEngine()
        createdEngine = engine
        return engine
      }
    )
    
    // Call start()
    _ = try audioRecorder.start()
    
    // Verify dependency instances are created
    XCTAssertEqual(1, sessionFactoryCallCount, "Session factory should be called once")
    XCTAssertEqual(1, factoryCallCount, "Factory should be called once")
    
    // Verify dependency methods are called
    XCTAssertEqual(1, mockAudioSession.setCategoryCallCount, "setCategory should be called once")
    XCTAssertEqual(1, mockAudioSession.setActiveCallCount, "setActive should be called once")
    XCTAssertEqual(1, createdEngine?.prepareCallCount ?? 0, "prepare() should be called once")
  }
  
  func testStartThrowsWhenAudioSessionConfigurationFails() {
    // Exception case 1: Audio session configuration fails
    let mockAudioSession = MockAudioSession()
    mockAudioSession.setCategoryShouldThrow = true
    var factoryCallCount = 0
    
    let audioConfig = AudioConfig()
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: { mockAudioSession },
      factory: {
        factoryCallCount += 1
        return MockAudioEngine()
      }
    )
    
    // Should throw
    XCTAssertThrowsError(try audioRecorder.start()) { error in
      if case SecureRecorderError.initializationFailed = error {
        // Expected
      } else {
        XCTFail("Should throw SecureRecorderError.initializationFailed")
      }
    }
    
    // Verify setCategory was called before throwing
    XCTAssertEqual(1, mockAudioSession.setCategoryCallCount, "setCategory should be called before throwing")
    // Verify factory was not called
    XCTAssertEqual(0, factoryCallCount, "Factory should not be called when session configuration fails")
  }
  
  func testStartThrowsWhenSetActiveFails() {
    // Exception case 2: setActive fails (after setCategory succeeds)
    let mockAudioSession = MockAudioSession()
    mockAudioSession.setActiveShouldThrow = true
    var factoryCallCount = 0
    
    let audioConfig = AudioConfig()
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: { mockAudioSession },
      factory: {
        factoryCallCount += 1
        return MockAudioEngine()
      }
    )
    
    // Should throw
    XCTAssertThrowsError(try audioRecorder.start()) { error in
      if case SecureRecorderError.initializationFailed = error {
        // Expected
      } else {
        XCTFail("Should throw SecureRecorderError.initializationFailed")
      }
    }
    
    // Verify setCategory was called (succeeds)
    XCTAssertEqual(1, mockAudioSession.setCategoryCallCount, "setCategory should be called")
    // Verify setActive was called before throwing
    XCTAssertEqual(1, mockAudioSession.setActiveCallCount, "setActive should be called before throwing")
    // Verify factory was not called
    XCTAssertEqual(0, factoryCallCount, "Factory should not be called when setActive fails")
  }
  
  // MARK: - Stop behavior tests with mocks
  
  func testStopCallsDependencies() throws {
    // Test that AudioRecord.stop() and release() are called
    let mockAudioSession = MockAudioSession()
    var sessionFactoryCallCount = 0
    let audioConfig = AudioConfig()
    
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: {
        sessionFactoryCallCount += 1
        return mockAudioSession
      },
      factory: { MockAudioEngine() }
    )
    
    // Create AudioRecord via start()
    let audioRecord = try audioRecorder.start()
    
    // Verify AudioRecord is initialized
    XCTAssertEqual(AudioRecord.STATE_INITIALIZED, audioRecord.state, "AudioRecord should be initialized")
    
    // Call stop()
    audioRecorder.stop(record: audioRecord)
    
    // Verify AudioRecord is released (state becomes UNINITIALIZED)
    XCTAssertEqual(AudioRecord.STATE_UNINITIALIZED, audioRecord.state, "AudioRecord should be released after stop")
    
    // Verify session cleanup was called (via onRelease closure)
    XCTAssertEqual(2, sessionFactoryCallCount, "Session factory should be called for start and cleanup")
  }
  
  func testStopCallsRecordStopWhenRecording() throws {
    // Test "if recording" case: AudioRecord.stop() should be called when recording
    let mockAudioSession = MockAudioSession()
    let audioConfig = AudioConfig()
    
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: { mockAudioSession },
      factory: { MockAudioEngine() }
    )
    
    // Create and start recording
    let audioRecord = try audioRecorder.start()
    try audioRecord.startRecording()
    
    // Verify recording state
    XCTAssertEqual(AudioRecord.RECORDSTATE_RECORDING, audioRecord.recordingState, "AudioRecord should be recording")
    
    // Call stop()
    audioRecorder.stop(record: audioRecord)
    
    // Verify recording stopped
    XCTAssertEqual(AudioRecord.RECORDSTATE_STOPPED, audioRecord.recordingState, "AudioRecord should be stopped after stop()")
    XCTAssertEqual(AudioRecord.STATE_UNINITIALIZED, audioRecord.state, "AudioRecord should be released after stop()")
  }
  
  func testStopSkipsRecordStopWhenNotRecording() throws {
    // Test "if recording" case: AudioRecord.stop() should still work when not recording (idempotent)
    let mockAudioSession = MockAudioSession()
    let audioConfig = AudioConfig()
    
    audioRecorder = AudioRecorder(
      audioConfig: audioConfig,
      sessionFactory: { mockAudioSession },
      factory: { MockAudioEngine() }
    )
    
    // Create AudioRecord but don't start recording
    let audioRecord = try audioRecorder.start()
    
    // Verify not recording
    XCTAssertEqual(AudioRecord.RECORDSTATE_STOPPED, audioRecord.recordingState, "AudioRecord should not be recording")
    
    // Call stop() - should be idempotent
    audioRecorder.stop(record: audioRecord)
    
    // Verify still stopped and released
    XCTAssertEqual(AudioRecord.RECORDSTATE_STOPPED, audioRecord.recordingState, "AudioRecord should still be stopped")
    XCTAssertEqual(AudioRecord.STATE_UNINITIALIZED, audioRecord.state, "AudioRecord should be released after stop()")
  }
}
