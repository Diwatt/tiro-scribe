package expo.modules.securerecorder

/**
 * Immutable recording state (thread-safe)
 */
data class RecordingState(
  val isRecording: Boolean,
  val sessionId: String?,
  val filePath: String?
) {
  companion object {
    val IDLE = RecordingState(false, null, null)
  }
}
