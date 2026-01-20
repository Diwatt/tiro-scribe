package expo.modules.securerecorder

import android.media.AudioFormat
import android.media.AudioRecord

/**
 * Audio configuration interface
 */
interface AudioConfig {
  val sampleRate: Int
  val channelConfig: Int
  val audioFormat: Int
  val bufferSize: Int
}

/**
 * Default audio configuration implementation
 */
class DefaultAudioConfig : AudioConfig {
  override val sampleRate = 44100
  override val channelConfig = AudioFormat.CHANNEL_IN_MONO
  override val audioFormat = AudioFormat.ENCODING_PCM_16BIT
  override val bufferSize: Int by lazy {
    val minSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    if (minSize > 0) {
      minSize * 2
    } else {
      // Fallback if AudioRecord.getMinBufferSize returns error code (e.g., in test environment)
      4096 * 2 // 8KB default buffer
    }
  }
}
