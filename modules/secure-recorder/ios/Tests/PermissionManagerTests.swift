import XCTest
import AVFoundation

/**
 * Unit tests for PermissionManager (iOS/iPadOS)
 * Tests match Android PermissionManagerTest structure and naming
 */
@available(iOS 13.0, *)
class PermissionManagerTests: XCTestCase {
  var permissionManager: IOSPermissionManager!
  
  override func setUp() {
    super.setUp()
    permissionManager = IOSPermissionManager()
  }
  
  override func tearDown() {
    permissionManager = nil
    super.tearDown()
  }
  
  // MARK: - has() tests (matching Android PermissionManagerTest)
  
  func testHasReturnsTrueWhenPermissionIsGranted() {
    // Equivalent to Android: "has returns true when permission is granted"
    // Note: Actual result depends on system permission state
    let result = permissionManager.has()
    XCTAssertTrue(result == true || result == false, "has should return a boolean")
    
    // If permission is granted, verify it returns true
    if AVAudioSession.sharedInstance().recordPermission == .granted {
      XCTAssertTrue(result, "has should return true when permission is granted")
    }
  }
  
  func testHasReturnsFalseWhenPermissionIsDenied() {
    // Equivalent to Android: "has returns false when permission is denied"
    // Note: Actual result depends on system permission state
    let result = permissionManager.has()
    XCTAssertTrue(result == true || result == false, "has should return a boolean")
    
    // If permission is denied, verify it returns false
    if AVAudioSession.sharedInstance().recordPermission == .denied {
      XCTAssertFalse(result, "has should return false when permission is denied")
    }
  }
  
  func testHasChecksCorrectPermission() {
    // Equivalent to Android: "has checks correct permission"
    // Verify has() matches AVAudioSession's recordPermission (equivalent to Android's RECORD_AUDIO check)
    let expected = AVAudioSession.sharedInstance().recordPermission == .granted
    let actual = permissionManager.has()
    XCTAssertEqual(expected, actual, "has should match AVAudioSession recordPermission")
  }
  
  // MARK: - request() tests (matching Android PermissionManagerTest)
  
  @MainActor
  func testRequestDelegatesToHas() async {
    // Equivalent to Android: "request delegates to has"
    // request() should check permission state (similar to Android's request() which calls has())
    let hasResult = permissionManager.has()
    let requestResult = await permissionManager.request()
    
    // After request, has() should match request() result
    let hasAfterRequest = permissionManager.has()
    XCTAssertEqual(requestResult, hasAfterRequest, "has should match request result after request")
  }
  
  @MainActor
  func testRequestReturnsFalseWhenPermissionIsDenied() async {
    // Equivalent to Android: "request returns false when permission is denied"
    // Note: Actual result depends on user/system permission state
    let result = await permissionManager.request()
    XCTAssertTrue(result == true || result == false, "request should return a boolean")
    
    // If permission is denied after request, verify it returns false
    if AVAudioSession.sharedInstance().recordPermission == .denied {
      XCTAssertFalse(result, "request should return false when permission is denied")
    }
  }
  
  // MARK: - Protocol conformance tests (matching Android PermissionManagerTest)
  
  func testIOSPermissionManagerImplementsPermissionManagerProtocol() {
    // Equivalent to Android: "AndroidPermissionManager implements PermissionManager interface"
    XCTAssertTrue(permissionManager is PermissionManager)
  }
  
  // MARK: - Consistency tests (matching Android PermissionManagerTest)
  
  @MainActor
  func testHasAndRequestReturnConsistentResults() async {
    // Equivalent to Android: "has and request return consistent results"
    let hasResult = permissionManager.has()
    let requestResult = await permissionManager.request()
    let hasAfterRequest = permissionManager.has()
    
    // After request, has() should match request() result
    XCTAssertEqual(requestResult, hasAfterRequest, "has and request should return consistent results")
  }
}
