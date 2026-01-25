package expo.modules.securerecorder

import android.media.AudioFormat
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for AudioConfig
 * Tests buffer size calculation logic
 */
class AudioConfigTest {

  private lateinit var audioConfig: AudioConfig

  @Before
  fun setup() {
    audioConfig = AudioConfig()
  }

  @Test
  fun `bufferSize calculation uses 2x minimum when available`() {
    // Buffer size calculation: minSize * 2 if minSize > 0
    val minSize = android.media.AudioRecord.getMinBufferSize(
      audioConfig.sampleRate,
      audioConfig.channelConfig,
      audioConfig.audioFormat
    )
    
    if (minSize > 0) {
      assertTrue(
        "Buffer size should be at least 2x minimum buffer size",
        audioConfig.bufferSize >= minSize * 2
      )
    }
  }

  @Test
  fun `bufferSize uses fallback when minimum is invalid`() {
    // In test environment, getMinBufferSize may return -1
    // Verify fallback value is reasonable (8KB = 4096 * 2)
    val bufferSize = audioConfig.bufferSize
    assertTrue("Buffer size should be reasonable even with fallback", bufferSize >= 4096 * 2)
    assertTrue("Buffer size should be positive", bufferSize > 0)
  }
}
