package expo.modules.securerecorder

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build

/**
 * Audio recorder interface
 */
interface AudioRecorder {
  fun start(config: AudioConfig): AudioRecord
  fun stop(record: AudioRecord)
}

/**
 * Android AudioRecord implementation
 */
class AndroidAudioRecorder : AudioRecorder {
  override fun start(config: AudioConfig): AudioRecord {
    val audioRecord = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      AudioRecord.Builder()
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
    } else {
      @Suppress("DEPRECATION")
      AudioRecord(
        MediaRecorder.AudioSource.MIC,
        config.sampleRate,
        config.channelConfig,
        config.audioFormat,
        config.bufferSize
      )
    }

    if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
      throw SecureRecorderException.InitializationException("AudioRecord initialization failed")
    }

    return audioRecord
  }

  override fun stop(record: AudioRecord) {
    try {
      if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
        record.stop()
      }
      record.release()
    } catch (e: Exception) {
      // Log but don't throw - cleanup should be best-effort
    }
  }
}
