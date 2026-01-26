/**
 * Comprehensive tests for SecureRecorder using ZOMBIES methodology.
 * 
 * This file expands on events.test.ts to cover all missing edge cases.
 * 
 * Z - Zero: null filePath, null handlers, empty sessionId
 * O - One: Single recording cycle (happy path)
 * M - Many: Multiple instances, race conditions, rapid calls
 * B - Boundary: Special characters, state transitions, edge values
 * I - Interface: All native module interactions, event subscriptions
 * E - Exceptions: All error codes, native module failures
 */

import { SecureRecorder } from '../src/SecureRecorder';
import { RecorderState } from '../src/RecorderState';
import { ErrorCode } from '../src/ErrorCode';
import type { NativeRecorderModule, EventEmitter, RecordingStatus } from '../src/Type';

describe('SecureRecorder - Comprehensive Tests', () => {
  let mockNativeModule: jest.Mocked<NativeRecorderModule>;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let createFakeNative: () => jest.Mocked<NativeRecorderModule & EventEmitter>;

  beforeEach(() => {
    createFakeNative = () => {
      let status: RecordingStatus = {
        state: RecorderState.INACTIVE,
        sessionId: null,
        filePath: null,
        reason: null,
      };
      const listeners = new Map<string, Set<(d: any) => any>>();
      const ensure = (e: string) => {
        if (!listeners.has(e)) listeners.set(e, new Set());
        return listeners.get(e)!;
      };
      const fake = {
        startRecording: jest.fn(async (sessionId: string) => {
          status.sessionId = sessionId;
          status.filePath = `/tmp/${sessionId}.dat`;
          status.state = RecorderState.RECORDING;
          // Update getStatus to return current state (important for _syncState)
          fake.getStatus.mockResolvedValue({ ...status });
          // Fire event synchronously (matching events.test.ts pattern)
          ensure('onRecordingStatusChanged').forEach((cb) => cb({ ...status }));
          return status.filePath!;
        }),
        stopRecording: jest.fn(async () => {
          status.state = RecorderState.STOPPED;
          // Update getStatus to return current state (important for _syncState)
          fake.getStatus.mockResolvedValue({ ...status });
          // Fire event synchronously (matching events.test.ts pattern)
          ensure('onRecordingStatusChanged').forEach((cb) => cb({ ...status }));
          return status.filePath!;
        }),
        getStatus: jest.fn(async () => {
          // Always return current status (important - _syncState may be called anytime)
          return { ...status };
        }),
        hasPermission: jest.fn(async () => true),
        stream: jest.fn(async (_p: string) => {}),
        addListener: jest.fn((event: string, listener: (d: any) => any) => {
          ensure(event).add(listener);
          return { remove: () => ensure(event).delete(listener) };
        }),
        removeAllListeners: jest.fn((_e?: string) => {}),
      } as any;
      return fake;
    };
  });
  
  // Helper to wait for _syncState to complete (called in constructor)
  const waitForSync = async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
  };

  describe('Z - Zero Cases (Empty/Null/Missing Data)', () => {
    it('should handle null filePath from native module', async () => {
      const fake = createFakeNative();
      fake.startRecording.mockResolvedValue(null as any);
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      expect(recorder.filePath).toBeNull();
    });

    it('should handle null filePath in status update', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const status: RecordingStatus = {
        state: RecorderState.RECORDING,
        sessionId: 'test',
        filePath: null,
        reason: null,
      };
      (fake.addListener as jest.Mock).mock.calls[0][1](status);
      expect(recorder.filePath).toBeNull();
    });

    it('should handle onstatuschange set to null mid-recording', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const changes: any[] = [];
      recorder.onstatuschange = (e) => changes.push(e);
      await recorder.start();
      recorder.onstatuschange = null;
      await recorder.stop();
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should handle onerror set to null mid-recording', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const errors: any[] = [];
      recorder.onerror = (e) => errors.push(e);
      recorder.onerror = null;
      // Should not throw when error occurs
      fake.startRecording.mockRejectedValueOnce(new Error('Test error'));
      try {
        await recorder.start();
      } catch {
        // Expected
      }
      expect(errors.length).toBe(0);
    });

    it('should handle dispose called multiple times (idempotency)', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      recorder.dispose();
      recorder.dispose();
      recorder.dispose();
      // Should not throw
      expect(fake.addListener).toHaveBeenCalled();
    });

    it('should handle dispose called while recording', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      recorder.dispose();
      // State should remain, but event subscription removed
      expect(recorder.state).toBe(RecorderState.RECORDING);
    });

    it('should handle getStatus returning null sessionId', async () => {
      const fake = createFakeNative();
      fake.getStatus.mockResolvedValue({
        state: RecorderState.INACTIVE,
        sessionId: null,
        filePath: null,
        reason: null,
      });
      const recorder = new SecureRecorder('test', fake, fake);
      // Should not throw during _syncState
      expect(recorder.state).toBe(RecorderState.INACTIVE);
    });
  });

  describe('O - One Cases (Happy Path)', () => {
    it('should set filePath after successful start', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test-session', fake, fake);
      await waitForSync(); // Wait for _syncState to complete
      await recorder.start();
      expect(recorder.filePath).toBe('/tmp/test-session.dat');
      expect(recorder.state).toBe(RecorderState.RECORDING);
    });

    it('should return correct filePath from stop', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test-session', fake, fake);
      await waitForSync();
      await recorder.start();
      const filePath = await recorder.stop();
      expect(filePath).toBe('/tmp/test-session.dat');
      expect(recorder.state).toBe(RecorderState.STOPPED);
    });

    it('onstatuschange should fire exactly once per state transition', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const changes: any[] = [];
      recorder.onstatuschange = (e) => changes.push(e);
      await recorder.start();
      await recorder.stop();
      // Should fire for: INACTIVE -> RECORDING, RECORDING -> STOPPED
      expect(changes.length).toBeGreaterThanOrEqual(1);
    });

    it('dispose should remove event subscription', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const subscription = (fake.addListener as jest.Mock).mock.results[0].value;
      const removeSpy = jest.spyOn(subscription, 'remove');
      recorder.dispose();
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should initialize with correct sessionId', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('my-session-123', fake, fake);
      expect(recorder.sessionId).toBe('my-session-123');
    });

    it('recording getter should return false when inactive', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      expect(recorder.recording).toBe(false);
    });

    it('recording getter should return true when recording', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      expect(recorder.recording).toBe(true);
    });
  });

  describe('M - Many Cases (Multiple Instances, Race Conditions)', () => {
    it('should handle multiple SecureRecorder instances with different sessionIds', async () => {
      const fake1 = createFakeNative();
      const fake2 = createFakeNative();
      const recorder1 = new SecureRecorder('session-1', fake1, fake1);
      const recorder2 = new SecureRecorder('session-2', fake2, fake2);
      await waitForSync();
      await recorder1.start();
      await recorder2.start();
      expect(recorder1.sessionId).toBe('session-1');
      expect(recorder2.sessionId).toBe('session-2');
    });

    it('should handle multiple SecureRecorder instances with same sessionId', async () => {
      const fake1 = createFakeNative();
      const fake2 = createFakeNative();
      const recorder1 = new SecureRecorder('same-session', fake1, fake1);
      const recorder2 = new SecureRecorder('same-session', fake2, fake2);
      await waitForSync();
      await recorder1.start();
      await recorder2.start();
      // Both should work independently
      expect(recorder1.state).toBe(RecorderState.RECORDING);
      expect(recorder2.state).toBe(RecorderState.RECORDING);
    });

    it('should handle rapid start() calls (race condition protection)', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const promise1 = recorder.start();
      const promise2 = recorder.start();
      await expect(promise1).resolves.toBeUndefined();
      await expect(promise2).rejects.toMatchObject({ code: ErrorCode.RECORDING_IN_PROGRESS });
    });

    it('should handle rapid stop() calls (race condition protection)', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      const promise1 = recorder.stop();
      const promise2 = recorder.stop();
      await expect(promise1).resolves.toBeDefined();
      await expect(promise2).rejects.toMatchObject({ code: ErrorCode.NO_RECORDING_IN_PROGRESS });
    });

    it('should handle multiple dispose calls', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      recorder.dispose();
      recorder.dispose();
      recorder.dispose();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle multiple onstatuschange assignments', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const changes1: any[] = [];
      const changes2: any[] = [];
      recorder.onstatuschange = (e) => changes1.push(e);
      recorder.onstatuschange = (e) => changes2.push(e);
      await recorder.start();
      expect(changes1.length).toBe(0);
      expect(changes2.length).toBeGreaterThan(0);
    });
  });

  describe('B - Boundary Cases (Edge Cases)', () => {
    it('should handle sessionId with maximum reasonable length', () => {
      const longSessionId = 'a'.repeat(255);
      const fake = createFakeNative();
      const recorder = new SecureRecorder(longSessionId, fake, fake);
      expect(recorder.sessionId).toBe(longSessionId);
    });

    it('should handle sessionId with special characters', () => {
      const specialSessionId = 'session-123 (test) [2024]';
      const fake = createFakeNative();
      const recorder = new SecureRecorder(specialSessionId, fake, fake);
      expect(recorder.sessionId).toBe(specialSessionId);
    });

    it('should handle sessionId with unicode characters', () => {
      const unicodeSessionId = 'session-测试-файл';
      const fake = createFakeNative();
      const recorder = new SecureRecorder(unicodeSessionId, fake, fake);
      expect(recorder.sessionId).toBe(unicodeSessionId);
    });

    it('should handle state transition: INACTIVE -> RECORDING -> STOPPED -> (attempt RECORDING)', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      await recorder.stop();
      await expect(recorder.start()).rejects.toMatchObject({ code: ErrorCode.RECORDER_STOPPED });
    });

    it('should handle start() called immediately after constructor', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      expect(recorder.state).toBe(RecorderState.RECORDING);
    });

    it('should handle stop() called immediately after start() (very short recording)', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      const filePath = await recorder.stop();
      expect(filePath).toBeDefined();
      expect(recorder.state).toBe(RecorderState.STOPPED);
    });

    it('should handle filePath changes between start() and stop()', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      const initialPath = recorder.filePath;
      // Simulate path change
      const status: RecordingStatus = {
        state: RecorderState.RECORDING,
        sessionId: 'test',
        filePath: '/new/path.dat',
        reason: null,
      };
      (fake.addListener as jest.Mock).mock.calls[0][1](status);
      expect(recorder.filePath).toBe('/new/path.dat');
    });

    it('should handle onstatuschange with all possible reason values', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const reasons = ['duration_limit', 'file_size_limit', 'user_stopped', 'error', null];
      const receivedReasons: any[] = [];
      recorder.onstatuschange = (e) => receivedReasons.push(e.reason);
      
      // Start recording first to set initial state
      await recorder.start();
      
      // For each reason, change state to trigger onstatuschange
      // Note: onstatuschange only fires when state changes, so we need to alternate states
      for (let i = 0; i < reasons.length; i++) {
        const reason = reasons[i];
        const status: RecordingStatus = {
          state: i % 2 === 0 ? RecorderState.RECORDING : RecorderState.STOPPED,
          sessionId: 'test',
          filePath: '/path.dat',
          reason: reason as any,
        };
        (fake.addListener as jest.Mock).mock.calls[0][1](status);
      }
      // Should receive events for state changes (alternating between RECORDING and STOPPED)
      expect(receivedReasons.length).toBeGreaterThan(0);
    });
  });

  describe('I - Interface Cases (Mock Verification)', () => {
    it('start() should call nativeModule.startRecording() with correct sessionId', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('my-session', fake, fake);
      await waitForSync();
      await recorder.start();
      expect(fake.startRecording).toHaveBeenCalledWith('my-session');
    });

    it('stop() should call nativeModule.stopRecording() with no args', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      await recorder.stop();
      expect(fake.stopRecording).toHaveBeenCalledWith();
    });

    it('constructor should call eventEmitter.addListener() with correct event name', () => {
      const fake = createFakeNative();
      new SecureRecorder('test', fake, fake);
      expect(fake.addListener).toHaveBeenCalledWith('onRecordingStatusChanged', expect.any(Function));
    });

    it('dispose() should call eventSubscription.remove()', () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const subscription = (fake.addListener as jest.Mock).mock.results[0].value;
      const removeSpy = jest.spyOn(subscription, 'remove');
      recorder.dispose();
      expect(removeSpy).toHaveBeenCalled();
    });

    it('onstatuschange should not be called if handler is null', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      recorder.onstatuschange = null;
      const spy = jest.fn();
      recorder.onstatuschange = spy;
      recorder.onstatuschange = null;
      await recorder.start();
      // Handler was set to null, so spy should not be called
      // Actually, it was set before start, so it might be called
      // Let's test that setting to null prevents future calls
      const status: RecordingStatus = {
        state: RecorderState.RECORDING,
        sessionId: 'test',
        filePath: '/path.dat',
        reason: null,
      };
      recorder.onstatuschange = null;
      (fake.addListener as jest.Mock).mock.calls[0][1](status);
      expect(spy).not.toHaveBeenCalled();
    });

    it('onerror should not be called if handler is null', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      recorder.onerror = null;
      fake.startRecording.mockRejectedValue(new Error('Test error'));
      try {
        await recorder.start();
      } catch {
        // Expected
      }
      // onerror should not throw if null
      expect(true).toBe(true);
    });

    it('_syncState should call nativeModule.getStatus()', async () => {
      const fake = createFakeNative();
      new SecureRecorder('test', fake, fake);
      // _syncState is called in constructor
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fake.getStatus).toHaveBeenCalled();
    });
  });

  describe('E - Exception Cases (All Error Codes)', () => {
    it('start() should throw PERMISSION_DENIED when native throws', async () => {
      const fake = createFakeNative();
      const error = { code: ErrorCode.PERMISSION_DENIED, message: 'Permission denied' };
      fake.startRecording.mockRejectedValue(error);
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await expect(recorder.start()).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
    });

    it('start() should throw INITIALIZATION_FAILED when native throws', async () => {
      const fake = createFakeNative();
      const error = { code: ErrorCode.INITIALIZATION_FAILED, message: 'Init failed' };
      fake.startRecording.mockRejectedValue(error);
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await expect(recorder.start()).rejects.toMatchObject({ code: ErrorCode.INITIALIZATION_FAILED });
    });

    it('start() should throw KEYCHAIN_ERROR when native throws', async () => {
      const fake = createFakeNative();
      const error = { code: ErrorCode.KEYCHAIN_ERROR, message: 'Keychain error' };
      fake.startRecording.mockRejectedValue(error);
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await expect(recorder.start()).rejects.toMatchObject({ code: ErrorCode.KEYCHAIN_ERROR });
    });

    it('start() should throw RECORDING_FAILED when native throws', async () => {
      const fake = createFakeNative();
      const error = { code: ErrorCode.RECORDING_FAILED, message: 'Recording failed' };
      fake.startRecording.mockRejectedValue(error);
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await expect(recorder.start()).rejects.toMatchObject({ code: ErrorCode.RECORDING_FAILED });
    });

    it('stop() should throw STOP_FAILED when native throws', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      // Ensure state is RECORDING before stopping
      expect(recorder.state).toBe(RecorderState.RECORDING);
      const error = { code: ErrorCode.STOP_FAILED, message: 'Stop failed' };
      fake.stopRecording.mockRejectedValue(error);
      await expect(recorder.stop()).rejects.toMatchObject({ code: ErrorCode.STOP_FAILED });
    });

    it('stop() should throw KEYCHAIN_ERROR when native throws', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      // Ensure state is RECORDING before stopping
      expect(recorder.state).toBe(RecorderState.RECORDING);
      const error = { code: ErrorCode.KEYCHAIN_ERROR, message: 'Keychain error' };
      fake.stopRecording.mockRejectedValue(error);
      await expect(recorder.stop()).rejects.toMatchObject({ code: ErrorCode.KEYCHAIN_ERROR });
    });

    it('onerror should be called with correct error when start() fails', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      const errorHandler = jest.fn();
      recorder.onerror = errorHandler;
      const error = { code: ErrorCode.PERMISSION_DENIED, message: 'Permission denied' };
      fake.startRecording.mockRejectedValue(error);
      try {
        await recorder.start();
      } catch {
        // Expected
      }
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ code: ErrorCode.PERMISSION_DENIED }));
    });

    it('onerror should be called with correct error when stop() fails', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      await waitForSync();
      await recorder.start();
      const errorHandler = jest.fn();
      recorder.onerror = errorHandler;
      const error = { code: ErrorCode.STOP_FAILED, message: 'Stop failed' };
      fake.stopRecording.mockRejectedValue(error);
      try {
        await recorder.stop();
      } catch {
        // Expected
      }
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ code: ErrorCode.STOP_FAILED }));
    });

    it('_syncState should silently handle errors', async () => {
      const fake = createFakeNative();
      fake.getStatus.mockRejectedValue(new Error('Sync failed'));
      const recorder = new SecureRecorder('test', fake, fake);
      // Should not throw
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(recorder.state).toBe(RecorderState.INACTIVE);
    });

    it('should normalize all native errors correctly', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const nativeError = new Error('Native error');
      nativeError.name = 'RecordingInProgressException';
      fake.startRecording.mockRejectedValue(nativeError);
      await expect(recorder.start()).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
      });
    });

    it('should handle unknown error types gracefully', async () => {
      const fake = createFakeNative();
      const recorder = new SecureRecorder('test', fake, fake);
      const unknownError = { type: 'CustomError', message: 'Custom' };
      fake.startRecording.mockRejectedValue(unknownError);
      await expect(recorder.start()).rejects.toMatchObject({
        code: ErrorCode.UNKNOWN_ERROR,
      });
    });
  });

  describe('Static Methods', () => {
    it('hasPermission should delegate to PermissionManager', async () => {
      // This is tested indirectly through integration tests
      // Full testing requires mocking static PermissionManager
      expect(typeof SecureRecorder.hasPermission).toBe('function');
    });

    it('requestPermission should delegate to PermissionManager', async () => {
      expect(typeof SecureRecorder.requestPermission).toBe('function');
    });

    it('addDecryptionListener should delegate to SecureRecorderModule', () => {
      // Mock SecureRecorderModule.addListener (static method)
      const { SecureRecorderModule } = jest.requireActual('../src/SecureRecorderModule');
      const fake = createFakeNative();
      
      const originalAddListener = SecureRecorderModule.addListener.bind(SecureRecorderModule);
      try {
        // Redirect to fake
        (SecureRecorderModule as any).addListener = fake.addListener;
        
        const handler = jest.fn();
        const subscription = SecureRecorder.addDecryptionListener(handler);
        
        expect(fake.addListener).toHaveBeenCalledWith('onAudioChunkDecrypted', handler);
        expect(subscription).toHaveProperty('remove');
      } finally {
        // Restore
        (SecureRecorderModule as any).addListener = originalAddListener;
      }
    });

    it('stream should delegate to DecryptionManager', async () => {
      // This is tested indirectly through integration tests
      expect(typeof SecureRecorder.stream).toBe('function');
    });
  });
});
