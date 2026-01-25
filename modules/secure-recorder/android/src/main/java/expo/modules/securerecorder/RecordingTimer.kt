package expo.modules.securerecorder

/**
 * Recording timer for Android
 * 
 * Thread-safe timer for recording sessions. Tracks active state and
 * elapsed time using @Volatile synchronization. Returns elapsed time in milliseconds.
 * 
 * ANDROID SPECIFICITY:
 * - Uses @Volatile for thread safety
 * - Simple implementation (single-threaded coroutine context)
 * - getElapsedTime() returns milliseconds (Long)
 * - Returns 0 if not active
 */
class RecordingTimer : RecordingTimerInterface {
  @Volatile
  private var _isActive: Boolean = false
  private var startTime: Long = 0
  
  override val isActive: Boolean
    get() = _isActive
  
  override fun activate() {
    _isActive = true
    startTime = System.currentTimeMillis()
  }
  
  override fun deactivate() {
    _isActive = false
    startTime = 0
  }
  
  override fun getElapsedTime(): Long {
    if (!_isActive || startTime == 0L) {
      return 0L
    }
    return System.currentTimeMillis() - startTime
  }
  
  override fun getStartTime(): Long {
    return startTime
  }
}
