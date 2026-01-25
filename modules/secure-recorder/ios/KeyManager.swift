import Foundation
import Security

/**
 * Key management for encryption key operations on iOS/iPadOS
 * 
 * Manages encryption keys stored in Keychain. Generates new keys or retrieves existing
 * ones. Keys are accessible after first device unlock, crucial for background processing.
 * 
 * iOS/iPadOS SPECIFICITY:
 * - Uses Keychain (Secure Enclave when available on supported devices)
 * - Key stored with kSecAttrAccessibleAfterFirstUnlock (accessible after first unlock)
 * - Returns Data (raw key bytes) for CryptoKit compatibility
 * - Uses SecRandomCopyBytes for key generation
 */
class KeyManager {
  private let servicePrefix = "expo.modules.securerecorder"
  
  internal func getOrCreateKey(alias: String) throws -> Data {
    // Try to retrieve key from Keychain
    if let existingKey = retrieveKeyFromKeychain(alias: alias) {
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
    try storeKeyInKeychain(alias: alias, key: newKey)
    
    return newKey
  }
  
  private func retrieveKeyFromKeychain(alias: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: servicePrefix,
      kSecAttrAccount as String: alias,
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
  
  private func storeKeyInKeychain(alias: String, key: Data) throws {
    // Delete existing key if present
    let deleteQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: servicePrefix,
      kSecAttrAccount as String: alias
    ]
    SecItemDelete(deleteQuery as CFDictionary)
    
    // Store new key
    let addQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: servicePrefix,
      kSecAttrAccount as String: alias,
      kSecValueData as String: key,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
    ]
    
    let status = SecItemAdd(addQuery as CFDictionary, nil)
    
    guard status == errSecSuccess else {
      throw SecureRecorderError.keychainError("Failed to store key: \(status)")
    }
  }
}
