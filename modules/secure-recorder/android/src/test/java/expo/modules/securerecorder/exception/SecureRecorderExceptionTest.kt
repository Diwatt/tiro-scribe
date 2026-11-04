package expo.modules.securerecorder.exception

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for SecureRecorderException and all subclasses.
 * Each exception's code and user-facing message are asserted explicitly.
 */
class SecureRecorderExceptionTest {

  @Test
  fun `InitializationException can have cause`() {
    val cause = RuntimeException("Root cause")
    val exception = InitializationException("Initialization failed", cause)

    assertEquals("INITIALIZATION_FAILED", exception.code)
    assertEquals("Initialization failed", exception.message)
    assertEquals(cause, exception.cause)
  }

  @Test
  fun `KeyStoreException can have cause`() {
    val cause = RuntimeException("Root cause")
    val exception = KeyStoreException("KeyStore error", cause)

    assertEquals("KEYCHAIN_ERROR", exception.code)
    assertEquals("KeyStore error", exception.message)
    assertEquals(cause, exception.cause)
  }

  @Test
  fun `PermissionDeniedException carries the PERMISSION_DENIED code and its message`() {
    val exception = PermissionDeniedException()

    assertEquals("PERMISSION_DENIED", exception.code)
    assertEquals("Microphone permission not granted", exception.message)
  }

  @Test
  fun `NoRecordingException carries the NO_RECORDING_IN_PROGRESS code and its message`() {
    val exception = NoRecordingException()

    assertEquals("NO_RECORDING_IN_PROGRESS", exception.code)
    assertEquals("No recording in progress", exception.message)
  }

  @Test
  fun `RecordingInProgressException carries the RECORDING_IN_PROGRESS code and its message`() {
    val exception = RecordingInProgressException()

    assertEquals("RECORDING_IN_PROGRESS", exception.code)
    assertEquals("Recording already in progress", exception.message)
  }

  @Test
  fun `all exception codes are unique`() {
    val codes = listOf(
      InitializationException("").code,
      PermissionDeniedException().code,
      NoRecordingException().code,
      RecordingInProgressException().code,
      KeyStoreException("").code
    )

    val uniqueCodes = codes.toSet()
    assertEquals("All exception codes should be unique", codes.size, uniqueCodes.size)
  }
}
