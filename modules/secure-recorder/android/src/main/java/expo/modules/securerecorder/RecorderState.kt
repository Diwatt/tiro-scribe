package expo.modules.securerecorder

/**
 * Recording state enum for Android
 * 
 * Represents the current state of the recording session. Provides conversion to/from
 * JavaScript string format for Expo module communication.
 * 
 * ISOMORPHIC: Matches iOS RecorderState exactly
 * - Both: inactive, recording, paused, stopped
 * 
 * ANDROID SPECIFICITY:
 * - Kotlin enum class
 * - UPPER_SNAKE_CASE naming (INACTIVE, RECORDING, PAUSED, STOPPED)
 */
enum class RecorderState {
  INACTIVE,
  RECORDING,
  PAUSED,
  STOPPED;
  
  /**
   * Convert to string for JavaScript/TypeScript compatibility
   */
  internal fun toJsString(): String {
    return when (this) {
      INACTIVE -> "inactive"
      RECORDING -> "recording"
      PAUSED -> "paused"
      STOPPED -> "stopped"
    }
  }
  
  companion object {
    /**
     * Parse from JavaScript string
     * 
     * Converts string representation back to RecorderState enum.
     * Used primarily for testing round-trip conversion (toJsString -> fromJsString).
     */
    internal fun fromJsString(value: String): RecorderState {
      return when (value) {
        "inactive" -> INACTIVE
        "recording" -> RECORDING
        "paused" -> PAUSED
        "stopped" -> STOPPED
        else -> INACTIVE // Default to INACTIVE for unknown values
      }
    }
    
    /**
     * Calculate state from isRecording flag, isPaused flag, and filePath
     * Used internally to convert from State data class to RecorderState enum
     */
    internal fun fromState(isRecording: Boolean, isPaused: Boolean = false, filePath: String?): RecorderState {
      return when {
        isRecording -> RECORDING
        isPaused -> PAUSED
        filePath != null -> STOPPED
        else -> INACTIVE
      }
    }
  }
}
