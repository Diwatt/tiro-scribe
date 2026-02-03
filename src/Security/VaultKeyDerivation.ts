/**
 * Vault key derivation and recovery code generation for therapist vault (password-based and recovery-code-based keys).
 */

import CryptoJS from 'crypto-js';

export class VaultKeyDerivation {
    private static readonly PBKDF2_ITERATIONS = 10000;
    private static readonly PBKDF2_KEYSIZE = 256 / 32;
    private static readonly RECOVERY_SALT = 'scribe_recovery_v1';
    private static readonly RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private static readonly RECOVERY_PART_LEN = 4;

    public static buildSalt(uuid: string, tag: string): string {
        return `scribe_${tag}_${uuid}`;
    }

    public static deriveKeyFromPassword(password: string, salt: string): CryptoJS.lib.WordArray {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: VaultKeyDerivation.PBKDF2_KEYSIZE,
            iterations: VaultKeyDerivation.PBKDF2_ITERATIONS,
        });
    }

    public static deriveKeyFromRecoveryCode(recoveryCode: string): CryptoJS.lib.WordArray {
        return CryptoJS.PBKDF2(recoveryCode, VaultKeyDerivation.RECOVERY_SALT, {
            keySize: VaultKeyDerivation.PBKDF2_KEYSIZE,
            iterations: VaultKeyDerivation.PBKDF2_ITERATIONS,
        });
    }

    public static generateRecoveryCode(): string {
        const part = (): string => {
            let s = '';
            for (let i = 0; i < VaultKeyDerivation.RECOVERY_PART_LEN; i++) {
                s += VaultKeyDerivation.RECOVERY_CHARS.charAt(
                    Math.floor(Math.random() * VaultKeyDerivation.RECOVERY_CHARS.length),
                );
            }
            return s;
        };
        return [part(), part(), part()].join('-');
    }
}
