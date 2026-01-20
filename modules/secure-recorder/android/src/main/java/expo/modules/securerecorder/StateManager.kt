package expo.modules.securerecorder

import android.media.AudioRecord
import java.io.File

/**
 * Manages recording session state for Android
 * 
 * Thread-safe state management for recording sessions. Tracks active state and
 * elapsed time using @Volatile synchronization. Returns elapsed time in milliseconds.
 * 
 * ANDROID SPECIFICITY:
 * - Uses @Volatile for thread safety
 * - Simple implementation (single-threaded coroutine context)
 * - getElapsedTime() returns milliseconds (Long)
 * - Returns 0 if not active
 */
class StateManager {
  // Private properties
  @Volatile
  private var _isActive: Boolean = false
  private var startTime: Long = 0
  
  // Internal properties
  internal val isActive: Boolean
    get() = _isActive
  
  // Internal methods
  internal fun activate() {
    _isActive = true
    startTime = System.currentTimeMillis()
  }
  
  internal fun deactivate() {
    _isActive = false
  }
  
  internal fun getElapsedTime(): Long {
    if (!_isActive || startTime == 0L) {
      return 0L
    }
    return System.currentTimeMillis() - startTime
  }
  
  internal fun getStartTime(): Long {
    return startTime
  }
}
