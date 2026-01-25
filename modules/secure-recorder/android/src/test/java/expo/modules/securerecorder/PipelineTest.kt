package expo.modules.securerecorder

import android.media.AudioRecord
import io.mockk.*
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File

/**
 * Unit tests for Pipeline (Android)
 * Tests verify Pipeline logic only - all dependencies are mocked
 * Each conditional branch has at least one test
 */
class PipelineTest {

  private lateinit var mockAudioRecord: AudioRecord
  private lateinit var mockEncryptionStream: EncryptionStreamInterface
  private lateinit var mockAudioConfig: AudioConfig
  private lateinit var outputFile: File
  private lateinit var mockLimiter: LimitRegistryInterface
  private lateinit var mockRecordingTimer: RecordingTimerInterface
  private var limitReachedReason: StopReason? = null
  private var errorMessage: String? = null

  @Before
  fun setup() {
    mockAudioRecord = mockk(relaxed = true)
    mockEncryptionStream = mockk(relaxed = true)
    mockAudioConfig = mockk(relaxed = true) {
      every { bufferSize } returns 1024
    }
    
    val tempDir = System.getProperty("java.io.tmpdir")
    outputFile = File(tempDir, "test_pipeline_${System.currentTimeMillis()}.dat")
    outputFile.createNewFile()
    
    mockLimiter = mockk(relaxed = true)
    mockRecordingTimer = mockk(relaxed = true) {
      every { isActive } returns true
      every { getElapsedTime() } returns 100L
    }
  }

  @After
  fun tearDown() {
    clearAllMocks()
    if (outputFile.exists()) {
      outputFile.delete()
    }
  }

  // MARK: - Branch 1: Loop continues while isActive && recordingTimer.isActive

  @Test
  fun `process stops when recordingTimer becomes inactive`() = runBlocking {
    every { mockRecordingTimer.isActive } returnsMany listOf(true, false) // Becomes inactive
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    
    pipeline.process()
    
    // Verify getLimits was called (loop started)
    verify(atLeast = 1) { mockLimiter.getLimits() }
    // Verify process exited cleanly (timer became inactive)
    verify(exactly = 2) { mockRecordingTimer.isActive } // Called twice: once true, once false
  }

  @Test
  fun `process continues while timer is active`() = runBlocking {
    every { mockRecordingTimer.isActive } returns true
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify loop ran (getLimits was called multiple times)
    verify(atLeast = 1) { mockLimiter.getLimits() }
    verify(atLeast = 1) { mockRecordingTimer.isActive }
  }

  // MARK: - Branch 2: Duration limit exceeded

  @Test
  fun `process stops when duration limit is exceeded`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(
      Limit.Duration(500L) // Very short limit
    )
    every { mockRecordingTimer.getElapsedTime() } returns 1000L // Exceeds limit
    every { mockRecordingTimer.isActive } returns true
    
    val pipeline = createPipeline()
    
    pipeline.process()
    
    // Verify limit check was performed
    verify(exactly = 1) { mockLimiter.getLimits() }
    verify(exactly = 1) { mockRecordingTimer.getElapsedTime() }
    
    // Verify onLimitReached was called
    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
    
    // Verify read was NOT called (early return)
    verify(exactly = 0) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
  }

  // MARK: - Branch 3: Duration limit not exceeded

  @Test
  fun `process continues when duration limit not exceeded`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(
      Limit.Duration(500L)
    )
    every { mockRecordingTimer.getElapsedTime() } returns 100L // Within limit
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify limit check was performed
    verify(atLeast = 1) { mockLimiter.getLimits() }
    verify(atLeast = 1) { mockRecordingTimer.getElapsedTime() }
    
    // Verify processing continued (read was called)
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
  }

  // MARK: - Branch 4: File size limit exceeded

  @Test
  fun `process stops when file size limit is exceeded`() = runBlocking {
    // Set file size to exceed limit
    outputFile.writeBytes(ByteArray(1024 * 1024)) // 1MB
    
    every { mockLimiter.getLimits() } returns listOf(
      Limit.FileSize(500 * 1024L) // 500KB limit
    )
    every { mockRecordingTimer.getElapsedTime() } returns 100L
    every { mockRecordingTimer.isActive } returns true
    
    val pipeline = createPipeline()
    
    pipeline.process()
    
    // Verify limit check was performed
    verify(exactly = 1) { mockLimiter.getLimits() }
    
    // Verify onLimitReached was called
    assertEquals(StopReason.FILE_SIZE_LIMIT, limitReachedReason)
    
    // Verify read was NOT called (early return)
    verify(exactly = 0) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
  }

  // MARK: - Branch 5: File size limit not exceeded

  @Test
  fun `process continues when file size limit not exceeded`() = runBlocking {
    // Set small file size
    outputFile.writeBytes(ByteArray(100 * 1024)) // 100KB
    
    every { mockLimiter.getLimits() } returns listOf(
      Limit.FileSize(500 * 1024L) // 500KB limit - not exceeded
    )
    every { mockRecordingTimer.getElapsedTime() } returns 100L
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify processing continued (read was called)
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
  }

  // MARK: - Branch 6: AudioRecord read returns > 0 (success)

  @Test
  fun `process reads from AudioRecord and writes to EncryptionStream`() = runBlocking {
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify read was called
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
    
    // Verify write was called with the data
    verify(atLeast = 1) { mockEncryptionStream.write(any<ByteArray>()) }
  }

  // MARK: - Branch 7: AudioRecord read returns < 0 (error)

  @Test
  fun `process calls onError when AudioRecord read fails`() = runBlocking {
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns -1 // Error code
    every { mockRecordingTimer.isActive } returns true
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    
    val pipeline = createPipeline()
    
    pipeline.process()
    
    // Verify onError was called
    assertNotNull("onError should be called", errorMessage)
    assertTrue("Error message should mention AudioRecord", 
               errorMessage?.contains("AudioRecord") == true)
    
    // Verify read was called
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) }
    
    // Verify write was NOT called (error occurred)
    verify(exactly = 0) { mockEncryptionStream.write(any<ByteArray>()) }
  }

  // MARK: - Branch 8: AudioRecord read returns 0 (no data)

  @Test
  fun `process continues when AudioRecord read returns zero`() = runBlocking {
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 0 // No data
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify read was called
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
    
    // Verify write was NOT called (no data to write)
    verify(exactly = 0) { mockEncryptionStream.write(any<ByteArray>()) }
    
    // Verify no error occurred
    assertNull("Should not have errors", errorMessage)
  }

  // MARK: - Branch 9: Exception in process loop

  @Test
  fun `process handles exceptions gracefully`() = runBlocking {
    every { mockRecordingTimer.isActive } returns true
    every { mockLimiter.getLimits() } throws RuntimeException("Test exception")
    
    val pipeline = createPipeline()
    
    pipeline.process()
    
    // Verify onError was called
    assertNotNull("onError should be called on exception", errorMessage)
    assertTrue("Error message should mention exception", 
               errorMessage?.contains("Exception") == true)
  }

  // MARK: - Branch 10: isLimitExceeded returns false (limit not exceeded)

  @Test
  fun `process continues when limit not exceeded`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(
      Limit.Duration(500L)
    )
    every { mockRecordingTimer.getElapsedTime() } returns 100L // Not exceeded
    every { mockRecordingTimer.isActive } returns true
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = createPipeline()
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    scope.cancel()
    
    // Verify onLimitReached was NOT called
    assertNull("onLimitReached should not be called", limitReachedReason)
    
    // Verify processing continued
    verify(atLeast = 1) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
  }

  // MARK: - Helper Methods

  private fun createPipeline(): Pipeline {
    return Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      recordingTimer = mockRecordingTimer,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
  }
}
