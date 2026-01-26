/**
 * Tests for PermissionManager using ZOMBIES methodology.
 * 
 * Z - Zero: null native module, empty responses
 * O - One: Single permission check/request (happy path)
 * M - Many: Multiple calls, race conditions
 * B - Boundary: Permission denial vs system error, timeouts
 * I - Interface: Verify native module calls, error normalization
 * E - Exceptions: All error scenarios, permission failures
 */

import { PermissionManager } from '../src/PermissionManager';
import { ErrorCode } from '../src/ErrorCode';
import type { NativeRecorderModule } from '../src/Type';

describe('PermissionManager', () => {
  let mockNativeModule: jest.Mocked<NativeRecorderModule>;
  let mockRequestPermissionFn: jest.Mock;
  let permissionManager: PermissionManager;

  beforeEach(() => {
    mockNativeModule = {
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      getStatus: jest.fn(),
      hasPermission: jest.fn(),
      stream: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    mockRequestPermissionFn = jest.fn();

    permissionManager = new PermissionManager(mockNativeModule, mockRequestPermissionFn);
  });

  describe('Z - Zero Cases (Empty/Null/Missing Data)', () => {
    it('hasPermission should throw when nativeModule is null', async () => {
      const manager = new PermissionManager(null as any, mockRequestPermissionFn);
      await expect(manager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: expect.stringContaining('native module is undefined'),
      });
    });

    it('hasPermission should throw when nativeModule is undefined', async () => {
      const manager = new PermissionManager(undefined as any, mockRequestPermissionFn);
      await expect(manager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: expect.stringContaining('native module is undefined'),
      });
    });

    it('requestPermission should handle requestPermissionFn returning undefined', async () => {
      mockRequestPermissionFn.mockResolvedValue(undefined);
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
      });
    });
  });

  describe('O - One Cases (Happy Path)', () => {
    it('hasPermission should return true when permission is granted', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(true);
      const result = await permissionManager.hasPermission();
      expect(result).toBe(true);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledTimes(1);
    });

    it('hasPermission should return false when permission is denied', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(false);
      const result = await permissionManager.hasPermission();
      expect(result).toBe(false);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledTimes(1);
    });

    it('requestPermission should return true when permission is granted', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: true });
      const result = await permissionManager.requestPermission();
      expect(result).toBe(true);
      expect(mockRequestPermissionFn).toHaveBeenCalledTimes(1);
    });

    it('requestPermission should return false when permission is denied', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: false });
      const result = await permissionManager.requestPermission();
      expect(result).toBe(false);
      expect(mockRequestPermissionFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('M - Many Cases (Multiple Calls, Race Conditions)', () => {
    it('should handle multiple hasPermission calls', async () => {
      mockNativeModule.hasPermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result1 = await permissionManager.hasPermission();
      const result2 = await permissionManager.hasPermission();
      const result3 = await permissionManager.hasPermission();

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple requestPermission calls', async () => {
      mockRequestPermissionFn
        .mockResolvedValueOnce({ granted: false })
        .mockResolvedValueOnce({ granted: true });

      const result1 = await permissionManager.requestPermission();
      const result2 = await permissionManager.requestPermission();

      expect(result1).toBe(false);
      expect(result2).toBe(true);
      expect(mockRequestPermissionFn).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent hasPermission calls', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(true);
      const promises = [
        permissionManager.hasPermission(),
        permissionManager.hasPermission(),
        permissionManager.hasPermission(),
      ];
      const results = await Promise.all(promises);
      expect(results).toEqual([true, true, true]);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requestPermission calls', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: true });
      const promises = [
        permissionManager.requestPermission(),
        permissionManager.requestPermission(),
      ];
      const results = await Promise.all(promises);
      expect(results).toEqual([true, true]);
      expect(mockRequestPermissionFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('B - Boundary Cases (Edge Cases)', () => {
    it('hasPermission should handle very slow native module response', async () => {
      mockNativeModule.hasPermission.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );
      const startTime = Date.now();
      const result = await permissionManager.hasPermission();
      const duration = Date.now() - startTime;
      expect(result).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('requestPermission should handle very slow permission request', async () => {
      mockRequestPermissionFn.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ granted: true }), 100))
      );
      const startTime = Date.now();
      const result = await permissionManager.requestPermission();
      const duration = Date.now() - startTime;
      expect(result).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('requestPermission should handle granted: false explicitly', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: false });
      const result = await permissionManager.requestPermission();
      expect(result).toBe(false);
    });

    it('requestPermission should handle granted: true explicitly', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: true });
      const result = await permissionManager.requestPermission();
      expect(result).toBe(true);
    });
  });

  describe('I - Interface Cases (Mock Verification)', () => {
    it('hasPermission should call nativeModule.hasPermission()', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(true);
      await permissionManager.hasPermission();
      expect(mockNativeModule.hasPermission).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.hasPermission).toHaveBeenCalledWith();
    });

    it('requestPermission should call requestPermissionFn()', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: true });
      await permissionManager.requestPermission();
      expect(mockRequestPermissionFn).toHaveBeenCalledTimes(1);
      expect(mockRequestPermissionFn).toHaveBeenCalledWith();
    });

    it('hasPermission should not call requestPermissionFn', async () => {
      mockNativeModule.hasPermission.mockResolvedValue(true);
      await permissionManager.hasPermission();
      expect(mockRequestPermissionFn).not.toHaveBeenCalled();
    });

    it('requestPermission should not call nativeModule.hasPermission', async () => {
      mockRequestPermissionFn.mockResolvedValue({ granted: true });
      await permissionManager.requestPermission();
      expect(mockNativeModule.hasPermission).not.toHaveBeenCalled();
    });

    it('errors from hasPermission should be normalized via ErrorNormalizer', async () => {
      const nativeError = new Error('Native permission check failed');
      nativeError.name = 'PermissionDeniedException';
      mockNativeModule.hasPermission.mockRejectedValue(nativeError);
      await expect(permissionManager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: 'Native permission check failed',
      });
    });

    it('errors from requestPermission should be normalized via ErrorNormalizer', async () => {
      const requestError = new Error('Permission request failed');
      mockRequestPermissionFn.mockRejectedValue(requestError);
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
        message: 'Permission request failed',
      });
    });
  });

  describe('E - Exception Cases (Error Handling)', () => {
    it('hasPermission should throw PERMISSION_CHECK_FAILED when native module is null', async () => {
      const manager = new PermissionManager(null as any, mockRequestPermissionFn);
      await expect(manager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: expect.stringContaining('native module is undefined'),
      });
    });

    it('hasPermission should throw PERMISSION_CHECK_FAILED when native module throws', async () => {
      const nativeError = new Error('Native error');
      mockNativeModule.hasPermission.mockRejectedValue(nativeError);
      await expect(permissionManager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: 'Native error',
        details: nativeError,
      });
    });

    it('hasPermission should preserve error details from native module', async () => {
      const nativeError = { code: 'CUSTOM_ERROR', message: 'Custom error', extra: 'data' };
      mockNativeModule.hasPermission.mockRejectedValue(nativeError);
      const error = await permissionManager.hasPermission().catch((e) => e);
      expect(error.details).toBe(nativeError);
    });

    it('requestPermission should throw PERMISSION_REQUEST_FAILED when requestPermissionFn throws', async () => {
      const requestError = new Error('Request failed');
      mockRequestPermissionFn.mockRejectedValue(requestError);
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
        message: 'Request failed',
        details: requestError,
      });
    });

    it('requestPermission should preserve error details from requestPermissionFn', async () => {
      const requestError = { code: 'CUSTOM_ERROR', message: 'Custom error', extra: 'data' };
      mockRequestPermissionFn.mockRejectedValue(requestError);
      const error = await permissionManager.requestPermission().catch((e) => e);
      expect(error.details).toBe(requestError);
    });

    it('hasPermission should handle Error object from native module', async () => {
      const error = new Error('Permission check error');
      mockNativeModule.hasPermission.mockRejectedValue(error);
      await expect(permissionManager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: 'Permission check error',
        details: error,
      });
    });

    it('requestPermission should handle Error object from requestPermissionFn', async () => {
      const error = new Error('Permission request error');
      mockRequestPermissionFn.mockRejectedValue(error);
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
        message: 'Permission request error',
        details: error,
      });
    });

    it('hasPermission should handle string error from native module', async () => {
      mockNativeModule.hasPermission.mockRejectedValue('String error');
      await expect(permissionManager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
        message: 'String error',
      });
    });

    it('requestPermission should handle string error from requestPermissionFn', async () => {
      mockRequestPermissionFn.mockRejectedValue('String error');
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
        message: 'String error',
      });
    });

    it('hasPermission should handle null error from native module', async () => {
      mockNativeModule.hasPermission.mockRejectedValue(null);
      await expect(permissionManager.hasPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_CHECK_FAILED,
      });
    });

    it('requestPermission should handle null error from requestPermissionFn', async () => {
      mockRequestPermissionFn.mockRejectedValue(null);
      await expect(permissionManager.requestPermission()).rejects.toMatchObject({
        code: ErrorCode.PERMISSION_REQUEST_FAILED,
      });
    });
  });
});
