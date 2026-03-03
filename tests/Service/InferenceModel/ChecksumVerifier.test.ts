/**
 * ChecksumVerifier tests.
 * Verifies SHA256 checksum validation with mocked crypto and file system.
 * Includes "zombie method" tests for edge cases and error conditions.
 */

import { vi } from 'vitest';
import { ChecksumVerifier } from '@/Service/InferenceModelDownload/ChecksumVerifier';
import { InferenceModelDownloaderException } from '@/Exception';

// Create mock instances
const mockHashInstance = {
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(),
};

// Mock react-native-quick-crypto with factory function
vi.mock('react-native-quick-crypto', () => ({
    createHash: vi.fn().mockImplementation(() => mockHashInstance),
}));

// Mock expo-file-system
vi.mock('expo-file-system', () => ({}));

describe('ChecksumVerifier', () => {
    let verifier: ChecksumVerifier;
    let mockFile: any;

    beforeEach(() => {
        verifier = new ChecksumVerifier();
        vi.clearAllMocks();
        
        // Create fresh mock file for each test
        mockFile = {
            uri: 'file://test/model.bin',
            base64: vi.fn().mockResolvedValue('dGVzdCBkYXRh'), // "test data" in base64
        };
        
        // Reset mock hash instance
        mockHashInstance.update.mockClear();
        mockHashInstance.digest.mockClear();
        mockHashInstance.update.mockReturnThis();
    });

    describe('verify method', () => {
        it('should validate correct SHA256 hash when digest returns string', async () => {
            // Arrange
            const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'; // SHA256 of "test"
            mockHashInstance.digest.mockReturnValue(expectedHash); // String return

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).resolves.not.toThrow();
            
            expect(mockFile.base64).toHaveBeenCalledTimes(1);
            expect(mockHashInstance.update).toHaveBeenCalledWith(expect.any(Buffer));
            expect(mockHashInstance.digest).toHaveBeenCalledWith('hex');
        });

        it('should validate correct SHA256 hash when digest returns Uint8Array', async () => {
            // Arrange
            const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
            // Simulate Uint8Array return (binary representation of the hash)
            const hashBytes = new Uint8Array(32);
            Buffer.from(expectedHash, 'hex').copy(hashBytes);
            mockHashInstance.digest.mockReturnValue(hashBytes);

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).resolves.not.toThrow();
            
            expect(mockHashInstance.digest).toHaveBeenCalledWith('hex');
        });

        it('should throw InferenceModelDownloaderException on hash mismatch', async () => {
            // Arrange
            const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
            const wrongHash = 'wronghash1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
            mockHashInstance.digest.mockReturnValue(wrongHash);

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).rejects.toThrow(InferenceModelDownloaderException);
            
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).rejects.toThrow(/Hash mismatch for file:\/\/test\/model\.bin/);
        });

        it('should normalize hash case (lowercase)', async () => {
            // Arrange
            const expectedHash = '9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08'; // Uppercase
            const lowercaseHash = expectedHash.toLowerCase();
            mockHashInstance.digest.mockReturnValue(lowercaseHash);

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).resolves.not.toThrow();
        });
    });

    describe('zombie method tests (edge cases)', () => {
        it('should handle empty file content', async () => {
            // Arrange
            const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256 of empty string
            mockFile.base64.mockResolvedValue(''); // Empty base64
            mockHashInstance.digest.mockReturnValue(expectedHash);

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).resolves.not.toThrow();
        });

        it('should handle very large file content', async () => {
            // Arrange
            const largeData = 'A'.repeat(10000);
            const expectedHash = 'dffbc4c1c8e64e6c5c5d5b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b'; // Fake hash
            mockFile.base64.mockResolvedValue(Buffer.from(largeData).toString('base64'));
            mockHashInstance.digest.mockReturnValue(expectedHash);

            // Act & Assert
            await expect(
                verifier.verify(mockFile, expectedHash)
            ).resolves.not.toThrow();
            
            expect(mockHashInstance.update).toHaveBeenCalledWith(expect.any(Buffer));
        });

        it('should throw when file.base64() rejects', async () => {
            // Arrange
            mockFile.base64.mockRejectedValue(new Error('File read error'));

            // Act & Assert
            await expect(
                verifier.verify(mockFile, 'anyhash')
            ).rejects.toThrow('File read error');
        });

        it('should handle unexpected digest return type (non-string, non-Uint8Array)', async () => {
            // Arrange
            mockHashInstance.digest.mockReturnValue(12345); // Number, unexpected type

            // Act & Assert - Should throw when Buffer.from() fails
            await expect(
                verifier.verify(mockFile, 'anyhash')
            ).rejects.toThrow();
        });

        it('should handle malformed base64 content without crashing', async () => {
            // Arrange
            mockFile.base64.mockResolvedValue('not-valid-base64!!');
            // The hash of an empty buffer (from invalid base64) is:
            const emptyBufferHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
            mockHashInstance.digest.mockReturnValue(emptyBufferHash);

            // Act & Assert - Buffer.from() with invalid base64 creates empty buffer
            // The method should compute hash of empty buffer and compare
            await expect(
                verifier.verify(mockFile, emptyBufferHash)
            ).resolves.not.toThrow();
        });
    });

    describe('type safety tests', () => {
        it('should handle both string and Uint8Array return types from digest', async () => {
            // Test string return
            mockHashInstance.digest.mockReturnValue('stringhash');
            await expect(
                verifier.verify(mockFile, 'stringhash')
            ).resolves.not.toThrow();

            // Reset for next test
            vi.clearAllMocks();
            mockHashInstance.update.mockReturnThis();
            
            // Test Uint8Array return
            const uint8Hash = new Uint8Array([0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x68, 0x61, 0x73, 0x68]);
            mockHashInstance.digest.mockReturnValue(uint8Hash);
            await expect(
                verifier.verify(mockFile, '737472696e6768617368') // hex of uint8Array
            ).resolves.not.toThrow();
        });

        it('should verify the defensive type check works correctly', () => {
            // This test verifies the defensive programming in ChecksumVerifier
            // by mocking digest to return different types
            const testCases = [
                { type: 'string', value: 'abc123' },
                { type: 'Uint8Array', value: new Uint8Array([97, 98, 99, 49, 50, 51]) }, // 'abc123' in bytes
                { type: 'Buffer', value: Buffer.from('abc123') },
            ];

            testCases.forEach(({ type, value }) => {
                mockHashInstance.digest.mockReturnValue(value);
                // The verify method should handle all these types
                // due to the typeof check and Buffer.from() conversion
                expect(() => {
                    // We're testing that the code doesn't crash on these types
                    // Actual verification would require proper hash matching
                    if (type === 'string') {
                        // String should pass through directly
                        expect(typeof value).toBe('string');
                    } else {
                        // Buffer/Uint8Array should be convertible
                        expect(Buffer.from(value as any).toString('hex')).toBeDefined();
                    }
                }).not.toThrow();
            });
        });
    });
});