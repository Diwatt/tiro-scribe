package expo.modules.securerecorder.exception

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for SecureRecorderException and all subclasses
 * Tests error code and message properties for all exception types
 */
class SecureRecorderExceptionTest {

  @Test
  fun `SecureRecorderException has code and message properties`() {
    val exception = InitializationException("Test message")
    
    assertEquals("INITIALIZATION_FAILED", exception.code)
    assertEquals("Test message", exception.message)
  }

  @Test
  fun `InitializationException has correct code`() {
    val exception = InitializationException("Initialization failed")
    
    assertEquals("INITIALIZATION_FAILED", exception.code)
    assertEquals("Initialization failed", exception.message)
  }

  @Test
  fun `InitializationException can have cause`() {
    val cause = RuntimeException("Root cause")
    val exception = InitializationException("Initialization failed", cause)
    
    assertEquals("INITIALIZATION_FAILED", exception.code)
    assertEquals("Initialization failed", exception.message)
    assertEquals(cause, exception.cause)
  }

  @Test
  fun `PermissionDeniedException has correct code`() {
    val exception = PermissionDeniedException()
    
    assertEquals("PERMISSION_DENIED", exception.code)
    assertNotNull("Should have a message", exception.message)
  }

  @Test
  fun `NoRecordingException has correct code`() {
    val exception = NoRecordingException()
    
    assertEquals("NO_RECORDING_IN_PROGRESS", exception.code)
    assertNotNull("Should have a message", exception.message)
  }

  @Test
  fun `RecordingInProgressException has correct code`() {
    val exception = RecordingInProgressException()
    
    assertEquals("RECORDING_IN_PROGRESS", exception.code)
    assertNotNull("Should have a message", exception.message)
  }

  @Test
  fun `KeyStoreException has correct code`() {
    val exception = KeyStoreException("KeyStore error")
    
    assertEquals("KEYCHAIN_ERROR", exception.code)
    assertEquals("KeyStore error", exception.message)
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

  @Test
  fun `exceptions are instances of SecureRecorderException`() {
    assertTrue("InitializationException should be SecureRecorderException", 
                InitializationException("") is SecureRecorderException)
    assertTrue("PermissionDeniedException should be SecureRecorderException", 
                PermissionDeniedException() is SecureRecorderException)
    assertTrue("NoRecordingException should be SecureRecorderException", 
                NoRecordingException() is SecureRecorderException)
    assertTrue("RecordingInProgressException should be SecureRecorderException", 
                RecordingInProgressException() is SecureRecorderException)
    assertTrue("KeyStoreException should be SecureRecorderException", 
                KeyStoreException("") is SecureRecorderException)
  }
}
