package expo.modules.securerecorder

import android.media.AudioRecord
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/**
 * Unit tests for Pipeline (Android).
 *
 * The loop is bounded deterministically through RecordingTimerInterface.isActive
 * returning a finite sequence, so every test runs to completion without sleeps or
 * real concurrency. All dependencies sit behind interfaces or the AudioRecord boundary.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PipelineTest {

  private lateinit var mockAudioRecord: AudioRecord
  private lateinit var mockEncryptionStream: EncryptionStreamInterface
  private lateinit var audioConfig: AudioConfig
  private lateinit var outputFile: File
  private lateinit var mockLimiter: LimitRegistryInterface
  private lateinit var mockRecordingTimer: RecordingTimerInterface
  private var limitReachedReason: StopReason? = null
  private var errorMessage: String? = null

  @Before
  fun setup() {
    mockAudioRecord = mockk(relaxed = true)
    mockEncryptionStream = mockk(relaxed = true)
    audioConfig = AudioConfig()

    outputFile = File(System.getProperty("java.io.tmpdir"), "test_pipeline_${System.currentTimeMillis()}.dat")

    mockLimiter = mockk {
      every { getLimits() } returns emptyList()
    }
    mockRecordingTimer = mockk {
      every { isActive } returns true
      every { getElapsedTime() } returns 100L
    }
    limitReachedReason = null
    errorMessage = null
  }

  @After
  fun tearDown() {
    if (outputFile.exists()) {
      outputFile.delete()
    }
  }

  @Test
  fun `process reads audio and stops when the timer deactivates`() = runBlocking {
    every { mockRecordingTimer.isActive } returnsMany listOf(true, false)
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512

    createPipeline().process()

    verify(exactly = 1) { mockLimiter.getLimits() }
    verify(exactly = 1) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
    verify(exactly = 1) { mockEncryptionStream.write(any<ByteArray>()) }
  }

  @Test
  fun `process stops and reports DURATION_LIMIT when elapsed time exceeds the duration limit`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(Limit.Duration(500L))
    every { mockRecordingTimer.getElapsedTime() } returns 1000L

    createPipeline().process()

    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
    verify(exactly = 1) { mockLimiter.getLimits() }
    verify(exactly = 1) { mockRecordingTimer.getElapsedTime() }
    verify(exactly = 0) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
  }

  @Test
  fun `process continues when elapsed time is within the duration limit`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(Limit.Duration(500L))
    every { mockRecordingTimer.getElapsedTime() } returns 100L
    every { mockRecordingTimer.isActive } returnsMany listOf(true, true, false)
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512

    createPipeline().process()

    assertNull(limitReachedReason)
    verify(exactly = 2) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
    verify(exactly = 2) { mockEncryptionStream.write(any<ByteArray>()) }
  }

  @Test
  fun `process stops and reports FILE_SIZE_LIMIT when the output file exceeds the size limit`() = runBlocking {
    outputFile.writeBytes(ByteArray(40))
    every { mockLimiter.getLimits() } returns listOf(Limit.FileSize(20L))

    createPipeline().process()

    assertEquals(StopReason.FILE_SIZE_LIMIT, limitReachedReason)
    verify(exactly = 1) { mockLimiter.getLimits() }
    verify(exactly = 0) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
  }

  @Test
  fun `process continues when the output file is below the size limit`() = runBlocking {
    outputFile.writeBytes(ByteArray(10))
    every { mockLimiter.getLimits() } returns listOf(Limit.FileSize(20L))
    every { mockRecordingTimer.isActive } returnsMany listOf(true, true, false)
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512

    createPipeline().process()

    assertNull(limitReachedReason)
    verify(exactly = 2) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
  }

  @Test
  fun `process writes the audio buffer content to the encryption stream`() = runBlocking {
    every { mockRecordingTimer.isActive } returnsMany listOf(true, false)
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    val written = slot<ByteArray>()
    every { mockEncryptionStream.write(capture(written)) } just runs

    createPipeline().process()

    assertEquals(512, written.captured.size)
  }

  @Test
  fun `process reports an error and stops when the audio read fails`() = runBlocking {
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns -1

    createPipeline().process()

    assertEquals("AudioRecord read error: -1", errorMessage)
    verify(exactly = 1) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
    verify(exactly = 0) { mockEncryptionStream.write(any<ByteArray>()) }
  }

  @Test
  fun `process ignores empty reads without writing or reporting errors`() = runBlocking {
    every { mockRecordingTimer.isActive } returnsMany listOf(true, false)
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 0

    createPipeline().process()

    verify(exactly = 1) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
    verify(exactly = 0) { mockEncryptionStream.write(any<ByteArray>()) }
    assertNull(errorMessage)
  }

  @Test
  fun `process reports an error when the pipeline throws`() = runBlocking {
    every { mockRecordingTimer.isActive } returns true
    every { mockLimiter.getLimits() } throws RuntimeException("boom")

    createPipeline().process()

    assertEquals("Exception in recording pipeline: boom", errorMessage)
  }

  private fun createPipeline(): Pipeline {
    return Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = audioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      recordingTimer = mockRecordingTimer,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
  }
}
