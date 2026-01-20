package expo.modules.securerecorder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for PermissionManager
 */
class PermissionManagerTest {

  private lateinit var mockContext: Context
  private lateinit var permissionManager: AndroidPermissionManager

  @Before
  fun setup() {
    mockContext = mockk(relaxed = true)
    permissionManager = AndroidPermissionManager(mockContext)
    mockkStatic(ContextCompat::class)
  }

  @After
  fun tearDown() {
    unmockkStatic(ContextCompat::class)
  }

  @Test
  fun `has returns true when permission is granted`() {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_GRANTED

    assertTrue(permissionManager.has())
  }

  @Test
  fun `has returns false when permission is denied`() {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_DENIED

    assertFalse(permissionManager.has())
  }

  @Test
  fun `has checks correct permission`() {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_GRANTED

    permissionManager.has()

    verify(exactly = 1) {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    }
  }

  @Test
  fun `request delegates to has`() = runTest {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_GRANTED

    val result = permissionManager.request()

    assertTrue(result)
    verify(exactly = 1) {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    }
  }

  @Test
  fun `request returns false when permission is denied`() = runTest {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_DENIED

    val result = permissionManager.request()

    assertFalse(result)
    verify(exactly = 1) {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    }
  }

  @Test
  fun `AndroidPermissionManager implements PermissionManager interface`() {
    assertTrue(permissionManager is PermissionManager)
  }

  @Test
  fun `has and request return consistent results`() = runTest {
    every {
      ContextCompat.checkSelfPermission(mockContext, Manifest.permission.RECORD_AUDIO)
    } returns PackageManager.PERMISSION_GRANTED

    val hasResult = permissionManager.has()
    val requestResult = permissionManager.request()

    assertEquals("has and request should return consistent results", hasResult, requestResult)
  }
}
