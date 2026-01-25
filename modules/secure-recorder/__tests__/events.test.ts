/**
 * Tests for SecureRecorder onerror callback (Pure Command pattern).
 * onerror is invoked when start/stop throws; it is not an event subscription.
 */

import { SecureRecorder } from '../src/index';

describe('SecureRecorder onerror', () => {
  describe('onerror property', () => {
    it('should have onerror property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.onerror).toBeNull();
    });

    it('should allow setting onerror handler', () => {
      const recorder = new SecureRecorder('test-session');
      const handler = jest.fn();
      recorder.onerror = handler;
      expect(recorder.onerror).toBe(handler);
    });

    it('should allow removing onerror handler', () => {
      const recorder = new SecureRecorder('test-session');
      recorder.onerror = jest.fn();
      recorder.onerror = null;
      expect(recorder.onerror).toBeNull();
    });
  });

  describe('onerror when command throws', () => {
    it('should call onerror when start() throws', async () => {
      const recorder = new SecureRecorder('test-session');
      const errorHandler = jest.fn();
      recorder.onerror = errorHandler;

      try {
        await recorder.start();
      } catch {
        // Expected in test environment (native module not available)
      }

      expect(errorHandler).toHaveBeenCalled();
      const errorArg = errorHandler.mock.calls[0][0];
      expect(errorArg).toHaveProperty('code');
      expect(errorArg).toHaveProperty('message');
    });
  });
});

/**
 * Manual test steps (run on device/simulator)
 *
 * const recorder = new SecureRecorder('test-session');
 * recorder.onerror = (error) => console.error('Error:', error);
 *
 * await recorder.start();
 * // recorder.state === 'recording', recorder.filePath set
 *
 * const path = await recorder.stop();
 * // recorder.state === 'stopped', path is the encrypted file path
 */
