package expo.modules.securerecorder.exception

/**
 * Base exception class for SecureRecorder errors on Android
 * 
 * Represents errors that can occur during recording operations. Provides error codes
 * and messages that are converted to JavaScript {code, message} objects by Expo framework.
 * 
 * ANDROID SPECIFICITY:
 * - Kotlin sealed class with subclasses (in separate files)
 * - code is constructor parameter
 * - message is constructor parameter
 * 
 * Note: Sealed class with subclasses in separate files (Kotlin 1.5+)
 */
sealed class SecureRecorderException(
  message: String,
  val code: String,
  cause: Throwable? = null
) : Exception(message, cause)
