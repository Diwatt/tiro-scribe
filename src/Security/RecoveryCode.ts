/**
 * RecoveryCode – Vault recovery code format and key derivation.
 * Human-readable canonical form XXXX-XXXX-XXXX. Uses expo-crypto for entropy.
 */

import * as ExpoCrypto from 'expo-crypto';
import QuickCrypto from 'react-native-quick-crypto';
import { Container } from '@/Core/Container';

export class RecoveryCode {
    public static readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    public static readonly CODE_LENGTH = 12;
    public static readonly GROUP_LENGTH = 4;

    private static readonly KEY_LEN = 32;
    private static readonly PBKDF2_ITERATIONS = 100_000;

    /** True when the text carries exactly CODE_LENGTH alphabet characters (case and separators ignored). */
    public static isValidCode(text: string): boolean {
        return RecoveryCode.clean(text).length === RecoveryCode.CODE_LENGTH;
    }

    /** Canonical kit form XXXX-XXXX-XXXX from loose user input. */
    public static canonicalize(text: string): string {
        const cleaned = RecoveryCode.clean(text);
        const groups: string[] = [];
        for (let index = 0; index < cleaned.length; index += RecoveryCode.GROUP_LENGTH) {
            groups.push(cleaned.slice(index, index + RecoveryCode.GROUP_LENGTH));
        }

        return groups.join('-');
    }

    /**
     * Generates a recovery code in one pass using expo-crypto.
     * Uniform character selection (alphabet length is a power of two, no modulo bias).
     */
    public create(): string {
        const bytes = new Uint8Array(RecoveryCode.CODE_LENGTH);
        ExpoCrypto.getRandomValues(bytes);

        const parts: string[] = [];
        for (let index = 0; index < RecoveryCode.CODE_LENGTH; index += RecoveryCode.GROUP_LENGTH) {
            let part = '';
            for (let offset = 0; offset < RecoveryCode.GROUP_LENGTH; offset++) {
                const byte = bytes[index + offset];
                part += RecoveryCode.ALPHABET.charAt(byte % RecoveryCode.ALPHABET.length);
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

    private static clean(text: string): string {
        return [...text.toUpperCase()].filter((character) => RecoveryCode.ALPHABET.includes(character)).join('');
    }
}

Container.register(RecoveryCode, () => new RecoveryCode());
