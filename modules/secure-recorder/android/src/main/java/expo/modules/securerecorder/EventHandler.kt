package expo.modules.securerecorder

/**
 * Handles recording events for Android
 * 
 * Coordinates limit reached and error handling. Automatically stops recording when
 * limits are exceeded and notifies handlers. Manages error state transitions.
 * 
 * ANDROID SPECIFICITY:
 * - onLimitReached is suspend function (called directly from coroutine context)
 * - onStop is suspend function (no throws)
 * - Assumes stop() succeeds (coroutine context handles errors)
 */
class EventHandler(
  private val sessionId: String,
  private val outputFile: java.io.File,
  private val recordingTimer: RecordingTimer,
  private val onStop: suspend () -> String,
  private val onLimitReached: (suspend (StopReason, String, String) -> Unit)?
) {
  internal suspend fun onLimitReached(reason: StopReason) {
    // Auto-stop recording to finalize the file
    val filePath = onStop()
    
    // Notify handler if provided
    if (onLimitReached != null) {
      onLimitReached(reason, sessionId, filePath)
    }
  }
  
  internal fun onError(message: String) {
    recordingTimer.deactivate()
    // Error is logged, state updated
    // Actual cleanup will be handled by SecureRecorderModule
  }
}
