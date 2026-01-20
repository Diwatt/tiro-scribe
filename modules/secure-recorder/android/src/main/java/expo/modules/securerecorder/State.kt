package expo.modules.securerecorder

/**
 * Immutable recording state (thread-safe)
 */
data class State(
  internal val isRecording: Boolean,
  internal val sessionId: String?,
  internal val filePath: String?
) {
  companion object {
    internal val IDLE = State(false, null, null)
  }
}
