import XCTest
import AVFoundation

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
    audioRecorder = AudioRecorder()
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
    audioRecorder = AudioRecorder(
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
    
    audioRecorder = AudioRecorder(
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
    
    audioRecorder = AudioRecorder(
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
  
  func testStopCallsDependencies() {
    // Test that all dependency methods are called
    let mockInputNode = MockAudioInputNode()
    let mockEngine = MockAudioEngine(isRunning: false)
    let mockAudioSession = MockAudioSession()
    var sessionFactoryCallCount = 0
    
    audioRecorder = AudioRecorder(
      sessionFactory: {
        sessionFactoryCallCount += 1
        return mockAudioSession
      },
      factory: { MockAudioEngine() }
    )
    
    audioRecorder.stop(engine: mockEngine, inputNode: mockInputNode)
    
    // Verify dependency methods are called
    XCTAssertEqual(1, mockInputNode.removeTapCallCount, "removeTap should be called once")
    XCTAssertEqual(1, sessionFactoryCallCount, "Session factory should be called once")
    XCTAssertEqual(1, mockAudioSession.setActiveCallCount, "setActive(false) should be called once")
    XCTAssertEqual(false, mockAudioSession.setActiveActive, "setActive should be called with false")
  }
  
  func testStopCallsEngineStopWhenRunning() {
    // Test "if running" case: engine.stop() should be called when engine is running
    let mockInputNode = MockAudioInputNode()
    let mockEngine = MockAudioEngine(isRunning: true)
    let mockAudioSession = MockAudioSession()
    
    audioRecorder = AudioRecorder(
      sessionFactory: { mockAudioSession },
      factory: { MockAudioEngine() }
    )
    
    audioRecorder.stop(engine: mockEngine, inputNode: mockInputNode)
    
    // Verify engine.stop() is called when running
    XCTAssertEqual(1, mockEngine.stopCallCount, "stop() should be called when engine is running")
  }
  
  func testStopSkipsEngineStopWhenNotRunning() {
    // Test "if running" case: engine.stop() should NOT be called when engine is not running
    let mockInputNode = MockAudioInputNode()
    let mockEngine = MockAudioEngine(isRunning: false)
    let mockAudioSession = MockAudioSession()
    
    audioRecorder = AudioRecorder(
      sessionFactory: { mockAudioSession },
      factory: { MockAudioEngine() }
    )
    
    audioRecorder.stop(engine: mockEngine, inputNode: mockInputNode)
    
    // Verify engine.stop() is NOT called when not running
    XCTAssertEqual(0, mockEngine.stopCallCount, "stop() should not be called when engine is not running")
  }
}

// MARK: - Mock implementations

class MockAudioSession: AudioSessionProtocol {
  var setCategoryCallCount = 0
  var setCategoryCategory: AVAudioSession.Category?
  var setCategoryMode: AVAudioSession.Mode?
  var setCategoryOptions: AVAudioSession.CategoryOptions?
  var setCategoryShouldThrow = false
  
  var setActiveCallCount = 0
  var setActiveActive: Bool?
  var setActiveOptions: AVAudioSession.SetActiveOptions?
  var setActiveShouldThrow = false
  
  func setCategory(_ category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions) throws {
    setCategoryCallCount += 1
    setCategoryCategory = category
    setCategoryMode = mode
    setCategoryOptions = options
    
    if setCategoryShouldThrow {
      throw NSError(domain: "MockAudioSession", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
    }
  }
  
  func setActive(_ active: Bool, options: AVAudioSession.SetActiveOptions) throws {
    setActiveCallCount += 1
    setActiveActive = active
    setActiveOptions = options
    
    if setActiveShouldThrow {
      throw NSError(domain: "MockAudioSession", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
    }
  }
}

class MockAudioEngine: AVAudioEngine {
  private let _isRunning: Bool
  var stopCallCount = 0
  var prepareCallCount = 0
  var stopShouldThrow = false
  var prepareShouldThrow = false
  
  init(isRunning: Bool = false) {
    self._isRunning = isRunning
    super.init()
  }
  
  override var isRunning: Bool {
    return _isRunning
  }
  
  override func prepare() {
    prepareCallCount += 1
    if prepareShouldThrow {
      // Simulate exception
      return
    }
    // Don't call super.prepare() to avoid actual engine operations
  }
  
  override func stop() {
    stopCallCount += 1
    if stopShouldThrow {
      // Simulate exception by not calling super
      return
    }
    // Don't call super.stop() to avoid actual engine operations
  }
}

class MockAudioInputNode: AVAudioInputNode {
  var removeTapCallCount = 0
  var removeTapBus: AVAudioNodeBus?
  
  override func removeTap(onBus bus: AVAudioNodeBus) {
    removeTapCallCount += 1
    removeTapBus = bus
    // Don't call super.removeTap() to avoid actual node operations
  }
}
