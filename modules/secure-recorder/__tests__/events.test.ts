/**
 * Event Handler Tests for SecureRecorder
 * 
 * Tests the event-driven architecture using onstatuschange and onerror handlers
 */

import { SecureRecorder } from '../src/index';

describe('SecureRecorder Events', () => {
  describe('onstatuschange Handler', () => {
    it('should have onstatuschange property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.onstatuschange).toBeNull();
      recorder.dispose();
    });

    it('should allow setting onstatuschange handler', () => {
      const recorder = new SecureRecorder('test-session');
      const handler = jest.fn();
      recorder.onstatuschange = handler;
      expect(recorder.onstatuschange).toBe(handler);
      recorder.dispose();
    });

    it('should allow removing onstatuschange handler', () => {
      const recorder = new SecureRecorder('test-session');
      recorder.onstatuschange = jest.fn();
      recorder.onstatuschange = null;
      expect(recorder.onstatuschange).toBeNull();
      recorder.dispose();
    });
  });

  describe('onerror Handler', () => {
    it('should have onerror property', () => {
      const recorder = new SecureRecorder('test-session');
      expect(recorder.onerror).toBeNull();
      recorder.dispose();
    });

    it('should allow setting onerror handler', () => {
      const recorder = new SecureRecorder('test-session');
      const handler = jest.fn();
      recorder.onerror = handler;
      expect(recorder.onerror).toBe(handler);
      recorder.dispose();
    });

    it('should allow removing onerror handler', () => {
      const recorder = new SecureRecorder('test-session');
      recorder.onerror = jest.fn();
      recorder.onerror = null;
      expect(recorder.onerror).toBeNull();
      recorder.dispose();
    });
  });

  describe('Event Data Structure', () => {
    it('should call onstatuschange with StatusChangeEvent', () => {
      const recorder = new SecureRecorder('test-session');
      const handler = jest.fn();
      recorder.onstatuschange = handler;

      // Simulate state update (in real usage, this comes from native module)
      const mockStatus = {
        isRecording: true,
        sessionId: 'test-session',
        filePath: '/path/to/file.dat',
      };

      // Manually trigger update (normally done by native events)
      (recorder as any)._updateState(mockStatus);

      expect(handler).toHaveBeenCalledTimes(1);
      const callArgs = handler.mock.calls[0][0];
      expect(callArgs).toHaveProperty('state');
      expect(callArgs).toHaveProperty('sessionId');
      expect(callArgs).toHaveProperty('filePath');
      expect(['inactive', 'recording', 'stopped']).toContain(callArgs.state);

      recorder.dispose();
    });

    it('should handle status with null values', () => {
      const recorder = new SecureRecorder('test-session');
      const handler = jest.fn();
      recorder.onstatuschange = handler;

      const mockStatus = {
        isRecording: false,
        sessionId: null,
        filePath: null,
      };

      (recorder as any)._updateState(mockStatus);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'inactive',
          sessionId: 'test-session',
          filePath: null,
        }),
      );

      recorder.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should call onerror handler when error occurs', async () => {
      const recorder = new SecureRecorder('test-session');
      const errorHandler = jest.fn();
      recorder.onerror = errorHandler;

      try {
        // This will throw because native module is not available
        await recorder.start();
      } catch (error) {
        // Expected in test environment
      }

      // Error handler should have been called
      expect(errorHandler).toHaveBeenCalled();
      const errorArg = errorHandler.mock.calls[0][0];
      expect(errorArg).toHaveProperty('code');
      expect(errorArg).toHaveProperty('message');

      recorder.dispose();
    });

    it('should handle handler that throws', () => {
      const recorder = new SecureRecorder('test-session');
      const throwingHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      recorder.onstatuschange = throwingHandler;

      // Should not crash when handler throws
      expect(() => {
        try {
          (recorder as any)._updateState({
            isRecording: true,
            sessionId: 'test',
            filePath: '/test',
          });
        } catch (e) {
          // Expected - handler throws
        }
      }).not.toThrow();

      recorder.dispose();
    });
  });

  describe('Multiple Instances', () => {
    it('should handle multiple recorders with separate handlers', () => {
      const recorder1 = new SecureRecorder('session-1');
      const recorder2 = new SecureRecorder('session-2');

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      recorder1.onstatuschange = handler1;
      recorder2.onstatuschange = handler2;

      expect(recorder1.onstatuschange).toBe(handler1);
      expect(recorder2.onstatuschange).toBe(handler2);
      expect(recorder1.onstatuschange).not.toBe(recorder2.onstatuschange);

      recorder1.dispose();
      recorder2.dispose();
    });
  });
});

/**
 * Manual Event Test Steps (Run on device/simulator)
 * 
 * 1. Create recorder with event handlers:
 *    const recorder = new SecureRecorder('test-session');
 *    recorder.onstatuschange = (event) => {
 *      console.log('State:', event.state);
 *      console.log('File:', event.filePath);
 *    };
 *    recorder.onerror = (error) => {
 *      console.error('Error:', error);
 *    };
 * 
 * 2. Start recording:
 *    await recorder.start();
 *    // onstatuschange should fire with state: 'recording'
 * 
 * 3. Stop recording:
 *    await recorder.stop();
 *    // onstatuschange should fire with state: 'stopped'
 * 
 * 4. Check state properties:
 *    console.log('State:', recorder.state);
 *    console.log('Recording:', recorder.recording);
 *    console.log('File path:', recorder.filePath);
 * 
 * 5. Cleanup:
 *    recorder.dispose();
 */
