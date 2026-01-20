import Foundation
import Security

/**
 * Key management protocol for encryption key operations
 */
protocol KeyManager {
  func getOrCreateKey(alias: String) throws -> Data
}

/**
 * iOS Keychain implementation of KeyManager
 */
class KeychainKeyManager: KeyManager {
  private let keychainService: String
  private let keychainKey: String
  
  init(keychainService: String, keychainKey: String) {
    self.keychainService = keychainService
    self.keychainKey = keychainKey
  }
  
  func getOrCreateKey(alias: String) throws -> Data {
    // Try to retrieve key from Keychain
    if let existingKey = retrieveKeyFromKeychain() {
      return existingKey
    }
    
    // Generate new 256-bit (32-byte) key
    var newKey = Data(count: 32)
    let result = newKey.withUnsafeMutableBytes { bytes in
      SecRandomCopyBytes(kSecRandomDefault, 32, bytes.baseAddress!)
    }
    
    guard result == errSecSuccess else {
      throw SecureRecorderError.keychainError("Failed to generate encryption key")
    }
    
    // Store in Keychain with kSecAttrAccessibleAfterFirstUnlock
    try storeKeyInKeychain(key: newKey)
    
    return newKey
  }
  
  private func retrieveKeyFromKeychain() -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainKey,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      kSecReturnData as String: true
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    guard status == errSecSuccess,
          let data = result as? Data else {
      return nil
    }
    
    return data
  }
  
  private func storeKeyInKeychain(key: Data) throws {
    // Delete existing key if present
    let deleteQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainKey
    ]
    SecItemDelete(deleteQuery as CFDictionary)
    
    // Store new key
    let addQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainKey,
      kSecValueData as String: key,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
    ]
    
    let status = SecItemAdd(addQuery as CFDictionary, nil)
    
    guard status == errSecSuccess else {
      throw SecureRecorderError.keychainError("Failed to store key: \(status)")
    }
  }
}
