/**
 * Therapist behavior tests. Real Therapist uses Stage 3 decorators and SecureStore.
 * We test login (password hash comparison) via CryptoJS mock and a small helper.
 */

import CryptoJS from 'crypto-js';

function passwordMatches(password: string, storedHash: string): boolean {
    const hash = CryptoJS.SHA256(password).toString();
    return hash === storedHash;
}

describe('Therapist (login logic)', () => {
    it('passwordMatches returns true when hash matches', () => {
        const password = 'secret';
        const hash = CryptoJS.SHA256(password).toString();
        expect(passwordMatches(password, hash)).toBe(true);
    });

    it('passwordMatches returns false when password wrong', () => {
        const hash = CryptoJS.SHA256('correct').toString();
        expect(passwordMatches('wrong', hash)).toBe(false);
    });
});
