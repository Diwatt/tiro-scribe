package expo.modules.securerecorder

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import expo.modules.securerecorder.exception.InitializationException

/**
 * Audio recorder implementation for Android
 * 
 * Provides audio recording abstraction using AudioRecord API.
 * Creates and manages AudioRecord instances for audio capture.
 * 
 * ANDROID SPECIFICITY:
 * - Uses AudioRecord API (Android audio framework)
 * - start() returns AudioRecord instance
 * - stop() takes AudioRecord parameter
 * - Synchronous operations (no throws in start/stop)
 * - Reads audio in loop via Pipeline.process() (pull-based audio capture)
 * - Throws InitializationException on initialization failure
 */
class AudioRecorder {
  // Internal methods
  internal fun start(config: AudioConfig): AudioRecord {
    val audioRecord = AudioRecord.Builder()
      .setAudioSource(MediaRecorder.AudioSource.MIC)
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(config.audioFormat)
          .setSampleRate(config.sampleRate)
          .setChannelMask(config.channelConfig)
          .build()
      )
      .setBufferSizeInBytes(config.bufferSize)
      .build()

    if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
      throw InitializationException("AudioRecord initialization failed")
    }

    return audioRecord
  }

  internal fun stop(record: AudioRecord) {
    // Stop recording if active
    if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
      try {
        record.stop()
      } catch (e: IllegalStateException) {
        // AudioRecord already stopped or in invalid state
        // Continue to release - best effort cleanup
      }
    }
    
    // Release resources
    // Note: release() is idempotent and safe to call multiple times
    // but can throw IllegalStateException if already released
    try {
      if (record.state != AudioRecord.STATE_UNINITIALIZED) {
        record.release()
      }
    } catch (e: IllegalStateException) {
      // Already released - this is fine, continue
    }
  }
}
