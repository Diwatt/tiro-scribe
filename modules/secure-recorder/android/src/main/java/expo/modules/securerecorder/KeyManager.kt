package expo.modules.securerecorder

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Key management for encryption key operations on Android
 * 
 * Manages encryption keys stored in AndroidKeyStore. Generates new keys or retrieves
 * existing ones. Keys are accessible after first device unlock, crucial for background processing.
 * 
 * ANDROID SPECIFICITY:
 * - Uses AndroidKeyStore (hardware-backed when available on supported devices)
 * - Key stored with setUnlockedDeviceRequired(true) (accessible after first unlock)
 * - Returns SecretKey object for javax.crypto.Cipher compatibility
 * - Uses KeyGenerator for key generation
 */
class KeyManager(private val context: Context) {
  // Internal methods
  internal fun getOrCreateKey(alias: String): SecretKey {
    val keyStore = KeyStore.getInstance("AndroidKeyStore")
    keyStore.load(null)

    // Try to get existing key
    if (keyStore.containsAlias(alias)) {
      val entry = keyStore.getEntry(alias, null) as? KeyStore.SecretKeyEntry
      if (entry != null) {
        return entry.secretKey
      }
    }

    // Generate new key if it doesn't exist
    val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    val keyGenParameterSpec = KeyGenParameterSpec.Builder(
      alias,
      KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
    )
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .setUserAuthenticationRequired(false)
      .setUnlockedDeviceRequired(true)
      .build()

    keyGenerator.init(keyGenParameterSpec)
    return keyGenerator.generateKey()
  }
}
