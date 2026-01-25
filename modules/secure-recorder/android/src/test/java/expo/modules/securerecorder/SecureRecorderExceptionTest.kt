package expo.modules.securerecorder.exception

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for SecureRecorderException and all subclasses
 * Tests exception cause handling and code uniqueness
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
