package expo.modules.securerecorder

/**
 * Base exception class for SecureRecorder errors
 */
sealed class SecureRecorderException(message: String, cause: Throwable? = null) : Exception(message, cause) {
  class RecordingInProgressException : SecureRecorderException("Recording already in progress")
  class PermissionDeniedException : SecureRecorderException("Microphone permission not granted")
  class NoRecordingException : SecureRecorderException("No recording in progress")
  class InitializationException(message: String, cause: Throwable? = null) : SecureRecorderException(message, cause)
  class KeyStoreException(message: String, cause: Throwable? = null) : SecureRecorderException(message, cause)
}
