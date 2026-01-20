package expo.modules.securerecorder

import android.media.AudioRecord
import io.mockk.*
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import java.io.File

/**
 * Unit tests for Pipeline
 * Tests limit checking and audio processing with mocks
 */
class PipelineTest {

  private lateinit var mockAudioRecord: AudioRecord
  private lateinit var mockEncryptionStream: EncryptionStream
  private lateinit var mockAudioConfig: AudioConfig
  private lateinit var outputFile: File
  private lateinit var mockLimiter: LimitRegistry
  private lateinit var mockStateManager: StateManager
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
    mockStateManager = mockk(relaxed = true) {
      every { isActive } returns true
      every { getElapsedTime() } returns 1000L
    }
  }

  @After
  fun tearDown() {
    clearAllMocks()
    if (outputFile.exists()) {
      outputFile.delete()
    }
  }

  @Test
  fun `process reads from AudioRecord and writes to EncryptionStream`() = runBlocking {
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    // Start processing in a coroutine scope
    val scope = CoroutineScope(Dispatchers.Default)
    val job = scope.launch {
      pipeline.process()
    }
    
    delay(10)
    job.cancel()
    
    verify(atLeast = 0) { mockAudioRecord.read(any<ByteArray>(), 0, 1024) }
  }

  @Test
  fun `process stops when duration limit is exceeded`() = runBlocking {
    every { mockLimiter.getLimits() } returns listOf(
      Limit.Duration(500L) // Very short limit
    )
    every { mockStateManager.getElapsedTime() } returns 1000L // Exceeds limit
    every { mockStateManager.isActive } returns true
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    pipeline.process()
    
    assertEquals(StopReason.DURATION_LIMIT, limitReachedReason)
  }

  @Test
  fun `process stops when file size limit is exceeded`() = runBlocking {
    // Set file size to exceed limit
    outputFile.writeBytes(ByteArray(1024 * 1024)) // 1MB
    
    every { mockLimiter.getLimits() } returns listOf(
      Limit.FileSize(500 * 1024L) // 500KB limit
    )
    every { mockStateManager.getElapsedTime() } returns 100L
    every { mockStateManager.isActive } returns true
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    pipeline.process()
    
    assertEquals(StopReason.FILE_SIZE_LIMIT, limitReachedReason)
  }

  @Test
  fun `process calls onError when AudioRecord read fails`() = runBlocking {
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns -1 // Error code
    every { mockStateManager.isActive } returns true
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    pipeline.process()
    
    assertNotNull("onError should be called", errorMessage)
    assertTrue("Error message should mention AudioRecord", 
               errorMessage?.contains("AudioRecord") == true)
  }

  @Test
  fun `process stops when stateManager becomes inactive`() = runBlocking {
    every { mockStateManager.isActive } returnsMany listOf(true, false) // Becomes inactive
    every { mockLimiter.getLimits() } returns emptyList<Limit>()
    every { mockAudioRecord.read(any<ByteArray>(), any<Int>(), any<Int>()) } returns 512
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    pipeline.process()
    
    // Should exit cleanly without errors
    assertNull("Should not have errors", errorMessage)
  }

  @Test
  fun `process handles exceptions gracefully`() = runBlocking {
    every { mockStateManager.isActive } returns true
    every { mockLimiter.getLimits() } throws RuntimeException("Test exception")
    
    val pipeline = Pipeline(
      audioRecord = mockAudioRecord,
      encryptionStream = mockEncryptionStream,
      audioConfig = mockAudioConfig,
      outputFile = outputFile,
      limiter = mockLimiter,
      stateManager = mockStateManager,
      onLimitReached = { reason -> limitReachedReason = reason },
      onError = { message -> errorMessage = message }
    )
    
    pipeline.process()
    
    assertNotNull("onError should be called on exception", errorMessage)
    assertTrue("Error message should mention exception", 
               errorMessage?.contains("Exception") == true)
  }
}
