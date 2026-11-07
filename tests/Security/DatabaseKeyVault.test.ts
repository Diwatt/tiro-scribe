import * as SecureStore from 'expo-secure-store';
import { DatabaseKeyVault } from '../../src/Security/DatabaseKeyVault';

const mockGetItemAsync = jest.mocked(SecureStore.getItemAsync);
const mockSetItemAsync = jest.mocked(SecureStore.setItemAsync);

const STORE_KEY = 'scribe_db_cipher';
const STORED_KEY = 'a'.repeat(64);

describe('DatabaseKeyVault', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('generates a 256-bit hex key and persists it on first access', async () => {
        mockGetItemAsync.mockResolvedValueOnce(null);
        const vault = new DatabaseKeyVault();

        const key = await vault.getKey();

        expect(key).toMatch(/^[0-9a-f]{64}$/);
        expect(mockSetItemAsync).toHaveBeenCalledWith(STORE_KEY, key);
    });

    it('returns the persisted key without regenerating it', async () => {
        mockGetItemAsync.mockResolvedValueOnce(STORED_KEY);
        const vault = new DatabaseKeyVault();

        const key = await vault.getKey();

        expect(key).toBe(STORED_KEY);
        expect(mockSetItemAsync).not.toHaveBeenCalled();
    });

    it('loads the key from SecureStore only once per instance', async () => {
        mockGetItemAsync.mockResolvedValue(STORED_KEY);
        const vault = new DatabaseKeyVault();

        const first = await vault.getKey();
        const second = await vault.getKey();

        expect(second).toBe(first);
        expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
    });
});
