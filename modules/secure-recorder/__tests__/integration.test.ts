/**
 * Integration test for SecureRecorder module
 *
 * Run with: jest __tests__/integration.test.ts
 *
 * NOTE: This is a smoke test that verifies the module loads correctly.
 * Full integration tests require running on a real device/simulator.
 */

import { SecureRecorder } from '../src/index';

describe('SecureRecorder Integration', () => {
    describe('Module Loading', () => {
        it('exports SecureRecorder class', () => {
            expect(SecureRecorder).toBeDefined();
            expect(typeof SecureRecorder).toBe('function');
        });

        it('can instantiate SecureRecorder', async () => {
            const recorder = new SecureRecorder('test-session');
            expect(recorder).toBeDefined();
            // Wait for _syncState to complete (called in constructor)
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(recorder.state).toBe('inactive');
            expect(recorder.recording).toBe(false);
        });

        it('has static hasPermission method', () => {
            expect(SecureRecorder.hasPermission).toBeDefined();
            expect(typeof SecureRecorder.hasPermission).toBe('function');
        });

        it('has static requestPermission method', () => {
            expect(SecureRecorder.requestPermission).toBeDefined();
            expect(typeof SecureRecorder.requestPermission).toBe('function');
        });

        it('has static stream method', () => {
            expect(SecureRecorder.stream).toBeDefined();
            expect(typeof SecureRecorder.stream).toBe('function');
        });

        it('has static addDecryptionListener method', () => {
            expect(SecureRecorder.addDecryptionListener).toBeDefined();
            expect(typeof SecureRecorder.addDecryptionListener).toBe('function');
        });
    });

    describe('Instance Properties', () => {
        it('has state property', async () => {
            const recorder = new SecureRecorder('test-session');
            // Wait for _syncState to complete
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(recorder.state).toBe('inactive');
            expect(['inactive', 'recording', 'stopped']).toContain(recorder.state);
        });

        it('has recording property', async () => {
            const recorder = new SecureRecorder('test-session');
            // Wait for _syncState to complete
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(typeof recorder.recording).toBe('boolean');
            expect(recorder.recording).toBe(false);
        });

        it('has sessionId property', () => {
            const recorder = new SecureRecorder('test-session-123');
            // sessionId is set synchronously in constructor
            expect(recorder.sessionId).toBe('test-session-123');
        });

        it('has filePath property', async () => {
            const recorder = new SecureRecorder('test-session');
            // Wait for _syncState to complete
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(recorder.filePath).toBeNull();
        });
    });

    describe('Constructor Validation', () => {
        it('rejects empty sessionId', () => {
            expect(() => {
                new SecureRecorder('');
            }).toThrow();
        });

        it('rejects whitespace-only sessionId', () => {
            expect(() => {
                new SecureRecorder('   ');
            }).toThrow();
        });

        it('accepts valid sessionId', () => {
            const recorder = new SecureRecorder('valid-session-id');
            // sessionId is set synchronously in constructor
            expect(recorder.sessionId).toBe('valid-session-id');
        });
    });

    describe('onerror callback', () => {
        it('has onerror property', () => {
            const recorder = new SecureRecorder('test-session');
            // onerror is set synchronously
            expect(recorder.onerror).toBeNull();
            recorder.onerror = () => {};
            expect(typeof recorder.onerror).toBe('function');
        });
    });

    describe('Error Handling', () => {
        it('normalizes unknown errors', async () => {
            const recorder = new SecureRecorder('test-session');
            // Wait for _syncState to complete
            await new Promise((resolve) => setTimeout(resolve, 10));
            try {
                // This will throw because native module is not available
                await recorder.start();
            } catch (error: any) {
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
            }
        });
    });
});

/**
 * Manual Integration Test Steps (Run on device/simulator)
 *
 * 1. Check Permission:
 *    const hasPermission = await SecureRecorder.hasPermission();
 *    console.log('Has permission:', hasPermission);
 *
 * 2. Request Permission (if needed):
 *    const granted = await SecureRecorder.requestPermission();
 *    console.log('Permission granted:', granted);
 *
 * 3. Create Recorder and Start Recording:
 *    const recorder = new SecureRecorder('test-session-123');
 *    recorder.onerror = (error) => console.error('Error:', error);
 *    await recorder.start();
 *    console.log('Recording state:', recorder.state);
 *    console.log('Recording:', recorder.isRecording);
 *    console.log('File path:', recorder.filePath);
 *
 * 4. Stop Recording (after a few seconds):
 *    const encryptedPath = await recorder.stop();
 *    console.log('Encrypted file:', encryptedPath);
 *    console.log('Final state:', recorder.state);
 *
 * 5. Verify File:
 *    - File should exist at encryptedPath
 *    - File should have .dat extension
 *    - File size should be > 28 bytes (12 nonce + data + 16 tag)
 *    - File should NOT be plaintext (encrypted)
 *
 * 6. Decrypt and Process:
 *    const chunks = await SecureRecorder.getChunks(encryptedPath);
 *    console.log('Chunks:', chunks.length);
 *    const fullAudio = chunks.toUint8Array();
 *
 * 7. Error Cases:
 *    a) Start recording twice:
 *       await recorder.start();
 *       await recorder.start(); // Should throw RECORDING_IN_PROGRESS
 *
 *    b) Stop without starting (idempotent):
 *       const recorder2 = new SecureRecorder('session-2');
 *       const path = await recorder2.stop(); // path === null, logs warning, no throw
 *
 *    c) Start without permission:
 *       // Don't grant permission
 *       const recorder3 = new SecureRecorder('session-3');
 *       await recorder3.start(); // Should throw PERMISSION_DENIED
 */
