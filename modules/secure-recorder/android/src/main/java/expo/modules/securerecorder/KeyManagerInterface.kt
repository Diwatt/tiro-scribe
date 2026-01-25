package expo.modules.securerecorder

import javax.crypto.SecretKey

/**
 * Interface for key manager operations (for testability)
 * 
 * Allows mocking KeyManager in tests without requiring real AndroidKeyStore access
 */
interface KeyManagerInterface {
  fun getOrCreateKey(alias: String): SecretKey
}
