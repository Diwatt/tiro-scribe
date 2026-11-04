package expo.modules.securerecorder

import java.io.File

/**
 * Creates recording sessions for SecureRecorderModule (testability seam, like AudioRecorder.factory).
 */
fun interface SessionFactory {
  fun create(
    sessionId: String,
    outputFile: File,
    keyManager: KeyManagerInterface,
    audioRecorder: AudioRecorder,
    audioConfig: AudioConfig,
    onLimitReached: (suspend (StopReason, String, String) -> Unit)?
  ): SessionInterface
}
