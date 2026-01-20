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

    it('can instantiate SecureRecorder', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder).toBeDefined();
      expect(recorder.state).toBe('inactive');
      expect(recorder.recording).toBe(false);
      recorder.dispose();
    });

    it('has static hasPermission method', () => {
      expect(SecureRecorder.hasPermission).toBeDefined();
      expect(typeof SecureRecorder.hasPermission).toBe('function');
    });

    it('has static requestPermission method', () => {
      expect(SecureRecorder.requestPermission).toBeDefined();
      expect(typeof SecureRecorder.requestPermission).toBe('function');
    });

    it('has static getChunks method', () => {
      expect(SecureRecorder.getChunks).toBeDefined();
      expect(typeof SecureRecorder.getChunks).toBe('function');
    });
  });

  describe('Instance Properties', () => {
    it('has state property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.state).toBe('inactive');
      expect(['inactive', 'recording', 'stopped']).toContain(recorder.state);
      recorder.dispose();
    });

    it('has recording property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(typeof recorder.recording).toBe('boolean');
      expect(recorder.recording).toBe(false);
      recorder.dispose();
    });

    it('has sessionId property', () => {
      const recorder = new SecureRecorder('test-session-123');
      expect(recorder.sessionId).toBe('test-session-123');
      recorder.dispose();
    });

    it('has filePath property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.filePath).toBeNull();
      recorder.dispose();
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
      expect(recorder.sessionId).toBe('valid-session-id');
      recorder.dispose();
    });
  });

  describe('Event Handlers', () => {
    it('has onstatuschange property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.onstatuschange).toBeNull();
      recorder.onstatuschange = () => {};
      expect(typeof recorder.onstatuschange).toBe('function');
      recorder.dispose();
    });

    it('has onerror property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.onerror).toBeNull();
      recorder.onerror = () => {};
      expect(typeof recorder.onerror).toBe('function');
      recorder.dispose();
    });
  });

  describe('Error Handling', () => {
    it('normalizes unknown errors', async () => {
      const recorder = new SecureRecorder('test-session');
      try {
        // This will throw because native module is not available
        await recorder.start();
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      } finally {
        recorder.dispose();
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
 *    recorder.onstatuschange = (event) => {
 *      console.log('State:', event.state);
 *      console.log('File:', event.filePath);
 *    };
 *    recorder.onerror = (error) => {
 *      console.error('Error:', error);
 *    };
 *    await recorder.start();
 *    console.log('Recording state:', recorder.state);
 *    console.log('Recording:', recorder.recording);
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
 *    b) Stop without starting:
 *       const recorder2 = new SecureRecorder('session-2');
 *       await recorder2.stop(); // Should throw NO_RECORDING_IN_PROGRESS
 *    
 *    c) Start without permission:
 *       // Don't grant permission
 *       const recorder3 = new SecureRecorder('session-3');
 *       await recorder3.start(); // Should throw PERMISSION_DENIED
 */
