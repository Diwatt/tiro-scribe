package expo.modules.securerecorder

/**
 * Recording limit registry for Android
 * 
 * Maintains a collection of recording limits (duration and file size) to ensure
 * streaming decryption fits in memory. Provides access to all configured limits.
 * 
 * ANDROID SPECIFICITY:
 * - Uses List<Limit>
 * - Direct instantiation (Limit.Duration(...), Limit.FileSize(...))
 * 
 * SECURITY: Recording limits to ensure streaming decryption fits in memory
 * - Max duration: 4 hours (configurable)
 * - Max file size: 500MB (derived from duration at 16kHz mono 16-bit)
 */
class LimitRegistry {
  // Private properties
  private val limits = listOf(
    Limit.Duration(Limit.Duration.DEFAULT_MS),
    Limit.FileSize(Limit.FileSize.DEFAULT_BYTES)
  )
  
  // Internal methods
  internal fun getLimits(): List<Limit> {
    return limits
  }
}
