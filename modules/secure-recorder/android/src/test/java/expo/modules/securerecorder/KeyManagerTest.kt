package expo.modules.securerecorder

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * Unit tests for KeyManager.
 *
 * NOTE: Robolectric does not provide a real AndroidKeyStore provider (it requires the
 * native keystore daemon), so the KeyStore/KeyGenerator providers are injected as seams
 * and the key generation spec is asserted against the real framework implementation.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class KeyManagerTest {

  private lateinit var keyStore: KeyStore
  private lateinit var keyGenerator: KeyGenerator
  private lateinit var existingKey: SecretKey
  private lateinit var generatedKey: SecretKey
  private lateinit var keyManager: KeyManager

  @Before
  fun setup() {
    existingKey = newAesKey()
    generatedKey = newAesKey()
    keyStore = mockk(relaxed = true)
    keyGenerator = mockk(relaxed = true)
    keyManager = KeyManager(
      context = mockk(relaxed = true),
      keyStoreProvider = { keyStore },
      keyGeneratorProvider = { keyGenerator }
    )
  }

  @Test
  fun `getOrCreateKey loads the key store before reading aliases`() {
    every { keyStore.containsAlias(any()) } returns false

    keyManager.getOrCreateKey("test_alias")

    verify(exactly = 1) { keyStore.load(null) }
  }

  @Test
  fun `getOrCreateKey returns the existing secret key without generating when the alias exists`() {
    every { keyStore.containsAlias("test_alias") } returns true
    val entry = mockk<KeyStore.SecretKeyEntry> {
      every { secretKey } returns existingKey
    }
    every { keyStore.getEntry("test_alias", null) } returns entry

    val key = keyManager.getOrCreateKey("test_alias")

    assertEquals(existingKey, key)
    verify(exactly = 0) { keyGenerator.generateKey() }
  }

  @Test
  fun `getOrCreateKey generates a new key when the alias does not exist`() {
    every { keyStore.containsAlias("test_alias") } returns false
    every { keyGenerator.generateKey() } returns generatedKey

    val key = keyManager.getOrCreateKey("test_alias")

    assertEquals(generatedKey, key)
  }

  @Test
  fun `getOrCreateKey generates a new key when the stored entry is not a secret key entry`() {
    every { keyStore.containsAlias("test_alias") } returns true
    every { keyStore.getEntry("test_alias", null) } returns mockk<KeyStore.PrivateKeyEntry>()
    every { keyGenerator.generateKey() } returns generatedKey

    val key = keyManager.getOrCreateKey("test_alias")

    assertEquals(generatedKey, key)
  }

  @Test
  fun `getOrCreateKey configures the generated key for 256-bit AES-GCM without user authentication`() {
    every { keyStore.containsAlias("test_alias") } returns false
    val specSlot = slot<KeyGenParameterSpec>()
    every { keyGenerator.init(capture(specSlot)) } just runs
    every { keyGenerator.generateKey() } returns generatedKey

    keyManager.getOrCreateKey("test_alias")

    val spec = specSlot.captured
    assertEquals("test_alias", spec.keystoreAlias)
    assertEquals(256, spec.keySize)
    // NOTE: the android-37.0 SDK jar declares getPurposes() as an Int bitmask
    // (PURPOSE_ENCRYPT | PURPOSE_DECRYPT), unlike the int[] getter of older SDK levels.
    assertEquals(
      KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      spec.purposes
    )
    assertTrue(spec.blockModes.contains(KeyProperties.BLOCK_MODE_GCM))
    assertFalse(spec.isUserAuthenticationRequired)
    assertTrue(spec.isUnlockedDeviceRequired)
  }

  private fun newAesKey(): SecretKey {
    val generator = KeyGenerator.getInstance("AES")
    generator.init(256)
    return generator.generateKey()
  }
}
