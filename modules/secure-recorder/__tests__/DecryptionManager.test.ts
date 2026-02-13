/**
 * Tests for DecryptionManager using ZOMBIES methodology.
 *
 * Z - Zero: Empty/null paths, missing files
 * O - One: Single successful stream operation (happy path)
 * M - Many: Multiple stream calls, concurrent operations
 * B - Boundary: Very long paths, non-existent files, corrupted files
 * I - Interface: Verify native module calls, error normalization
 * E - Exceptions: All decryption failure scenarios
 */

import { DecryptionManager } from '../src/DecryptionManager';
import { ErrorCode } from '../src/ErrorCode';
import type { NativeRecorderModule } from '../src/Type';

describe('DecryptionManager', () => {
    let mockNativeModule: jest.Mocked<NativeRecorderModule>;
    let decryptionManager: DecryptionManager;

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

        decryptionManager = new DecryptionManager(mockNativeModule);
    });

    describe('Z - Zero Cases (Empty/Null/Missing Data)', () => {
        it('stream should handle empty string path', async () => {
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream('');
            expect(mockNativeModule.stream).toHaveBeenCalledWith('');
        });

        it('stream should handle null path (if TypeScript allows)', async () => {
            // TypeScript should prevent this, but test runtime behavior
            // Native module might reject or throw with null path
            mockNativeModule.stream.mockRejectedValue(new Error('Invalid path'));
            await expect(decryptionManager.stream(null as any)).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
            });
        });

        it('stream should handle undefined path (if TypeScript allows)', async () => {
            // Note: TypeScript should prevent undefined, but test runtime behavior
            // If native module rejects with undefined, it should be normalized
            mockNativeModule.stream.mockRejectedValue(undefined);
            await expect(decryptionManager.stream(undefined as any)).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
            });
        });

        it('stream should handle whitespace-only path', async () => {
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream('   ');
            expect(mockNativeModule.stream).toHaveBeenCalledWith('   ');
        });
    });

    describe('O - One Cases (Happy Path)', () => {
        it('stream should successfully call native module', async () => {
            const filePath = '/path/to/encrypted.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(filePath);
            expect(mockNativeModule.stream).toHaveBeenCalledTimes(1);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(filePath);
        });

        it('stream should resolve when native module resolves', async () => {
            const filePath = '/path/to/encrypted.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await expect(decryptionManager.stream(filePath)).resolves.toBeUndefined();
        });

        it('stream should handle successful decryption start', async () => {
            const filePath = '/tmp/session-123.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            const result = await decryptionManager.stream(filePath);
            expect(result).toBeUndefined();
            expect(mockNativeModule.stream).toHaveBeenCalledWith(filePath);
        });
    });

    describe('M - Many Cases (Multiple Calls, Concurrent Operations)', () => {
        it('should handle multiple stream calls sequentially', async () => {
            const paths = ['/path1.dat', '/path2.dat', '/path3.dat'];
            mockNativeModule.stream.mockResolvedValue(undefined);

            for (const path of paths) {
                await decryptionManager.stream(path);
            }

            expect(mockNativeModule.stream).toHaveBeenCalledTimes(3);
            expect(mockNativeModule.stream).toHaveBeenNthCalledWith(1, '/path1.dat');
            expect(mockNativeModule.stream).toHaveBeenNthCalledWith(2, '/path2.dat');
            expect(mockNativeModule.stream).toHaveBeenNthCalledWith(3, '/path3.dat');
        });

        it('should handle concurrent stream calls', async () => {
            const paths = ['/path1.dat', '/path2.dat', '/path3.dat'];
            mockNativeModule.stream.mockResolvedValue(undefined);

            const promises = paths.map((path) => decryptionManager.stream(path));
            await Promise.all(promises);

            expect(mockNativeModule.stream).toHaveBeenCalledTimes(3);
            expect(mockNativeModule.stream).toHaveBeenCalledWith('/path1.dat');
            expect(mockNativeModule.stream).toHaveBeenCalledWith('/path2.dat');
            expect(mockNativeModule.stream).toHaveBeenCalledWith('/path3.dat');
        });

        it('should handle same path streamed multiple times', async () => {
            const path = '/same/path.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);

            await decryptionManager.stream(path);
            await decryptionManager.stream(path);
            await decryptionManager.stream(path);

            expect(mockNativeModule.stream).toHaveBeenCalledTimes(3);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(path);
        });
    });

    describe('B - Boundary Cases (Edge Cases)', () => {
        it('stream should handle very long file path', async () => {
            const longPath = `/very/long/path/${'a'.repeat(1000)}.dat`;
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(longPath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(longPath);
        });

        it('stream should handle path with special characters', async () => {
            const specialPath = '/path with spaces/file-name (1).dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(specialPath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(specialPath);
        });

        it('stream should handle path with unicode characters', async () => {
            const unicodePath = '/path/测试/файл.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(unicodePath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(unicodePath);
        });

        it('stream should handle relative path', async () => {
            const relativePath = './encrypted.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(relativePath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(relativePath);
        });

        it('stream should handle absolute path', async () => {
            const absolutePath = '/absolute/path/to/file.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(absolutePath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(absolutePath);
        });

        it('stream should handle path without extension', async () => {
            const noExtPath = '/path/to/file';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(noExtPath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(noExtPath);
        });

        it('stream should handle path with different extension', async () => {
            const differentExtPath = '/path/to/file.enc';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(differentExtPath);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(differentExtPath);
        });
    });

    describe('I - Interface Cases (Mock Verification)', () => {
        it('stream should call nativeModule.stream() with correct path', async () => {
            const filePath = '/path/to/encrypted.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(filePath);
            expect(mockNativeModule.stream).toHaveBeenCalledTimes(1);
            expect(mockNativeModule.stream).toHaveBeenCalledWith(filePath);
        });

        it('stream should not call other native module methods', async () => {
            const filePath = '/path/to/encrypted.dat';
            mockNativeModule.stream.mockResolvedValue(undefined);
            await decryptionManager.stream(filePath);
            expect(mockNativeModule.startRecording).not.toHaveBeenCalled();
            expect(mockNativeModule.stopRecording).not.toHaveBeenCalled();
            expect(mockNativeModule.getStatus).not.toHaveBeenCalled();
            expect(mockNativeModule.hasPermission).not.toHaveBeenCalled();
        });

        it('errors should be normalized via ErrorNormalizer', async () => {
            const error = new Error('Decryption failed');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Decryption failed',
                details: error,
            });
        });

        it('error details should be preserved from native module', async () => {
            const error = { code: 'CUSTOM_ERROR', message: 'Custom error', extra: 'data' };
            mockNativeModule.stream.mockRejectedValue(error);
            const thrownError = await decryptionManager.stream('/path.dat').catch((e) => e);
            expect(thrownError.details).toBe(error);
        });
    });

    describe('E - Exception Cases (Error Handling)', () => {
        it('stream should throw DECRYPTION_FAILED when native module throws', async () => {
            const error = new Error('Native decryption error');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Native decryption error',
                details: error,
            });
        });

        it('stream should preserve error message from native module', async () => {
            const error = new Error('File not found');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/nonexistent.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'File not found',
            });
        });

        it('stream should preserve error details from native module', async () => {
            const error = new Error('Corrupted file');
            error.name = 'DecryptionException';
            mockNativeModule.stream.mockRejectedValue(error);
            const thrownError = await decryptionManager.stream('/corrupted.dat').catch((e) => e);
            expect(thrownError.details).toBe(error);
        });

        it('stream should handle Error object from native module', async () => {
            const error = new Error('Decryption error');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Decryption error',
                details: error,
            });
        });

        it('stream should handle string error from native module', async () => {
            mockNativeModule.stream.mockRejectedValue('String error');
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'String error',
            });
        });

        it('stream should handle null error from native module', async () => {
            mockNativeModule.stream.mockRejectedValue(null);
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
            });
        });

        it('stream should handle undefined error from native module', async () => {
            mockNativeModule.stream.mockRejectedValue(undefined);
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
            });
        });

        it('stream should handle error with code property from native module', async () => {
            const error = { code: 'CUSTOM_DECRYPTION_ERROR', message: 'Custom error' };
            mockNativeModule.stream.mockRejectedValue(error);
            // DecryptionManager uses createError which does: error instanceof Error ? error.message : String(error)
            // Since error is a plain object, String(error) becomes "[object Object]"
            await expect(decryptionManager.stream('/path.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: '[object Object]', // Plain objects are stringified
            });
        });

        it('stream should handle non-existent file path error', async () => {
            const error = new Error('File not found: /nonexistent.dat');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/nonexistent.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'File not found: /nonexistent.dat',
            });
        });

        it('stream should handle corrupted file error', async () => {
            const error = new Error('Invalid encryption format');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/corrupted.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Invalid encryption format',
            });
        });

        it('stream should handle permission error during decryption', async () => {
            const error = new Error('Permission denied: cannot read file');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/protected.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Permission denied: cannot read file',
            });
        });

        it('stream should handle timeout error', async () => {
            const error = new Error('Decryption timeout');
            mockNativeModule.stream.mockRejectedValue(error);
            await expect(decryptionManager.stream('/large.dat')).rejects.toMatchObject({
                code: ErrorCode.DECRYPTION_FAILED,
                message: 'Decryption timeout',
            });
        });
    });
});
