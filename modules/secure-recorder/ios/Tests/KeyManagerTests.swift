import XCTest
import Security
@testable import SecureRecorder

/**
 * Unit tests for KeyManager (iOS/iPadOS)
 * Tests match Android KeyManagerTest structure and naming
 */
@available(iOS 13.0, *)
class KeyManagerTests: XCTestCase {
  var keyManager: KeyManager!

  override func setUpWithError() throws {
    try super.setUpWithError()
    keyManager = KeyManager()
    try assertKeychainIsUsable()
  }

  private func assertKeychainIsUsable() throws {
    let probe: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "expo.modules.securerecorder",
      kSecAttrAccount as String: "keychain_availability_probe"
    ]
    let status = SecItemAdd(probe as CFDictionary, nil)
    try XCTSkipUnless(
      status == errSecSuccess || status == errSecDuplicateItem,
      "Keychain unavailable in the unhosted SwiftPM xctest runner (SecItemAdd status \(status)); run these tests from an entitled test host (pod/Xcode target)"
    )
    SecItemDelete(probe as CFDictionary)
  }
  
  override func tearDown() {
    // Clean up any test keys
    let testAliases = ["test_alias", "test_alias_2"]
    for alias in testAliases {
      let deleteQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "expo.modules.securerecorder",
        kSecAttrAccount as String: alias
      ]
      SecItemDelete(deleteQuery as CFDictionary)
    }
    
    keyManager = nil
    super.tearDown()
  }
  
  // MARK: - getOrCreateKey() tests (matching Android KeyManagerTest)
  
  func testGetOrCreateKeyReturnsAData() throws {
    // Equivalent to Android: "getOrCreateKey returns a SecretKey"
    let key = try keyManager.getOrCreateKey(alias: "test_alias")
    XCTAssertEqual(32, key.count, "getOrCreateKey should return raw key bytes")
  }
  
  func testGetOrCreateKeyGenerates256BitKey() throws {
    // Equivalent to Android: "getOrCreateKey generates 256-bit AES key"
    let key = try keyManager.getOrCreateKey(alias: "test_alias")
    XCTAssertEqual(32, key.count, "Key should be 256 bits (32 bytes)")
  }
  
  func testGetOrCreateKeyReturnsSameKeyForSameAlias() throws {
    // Equivalent to Android: "getOrCreateKey returns same key for same alias"
    let key1 = try keyManager.getOrCreateKey(alias: "test_alias")
    let key2 = try keyManager.getOrCreateKey(alias: "test_alias")
    
    XCTAssertEqual(key1, key2, "getOrCreateKey should return the same key for the same alias")
  }
  
  func testGetOrCreateKeyReturnsDifferentKeysForDifferentAliases() throws {
    // Equivalent to Android: "getOrCreateKey returns different keys for different aliases"
    let key1 = try keyManager.getOrCreateKey(alias: "test_alias")
    let key2 = try keyManager.getOrCreateKey(alias: "test_alias_2")
    
    XCTAssertNotEqual(key1, key2, "getOrCreateKey should return different keys for different aliases")
  }
  
  func testGetOrCreateKeyStoresKeyInKeychain() throws {
    // Equivalent to Android: "getOrCreateKey stores key in AndroidKeyStore"
    _ = try keyManager.getOrCreateKey(alias: "test_alias")
    
    // Verify key exists in Keychain
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "expo.modules.securerecorder",
      kSecAttrAccount as String: "test_alias",
      kSecReturnData as String: true
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    XCTAssertEqual(errSecSuccess, status, "Key should be stored in Keychain")
    XCTAssertNotNil(result, "Key should be retrievable from Keychain")
  }
  
  func testKeyManagerIsInstantiable() {
    // Equivalent to Android: "AndroidKeyManager implements KeyManager interface"
    XCTAssertNotNil(keyManager)
  }
  
  func testGetOrCreateKeyCreatesKeyWithCorrectAccessibility() throws {
    // Equivalent to Android: "getOrCreateKey creates key with GCM block mode"
    // iOS equivalent: verify key uses kSecAttrAccessibleAfterFirstUnlock
    _ = try keyManager.getOrCreateKey(alias: "test_alias")
    
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "expo.modules.securerecorder",
      kSecAttrAccount as String: "test_alias",
      kSecReturnAttributes as String: true
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    XCTAssertEqual(errSecSuccess, status, "Should retrieve key attributes")
    if let attributes = result as? [String: Any] {
      let accessibility = attributes[kSecAttrAccessible as String] as? String
      XCTAssertEqual(
        kSecAttrAccessibleAfterFirstUnlock as String,
        accessibility,
        "Key should use kSecAttrAccessibleAfterFirstUnlock"
      )
    }
  }
}
