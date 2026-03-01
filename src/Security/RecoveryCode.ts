/**
 * RecoveryCode – Vault recovery code format and key derivation.
 * Human-readable format XXXX-XXXX-XXXX. Uses expo-crypto for entropy.
 */

import * as ExpoCrypto from 'expo-crypto';
import QuickCrypto from 'react-native-quick-crypto';

export class RecoveryCode {
    private static readonly CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private static readonly CHARSET_SIZE = 32;
    private static readonly KEY_LEN = 32;
    private static readonly PBKDF2_ITERATIONS = 100_000;
    private static readonly TOTAL_CHARS = 12;

    /**
     * Generates a recovery code in one pass using expo-crypto.
     * Uniform character selection (no modulo bias).
     */
    public create(): string {
        const bytes = new Uint8Array(RecoveryCode.TOTAL_CHARS);
        ExpoCrypto.getRandomValues(bytes);

        const parts: string[] = [];
        for (let i = 0; i < RecoveryCode.TOTAL_CHARS; i += 4) {
            let part = '';
            for (let j = 0; j < 4; j++) {
                const idx = bytes[i + j]! % RecoveryCode.CHARSET_SIZE;
                part += RecoveryCode.CHARS.charAt(idx);
            }
            parts.push(part);
        }
        return parts.join('-');
    }

    /**
     * Derives a key from the recovery code using PBKDF2 with a unique salt (therapist UUID).
     */
    public keyFromCode(code: string, salt: string): string {
        const derived = QuickCrypto.pbkdf2Sync(
            code,
            salt,
            RecoveryCode.PBKDF2_ITERATIONS,
            RecoveryCode.KEY_LEN,
            'SHA-256',
        );
        return derived.toString('hex');
    }
}
