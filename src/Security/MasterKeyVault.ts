/**
 * MasterKeyVault – Manages the lifecycle of the decrypted master key in SecureStore.
 */

import { Container } from '@/Core/Container';
import * as SecureStore from 'expo-secure-store';

export class MasterKeyVault {
    private static readonly KEY_PREFIX = 'scribe_master_';

    public async exists(uuid: string): Promise<boolean> {
        const key = MasterKeyVault.KEY_PREFIX + uuid;
        try {
            const value = await SecureStore.getItemAsync(key);
            return value != null && value.length > 0;
        } catch (_error: unknown) {
            return false;
        }
    }

    public async load(uuid: string): Promise<string> {
        const value = await SecureStore.getItemAsync(MasterKeyVault.KEY_PREFIX + uuid);
        if (value == null || value.length === 0) {
            throw new Error('Master key unavailable. Unlock with password or recovery code.');
        }
        return value;
    }

    public async save(uuid: string, key: string): Promise<void> {
        await SecureStore.setItemAsync(MasterKeyVault.KEY_PREFIX + uuid, key);
    }
}

Container.register(MasterKeyVault, () => new MasterKeyVault());
