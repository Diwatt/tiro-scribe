package expo.modules.securerecorder

import android.media.AudioRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements

/**
 * Unit tests for AudioConfig buffer size calculation, run against the real
 * Robolectric audio shadow. The fallback branch (invalid minimum buffer size)
 * is exercised through a custom shadow returning an error code.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AudioConfigTest {

  @Test
  fun `bufferSize is twice the minimum buffer size when the minimum is valid`() {
    val audioConfig = AudioConfig()

    val minSize = AudioRecord.getMinBufferSize(audioConfig.sampleRate, audioConfig.channelConfig, audioConfig.audioFormat)

    assertTrue("Robolectric should report a valid minimum buffer size", minSize > 0)
    assertEquals(minSize * 2, audioConfig.bufferSize)
  }

  @Test
  @Config(shadows = [AudioConfigTest.InvalidMinBufferSizeShadow::class])
  fun `bufferSize falls back to 8192 when the minimum buffer size is invalid`() {
    val audioConfig = AudioConfig()

    assertEquals(8192, audioConfig.bufferSize)
  }

  @Implements(AudioRecord::class)
  class InvalidMinBufferSizeShadow {
    companion object {
      @JvmStatic
      @Implementation
      fun getMinBufferSize(sampleRate: Int, channelConfig: Int, audioFormat: Int): Int = -2
    }
  }
}
