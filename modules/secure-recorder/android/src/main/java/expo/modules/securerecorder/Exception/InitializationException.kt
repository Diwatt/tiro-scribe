package expo.modules.securerecorder.exception

/**
 * Exception thrown during initialization failures
 * 
 * ISOMORPHIC: Matches iOS SecureRecorderError.initializationFailed
 * - Both: code = "INITIALIZATION_FAILED"
 */
class InitializationException(message: String, cause: Throwable? = null) : 
  SecureRecorderException(
    message = message,
    code = "INITIALIZATION_FAILED",
    cause = cause
  )
