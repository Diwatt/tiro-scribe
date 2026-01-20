package expo.modules.securerecorder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay

/**
 * Permission management interface
 * Matches iOS PermissionManager protocol for cross-platform consistency
 */
interface PermissionManager {
  fun has(): Boolean
  suspend fun request(): Boolean
}

/**
 * Android permission manager implementation
 * Matches IOSPermissionManager interface for cross-platform consistency
 */
class AndroidPermissionManager(private val context: Context) : PermissionManager {
  override fun has(): Boolean {
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED
  }

  override suspend fun request(): Boolean {
    // Note: In Expo modules, permission requests should be handled via expo-permissions
    // For consistency with iOS async signature, we make this suspend
    // In practice, this would integrate with expo-permissions module
    delay(0) // Yield to allow cancellation
    return has()
  }
}
