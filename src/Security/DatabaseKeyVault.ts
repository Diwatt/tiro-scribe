/**
 * DatabaseKeyVault – Provides the SQLCipher key of the local database.
 * Generates a random 256-bit key on first launch and persists it in
 * SecureStore (Keychain / Keystore) — i.e. under the same hardware root of
 * trust as the native audio key, as a **separate domain key on purpose**:
 * the Android audio key is a non-exportable KeyStore object, and SQLCipher
 * needs raw key bytes at PRAGMA key time. Deriving this key from the
 * masterKey would add no security (both live in the same SecureStore) while
 * creating a boot chicken-and-egg: the DB must open before any therapist
 * exists. A password-gated DB is a separate product decision (Bunker mode).
 */

import * as SecureStore from 'expo-secure-store';
import { randomBytes } from 'react-native-quick-crypto';
import { Container } from '@/Core/Container';

export class DatabaseKeyVault {
    private static readonly KEY_BYTES = 32;
    private static readonly STORE_KEY = 'scribe_db_cipher';

    private cachedKey: string | null = null;

    /** Raw SQLCipher key, hex-encoded (64 chars) for the PRAGMA key "x'…'" form. */
    public async getKey(): Promise<string> {
        if (this.cachedKey != null) {
            return this.cachedKey;
        }

        const stored = await SecureStore.getItemAsync(DatabaseKeyVault.STORE_KEY);
        if (stored != null && stored.length > 0) {
            this.cachedKey = stored;
            return this.cachedKey;
        }

        this.cachedKey = randomBytes(DatabaseKeyVault.KEY_BYTES).toString('hex');
        await SecureStore.setItemAsync(DatabaseKeyVault.STORE_KEY, this.cachedKey);
        return this.cachedKey;
    }
}

Container.register(DatabaseKeyVault, () => new DatabaseKeyVault());
