package expo.modules.securerecorder

/**
 * Represents a single recording limit for Android
 * 
 * Defines recording limits (duration or file size) to prevent exceeding memory
 * constraints during streaming decryption. Checks if a value exceeds the limit.
 * 
 * ANDROID SPECIFICITY:
 * - Sealed class with data classes (Duration, FileSize)
 * - maxValue is Long
 * - Direct instantiation (Limit.Duration(...), Limit.FileSize(...))
 */
sealed class Limit(internal val maxValue: Long, internal val reason: StopReason) {
  /**
   * Check if the given value exceeds this limit
   */
  internal fun isExceeded(value: Long): Boolean {
    return value >= maxValue
  }
  
  /**
   * Duration limit
   */
  data class Duration(internal val maxValueMs: Long) : Limit(maxValueMs, StopReason.DURATION_LIMIT) {
    companion object {
      internal const val DEFAULT_MS = 4 * 60 * 60 * 1000L // 4 hours
    }
  }
  
  /**
   * File size limit
   */
  data class FileSize(internal val maxSizeBytes: Long) : Limit(maxSizeBytes, StopReason.FILE_SIZE_LIMIT) {
    companion object {
      internal const val DEFAULT_BYTES = 500L * 1024 * 1024 // 500MB
    }
  }
}
