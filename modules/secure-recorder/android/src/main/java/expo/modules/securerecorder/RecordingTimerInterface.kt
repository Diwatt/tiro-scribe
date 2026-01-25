package expo.modules.securerecorder

/**
 * Interface for recording timer operations (for testability)
 * 
 * Allows mocking RecordingTimer in tests without requiring real time tracking
 */
interface RecordingTimerInterface {
  val isActive: Boolean
  fun activate()
  fun deactivate()
  fun getElapsedTime(): Long
  fun getStartTime(): Long
}
