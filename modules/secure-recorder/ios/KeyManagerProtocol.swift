import Foundation

/**
 * Protocol for key manager operations (for testability)
 * 
 * Allows mocking KeyManager in tests without requiring real Keychain access
 */
internal protocol KeyManagerProtocol {
  func getOrCreateKey(alias: String) throws -> Data
}

extension KeyManager: KeyManagerProtocol {}
