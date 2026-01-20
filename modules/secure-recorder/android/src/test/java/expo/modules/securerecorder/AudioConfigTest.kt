package expo.modules.securerecorder

import android.media.AudioFormat
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for AudioConfig
 * Tests match iOS AudioConfigTests structure and naming
 */
class AudioConfigTest {

  private lateinit var audioConfig: AudioConfig

  @Before
  fun setup() {
    audioConfig = AudioConfig()
  }

  @Test
  fun `sampleRate returns 16000 Hz`() {
    assertEquals("Sample rate should be 16kHz", 16000, audioConfig.sampleRate)
  }

  @Test
  fun `channelConfig returns mono`() {
    assertEquals(
      "Channel config should be mono",
      AudioFormat.CHANNEL_IN_MONO,
      audioConfig.channelConfig
    )
  }

  @Test
  fun `audioFormat returns PCM 16-bit`() {
    assertEquals(
      "Audio format should be PCM 16-bit",
      AudioFormat.ENCODING_PCM_16BIT,
      audioConfig.audioFormat
    )
  }

  @Test
  fun `bufferSize returns positive value`() {
    assertTrue("Buffer size should be positive", audioConfig.bufferSize > 0)
  }

  @Test
  fun `bufferSize is at least minimum required`() {
    // Buffer should be at least 2x minimum (as per implementation)
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
    // Verify fallback value is reasonable
    val bufferSize = audioConfig.bufferSize
    assertTrue("Buffer size should be reasonable even with fallback", bufferSize >= 4096)
  }

  @Test
  fun `AudioConfig is instantiable`() {
    assertNotNull(audioConfig)
  }

  @Test
  fun `configuration values remain constant`() {
    // Verify values don't change between calls
    val sampleRate1 = audioConfig.sampleRate
    val sampleRate2 = audioConfig.sampleRate
    val channelConfig1 = audioConfig.channelConfig
    val channelConfig2 = audioConfig.channelConfig
    val audioFormat1 = audioConfig.audioFormat
    val audioFormat2 = audioConfig.audioFormat
    
    assertEquals("Sample rate should remain constant", sampleRate1, sampleRate2)
    assertEquals("Channel config should remain constant", channelConfig1, channelConfig2)
    assertEquals("Audio format should remain constant", audioFormat1, audioFormat2)
  }

  @Test
  fun `configuration uses correct audio format`() {
    assertEquals("Sample rate must be 16kHz", 16000, audioConfig.sampleRate)
    assertEquals("Must be mono", AudioFormat.CHANNEL_IN_MONO, audioConfig.channelConfig)
    assertEquals("Must be 16-bit PCM", AudioFormat.ENCODING_PCM_16BIT, audioConfig.audioFormat)
  }
}
