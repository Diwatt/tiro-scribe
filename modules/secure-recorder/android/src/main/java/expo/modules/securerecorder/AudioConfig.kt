package expo.modules.securerecorder

import android.media.AudioFormat
import android.media.AudioRecord

/**
 * Audio configuration for Android
 * 
 * Defines audio recording parameters: 16kHz sample rate, mono channel, 16-bit PCM format.
 * Calculates buffer size using AudioRecord.getMinBufferSize() for optimal recording setup.
 * 
 * ANDROID SPECIFICITY:
 * - sampleRate = 16000 (Int, required for AudioRecord)
 * - bufferSize calculated via AudioRecord.getMinBufferSize() * 2
 * - Directly uses AudioFormat constants (CHANNEL_IN_MONO, ENCODING_PCM_16BIT)
 * 
 * NOTE: 16kHz is optimal for voice recognition models (Whisper, Sherpa-ONNX)
 */
class AudioConfig {
  internal val sampleRate = 16000
  internal val channelConfig = AudioFormat.CHANNEL_IN_MONO
  internal val audioFormat = AudioFormat.ENCODING_PCM_16BIT
  internal val bufferSize: Int by lazy {
    val minSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    if (minSize > 0) {
      minSize * 2
    } else {
      // Fallback if AudioRecord.getMinBufferSize returns error code (e.g., in test environment)
      4096 * 2 // 8KB default buffer
    }
  }
}
