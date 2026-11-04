package expo.modules.securerecorder

/**
 * Contract between SecureRecorderModule and a recording session (testability seam).
 */
interface SessionInterface {
  val recordingTimer: RecordingTimerInterface

  fun start(keyAlias: String): String

  fun pause(): String

  fun resume(): String

  fun stop(): String

  fun cleanup()

  fun getInfo(): Session.SessionInfo
}
