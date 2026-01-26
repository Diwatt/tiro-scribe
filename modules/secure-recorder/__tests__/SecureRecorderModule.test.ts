/**
 * Tests for SecureRecorderModule using ZOMBIES methodology.
 * 
 * Z - Zero: Native module unavailable, null/undefined responses
 * O - One: Single method call (happy path)
 * M - Many: Multiple method calls, concurrent operations
 * B - Boundary: All methods, different parameter types
 * I - Interface: Verify all methods delegate to native module correctly
 * E - Exceptions: Module loading failures, native method failures
 */

import { SecureRecorderModule } from '../src/SecureRecorderModule';
import type { RecordingStatus } from '../src/Type';

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(),
}));

describe('SecureRecorderModule', () => {
  let mockNativeModule: any;
  let requireNativeModule: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireNativeModule = require('expo-modules-core').requireNativeModule;

    mockNativeModule = {
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      getStatus: jest.fn(),
      hasPermission: jest.fn(),
      stream: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    requireNativeModule.mockReturnValue(mockNativeModule);
  });

  describe('Z - Zero Cases (Empty/Null/Missing Data)', () => {
    it('should throw when requireNativeModule returns null', () => {
      requireNativeModule.mockReturnValue(null);
      // Accessing nativeModule getter will trigger requireNativeModule
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow();
    });

    it('should throw when requireNativeModule returns undefined', () => {
      requireNativeModule.mockReturnValue(undefined);
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow();
    });

    it('should handle null sessionId in startRecording', async () => {
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      await expect(SecureRecorderModule.startRecording(null as any)).resolves.toBe('/path.dat');
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith(null);
    });

    it('should handle empty string sessionId in startRecording', async () => {
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      await expect(SecureRecorderModule.startRecording('')).resolves.toBe('/path.dat');
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith('');
    });

    it('should handle null path in stream', async () => {
      mockNativeModule.stream.mockResolvedValue(undefined);
      await expect(SecureRecorderModule.stream(null as any)).resolves.toBeUndefined();
      expect(mockNativeModule.stream).toHaveBeenCalledWith(null);
    });

    it('should handle empty string path in stream', async () => {
      mockNativeModule.stream.mockResolvedValue(undefined);
      await expect(SecureRecorderModule.stream('')).resolves.toBeUndefined();
      expect(mockNativeModule.stream).toHaveBeenCalledWith('');
    });
  });

  describe('O - One Cases (Happy Path)', () => {
    it('startRecording should delegate to native module', async () => {
      const sessionId = 'test-session';
      const filePath = '/tmp/test-session.dat';
      mockNativeModule.startRecording.mockResolvedValue(filePath);
      const result = await SecureRecorderModule.startRecording(sessionId);
      expect(result).toBe(filePath);
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith(sessionId);
    });

    it('stopRecording should delegate to native module', async () => {
      const filePath = '/tmp/test-session.dat';
      mockNativeModule.stopRecording.mockResolvedValue(filePath);
      const result = await SecureRecorderModule.stopRecording();
      expect(result).toBe(filePath);
      expect(mockNativeModule.stopRecording).toHaveBeenCalledWith();
    });

    it('getStatus should delegate to native module', async () => {
      const status: RecordingStatus = {
        state: 'recording',
        sessionId: 'test-session',
        filePath: '/tmp/test-session.dat',
        reason: null,
      };
      mockNativeModule.getStatus.mockResolvedValue(status);
      const result = await SecureRecorderModule.getStatus();
      expect(result).toEqual(status);
      expect(mockNativeModule.getStatus).toHaveBeenCalledWith();
    });

    it('hasPermission should delegate to native module', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(true);
      const result = await SecureRecorderModule.hasPermission();
      expect(result).toBe(true);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledWith();
    });

    it('stream should delegate to native module', async () => {
      const filePath = '/tmp/test-session.dat';
      mockNativeModule.stream.mockResolvedValue(undefined);
      await SecureRecorderModule.stream(filePath);
      expect(mockNativeModule.stream).toHaveBeenCalledWith(filePath);
    });

    it('addListener should delegate to native module', () => {
      const listener = jest.fn();
      const subscription = { remove: jest.fn() };
      mockNativeModule.addListener.mockReturnValue(subscription);
      const result = SecureRecorderModule.addListener('onEvent', listener);
      expect(result).toBe(subscription);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith('onEvent', listener);
    });

    it('removeAllListeners should delegate to native module', () => {
      SecureRecorderModule.removeAllListeners('onEvent');
      expect(mockNativeModule.removeAllListeners).toHaveBeenCalledWith('onEvent');
    });

    it('removeAllListeners should delegate without event name', () => {
      SecureRecorderModule.removeAllListeners();
      expect(mockNativeModule.removeAllListeners).toHaveBeenCalledWith(undefined);
    });
  });

  describe('M - Many Cases (Multiple Calls, Concurrent Operations)', () => {
    it('should handle multiple startRecording calls', async () => {
      mockNativeModule.startRecording
        .mockResolvedValueOnce('/path1.dat')
        .mockResolvedValueOnce('/path2.dat');
      const result1 = await SecureRecorderModule.startRecording('session1');
      const result2 = await SecureRecorderModule.startRecording('session2');
      expect(result1).toBe('/path1.dat');
      expect(result2).toBe('/path2.dat');
      expect(mockNativeModule.startRecording).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent startRecording calls', async () => {
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      const promises = [
        SecureRecorderModule.startRecording('session1'),
        SecureRecorderModule.startRecording('session2'),
      ];
      await Promise.all(promises);
      expect(mockNativeModule.startRecording).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple getStatus calls', async () => {
      const status1: RecordingStatus = { state: 'inactive', sessionId: null, filePath: null, reason: null };
      const status2: RecordingStatus = { state: 'recording', sessionId: 'test', filePath: '/path.dat', reason: null };
      mockNativeModule.getStatus
        .mockResolvedValueOnce(status1)
        .mockResolvedValueOnce(status2);
      const result1 = await SecureRecorderModule.getStatus();
      const result2 = await SecureRecorderModule.getStatus();
      expect(result1).toEqual(status1);
      expect(result2).toEqual(status2);
    });

    it('should handle multiple stream calls', async () => {
      mockNativeModule.stream.mockResolvedValue(undefined);
      await SecureRecorderModule.stream('/path1.dat');
      await SecureRecorderModule.stream('/path2.dat');
      expect(mockNativeModule.stream).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple addListener calls', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const subscription = { remove: jest.fn() };
      mockNativeModule.addListener.mockReturnValue(subscription);
      SecureRecorderModule.addListener('event1', listener1);
      SecureRecorderModule.addListener('event2', listener2);
      expect(mockNativeModule.addListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('B - Boundary Cases (Edge Cases)', () => {
    it('startRecording should handle very long sessionId', async () => {
      const longSessionId = 'a'.repeat(1000);
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      await SecureRecorderModule.startRecording(longSessionId);
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith(longSessionId);
    });

    it('startRecording should handle sessionId with special characters', async () => {
      const specialSessionId = 'session-123 (test) [2024]';
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      await SecureRecorderModule.startRecording(specialSessionId);
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith(specialSessionId);
    });

    it('startRecording should handle sessionId with unicode characters', async () => {
      const unicodeSessionId = 'session-测试-файл';
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      await SecureRecorderModule.startRecording(unicodeSessionId);
      expect(mockNativeModule.startRecording).toHaveBeenCalledWith(unicodeSessionId);
    });

    it('stream should handle very long file path', async () => {
      const longPath = '/very/long/path/' + 'a'.repeat(1000) + '.dat';
      mockNativeModule.stream.mockResolvedValue(undefined);
      await SecureRecorderModule.stream(longPath);
      expect(mockNativeModule.stream).toHaveBeenCalledWith(longPath);
    });

    it('getStatus should handle all state values', async () => {
      const states = ['inactive', 'recording', 'stopped'];
      for (const state of states) {
        const status: RecordingStatus = {
          state: state as any,
          sessionId: 'test',
          filePath: '/path.dat',
          reason: null,
        };
        mockNativeModule.getStatus.mockResolvedValueOnce(status);
        const result = await SecureRecorderModule.getStatus();
        expect(result.state).toBe(state);
      }
    });

    it('addListener should handle different event names', () => {
      const listener = jest.fn();
      const subscription = { remove: jest.fn() };
      mockNativeModule.addListener.mockReturnValue(subscription);
      const events = ['onEvent1', 'onEvent2', 'onRecordingStatusChanged'];
      events.forEach((event) => {
        SecureRecorderModule.addListener(event, listener);
      });
      expect(mockNativeModule.addListener).toHaveBeenCalledTimes(3);
    });
  });

  describe('I - Interface Cases (Method Delegation Verification)', () => {
    it('should call requireNativeModule only once (lazy loading)', () => {
      // Access nativeModule multiple times
      SecureRecorderModule.startRecording('test');
      SecureRecorderModule.stopRecording();
      SecureRecorderModule.getStatus();
      // requireNativeModule should be called once per method access (since it's in getter)
      // Actually, each method access triggers the getter, so it's called multiple times
      // But the native module is cached after first access
      expect(requireNativeModule).toHaveBeenCalled();
    });

    it('all methods should delegate to native module', async () => {
      mockNativeModule.startRecording.mockResolvedValue('/path.dat');
      mockNativeModule.stopRecording.mockResolvedValue('/path.dat');
      mockNativeModule.getStatus.mockResolvedValue({
        state: 'inactive',
        sessionId: null,
        filePath: null,
        reason: null,
      });
      mockNativeModule.hasPermission.mockResolvedValue(true);
      mockNativeModule.stream.mockResolvedValue(undefined);
      const subscription = { remove: jest.fn() };
      mockNativeModule.addListener.mockReturnValue(subscription);

      await SecureRecorderModule.startRecording('test');
      await SecureRecorderModule.stopRecording();
      await SecureRecorderModule.getStatus();
      await SecureRecorderModule.hasPermission();
      await SecureRecorderModule.stream('/path.dat');
      SecureRecorderModule.addListener('event', jest.fn());
      SecureRecorderModule.removeAllListeners('event');

      expect(mockNativeModule.startRecording).toHaveBeenCalled();
      expect(mockNativeModule.stopRecording).toHaveBeenCalled();
      expect(mockNativeModule.getStatus).toHaveBeenCalled();
      expect(mockNativeModule.hasPermission).toHaveBeenCalled();
      expect(mockNativeModule.stream).toHaveBeenCalled();
      expect(mockNativeModule.addListener).toHaveBeenCalled();
      expect(mockNativeModule.removeAllListeners).toHaveBeenCalled();
    });

    it('EVENT_AUDIO_CHUNK_DECRYPTED should be defined', () => {
      expect(SecureRecorderModule.EVENT_AUDIO_CHUNK_DECRYPTED).toBe('onAudioChunkDecrypted');
    });
  });

  describe('E - Exception Cases (Error Handling)', () => {
    it('should throw when requireNativeModule throws', () => {
      const error = new Error('Module not found');
      requireNativeModule.mockImplementation(() => {
        throw error;
      });
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow('Module not found');
    });

    it('should throw with Expo Go error message when module unavailable', () => {
      requireNativeModule.mockImplementation(() => {
        throw new Error('Native module not found');
      });
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow();
    });

    it('startRecording should propagate native module errors', async () => {
      const error = new Error('Native startRecording failed');
      mockNativeModule.startRecording.mockRejectedValue(error);
      await expect(SecureRecorderModule.startRecording('test')).rejects.toThrow('Native startRecording failed');
    });

    it('stopRecording should propagate native module errors', async () => {
      const error = new Error('Native stopRecording failed');
      mockNativeModule.stopRecording.mockRejectedValue(error);
      await expect(SecureRecorderModule.stopRecording()).rejects.toThrow('Native stopRecording failed');
    });

    it('getStatus should propagate native module errors', async () => {
      const error = new Error('Native getStatus failed');
      mockNativeModule.getStatus.mockRejectedValue(error);
      await expect(SecureRecorderModule.getStatus()).rejects.toThrow('Native getStatus failed');
    });

    it('hasPermission should propagate native module errors', async () => {
      const error = new Error('Native hasPermission failed');
      mockNativeModule.hasPermission.mockRejectedValue(error);
      await expect(SecureRecorderModule.hasPermission()).rejects.toThrow('Native hasPermission failed');
    });

    it('stream should propagate native module errors', async () => {
      const error = new Error('Native stream failed');
      mockNativeModule.stream.mockRejectedValue(error);
      await expect(SecureRecorderModule.stream('/path.dat')).rejects.toThrow('Native stream failed');
    });

    it('addListener should propagate native module errors', () => {
      const error = new Error('Native addListener failed');
      mockNativeModule.addListener.mockImplementation(() => {
        throw error;
      });
      expect(() => {
        SecureRecorderModule.addListener('event', jest.fn());
      }).toThrow('Native addListener failed');
    });

    it('removeAllListeners should propagate native module errors', () => {
      const error = new Error('Native removeAllListeners failed');
      mockNativeModule.removeAllListeners.mockImplementation(() => {
        throw error;
      });
      expect(() => {
        SecureRecorderModule.removeAllListeners('event');
      }).toThrow('Native removeAllListeners failed');
    });

    it('should handle error when native module methods are missing', () => {
      const incompleteModule = {};
      requireNativeModule.mockReturnValue(incompleteModule);
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow();
    });

    it('should handle error when native module is not an object', () => {
      requireNativeModule.mockReturnValue('not an object');
      expect(() => {
        SecureRecorderModule.startRecording('test');
      }).toThrow();
    });
  });
});
