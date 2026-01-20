package expo.modules.securerecorder

/**
 * Reason why recording was stopped for Android
 * 
 * Represents the reason a recording session was stopped. Provides conversion to/from
 * JavaScript string format for Expo module communication.
 * 
 * ANDROID SPECIFICITY:
 * - Kotlin enum class
 * - UPPER_SNAKE_CASE naming (DURATION_LIMIT, FILE_SIZE_LIMIT, USER_STOPPED, ERROR)
 */
enum class StopReason {
  DURATION_LIMIT,
  FILE_SIZE_LIMIT,
  USER_STOPPED,
  ERROR;
  
  /**
   * Convert to string for JavaScript/TypeScript compatibility
   */
  internal fun toJsString(): String {
    return when (this) {
      DURATION_LIMIT -> "duration_limit"
      FILE_SIZE_LIMIT -> "file_size_limit"
      USER_STOPPED -> "user_stopped"
      ERROR -> "error"
    }
  }
  
  companion object {
    /**
     * Parse from JavaScript string (for backward compatibility)
     */
    internal fun fromJsString(value: String): StopReason {
      return when (value) {
        "duration_limit" -> DURATION_LIMIT
        "file_size_limit" -> FILE_SIZE_LIMIT
        "user_stopped" -> USER_STOPPED
        "error" -> ERROR
        else -> ERROR // Default to ERROR for unknown values
      }
    }
  }
}
