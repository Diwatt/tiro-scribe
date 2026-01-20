package expo.modules.securerecorder.exception

/**
 * Exception thrown during KeyStore operations
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderError.keychainError
 * - Both: code = "KEYCHAIN_ERROR" (Android: KeyStore, iOS: Keychain)
 */
class KeyStoreException(message: String, cause: Throwable? = null) : 
  SecureRecorderException(
    message = message,
    code = "KEYCHAIN_ERROR",
    cause = cause
  )
