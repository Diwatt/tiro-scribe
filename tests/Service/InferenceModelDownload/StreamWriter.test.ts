/**
 * Tests for StreamWriter using ZOMBIES methodology.
 *
 * Z - Zero: Empty data, uninitialized writer
 * O - One: Single write operation (happy path)
 * M - Many: Multiple write calls, large data chunks
 * B - Boundary: Very large chunks, zero-length arrays
 * I - Interface: Verify File API calls, writer lifecycle
 * E - Exceptions: Write before initialize, double close, lock errors
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StreamWriter } from '@/Service/InferenceModelDownload/StreamWriter';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';

describe('StreamWriter', () => {
    let mockWriter: any;
    let mockWritableStream: any;
    let mockFile: any;
    let streamWriter: StreamWriter;

    beforeEach(() => {
        mockWriter = {
            write: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            releaseLock: vi.fn(),
        };

        mockWritableStream = {
            getWriter: vi.fn().mockReturnValue(mockWriter),
        };

        mockFile = {
            uri: 'file:///test/download.bin',
            writableStream: vi.fn().mockReturnValue(mockWritableStream),
        };

        streamWriter = new StreamWriter(mockFile);
    });

    describe('Z - Zero Cases (Empty/Uninitialized)', () => {
        it('should throw InferenceModelDownloaderException when writing before initialization', async () => {
            const data = new Uint8Array([1, 2, 3]);
            await expect(streamWriter.write(data)).rejects.toThrow(InferenceModelDownloaderException);
            await expect(streamWriter.write(data)).rejects.toThrow('StreamWriter not initialized');
        });

        it('should handle write with empty Uint8Array after initialization', async () => {
            await streamWriter.initialize();
            const emptyData = new Uint8Array(0);
            await streamWriter.write(emptyData);
            expect(mockWriter.write).toHaveBeenCalledWith(emptyData);
        });

        it('should handle close when writer is not initialized', async () => {
            await streamWriter.close();
            expect(mockWriter.close).not.toHaveBeenCalled();
        });

        it('should handle release when writer is not initialized', async () => {
            await streamWriter.release();
            expect(mockWriter.releaseLock).not.toHaveBeenCalled();
        });
    });

    describe('O - One Cases (Happy Path)', () => {
        it('should successfully initialize writer', async () => {
            await streamWriter.initialize();
            expect(mockFile.writableStream).toHaveBeenCalledTimes(1);
            expect(mockWritableStream.getWriter).toHaveBeenCalledTimes(1);
        });

        it('should successfully write single chunk', async () => {
            await streamWriter.initialize();
            const data = new Uint8Array([1, 2, 3, 4, 5]);
            await streamWriter.write(data);
            expect(mockWriter.write).toHaveBeenCalledTimes(1);
            expect(mockWriter.write).toHaveBeenCalledWith(data);
        });

        it('should successfully close writer', async () => {
            await streamWriter.initialize();
            await streamWriter.close();
            expect(mockWriter.close).toHaveBeenCalledTimes(1);
        });

        it('should successfully release writer lock', async () => {
            await streamWriter.initialize();
            await streamWriter.release();
            expect(mockWriter.releaseLock).toHaveBeenCalledTimes(1);
        });
    });

    describe('M - Many Cases (Multiple Operations)', () => {
        it('should handle multiple write calls sequentially', async () => {
            await streamWriter.initialize();
            const chunk1 = new Uint8Array([1, 2, 3]);
            const chunk2 = new Uint8Array([4, 5, 6]);
            const chunk3 = new Uint8Array([7, 8, 9]);

            await streamWriter.write(chunk1);
            await streamWriter.write(chunk2);
            await streamWriter.write(chunk3);

            expect(mockWriter.write).toHaveBeenCalledTimes(3);
            expect(mockWriter.write).toHaveBeenNthCalledWith(1, chunk1);
            expect(mockWriter.write).toHaveBeenNthCalledWith(2, chunk2);
            expect(mockWriter.write).toHaveBeenNthCalledWith(3, chunk3);
        });

        it('should handle many small writes', async () => {
            await streamWriter.initialize();
            const chunkCount = 100;

            for (let i = 0; i < chunkCount; i++) {
                await streamWriter.write(new Uint8Array([i % 256]));
            }

            expect(mockWriter.write).toHaveBeenCalledTimes(chunkCount);
        });

        it('should handle close after multiple writes', async () => {
            await streamWriter.initialize();
            await streamWriter.write(new Uint8Array([1]));
            await streamWriter.write(new Uint8Array([2]));
            await streamWriter.close();

            expect(mockWriter.write).toHaveBeenCalledTimes(2);
            expect(mockWriter.close).toHaveBeenCalledTimes(1);
        });
    });

    describe('B - Boundary Cases (Edge Cases)', () => {
        it('should handle very large chunk', async () => {
            await streamWriter.initialize();
            const largeChunk = new Uint8Array(1024 * 1024); // 1 MB
            largeChunk.fill(0xFF);

            await streamWriter.write(largeChunk);
            expect(mockWriter.write).toHaveBeenCalledWith(largeChunk);
        }, 10000);

        it('should handle zero-length Uint8Array', async () => {
            await streamWriter.initialize();
            const emptyChunk = new Uint8Array(0);

            await streamWriter.write(emptyChunk);
            expect(mockWriter.write).toHaveBeenCalledWith(emptyChunk);
        });

        it('should handle single byte write', async () => {
            await streamWriter.initialize();
            const singleByte = new Uint8Array([255]);

            await streamWriter.write(singleByte);
            expect(mockWriter.write).toHaveBeenCalledWith(singleByte);
        });

        it('should handle maximum Uint8 values', async () => {
            await streamWriter.initialize();
            const maxValues = new Uint8Array([255, 255, 255]);

            await streamWriter.write(maxValues);
            expect(mockWriter.write).toHaveBeenCalledWith(maxValues);
        });
    });

    describe('I - Interface Cases (File API Contract)', () => {
        it('should call File.writableStream() during initialization', async () => {
            await streamWriter.initialize();
            expect(mockFile.writableStream).toHaveBeenCalledTimes(1);
        });

        it('should call getWriter() on writable stream', async () => {
            await streamWriter.initialize();
            expect(mockWritableStream.getWriter).toHaveBeenCalledTimes(1);
        });

        it('should call write() on writer with Uint8Array', async () => {
            await streamWriter.initialize();
            const data = new Uint8Array([10, 20, 30]);
            await streamWriter.write(data);
            expect(mockWriter.write).toHaveBeenCalledWith(data);
        });

        it('should call close() on writer', async () => {
            await streamWriter.initialize();
            await streamWriter.close();
            expect(mockWriter.close).toHaveBeenCalledTimes(1);
        });

        it('should call releaseLock() on writer', async () => {
            await streamWriter.initialize();
            await streamWriter.release();
            expect(mockWriter.releaseLock).toHaveBeenCalledTimes(1);
        });

        it('should maintain writer reference after initialization', async () => {
            await streamWriter.initialize();
            const data = new Uint8Array([1]);
            
            await streamWriter.write(data);
            await streamWriter.write(data);
            
            // Same writer instance should be used
            expect(mockWriter.write).toHaveBeenCalledTimes(2);
        });
    });

    describe('E - Exception Cases (Error Handling)', () => {
        it('should throw InferenceModelDownloaderException when writing to uninitialized writer', async () => {
            const data = new Uint8Array([1, 2, 3]);
            await expect(streamWriter.write(data)).rejects.toThrow(InferenceModelDownloaderException);
            await expect(streamWriter.write(data)).rejects.toThrow('StreamWriter not initialized');
        });

        it('should propagate write errors from native writer', async () => {
            await streamWriter.initialize();
            mockWriter.write.mockRejectedValue(new Error('Write failed'));

            const data = new Uint8Array([1, 2, 3]);
            await expect(streamWriter.write(data)).rejects.toThrow('Write failed');
        });

        it('should propagate close errors from native writer', async () => {
            await streamWriter.initialize();
            mockWriter.close.mockRejectedValue(new Error('Close failed'));

            await expect(streamWriter.close()).rejects.toThrow('Close failed');
        });

        it('should silently ignore releaseLock errors', async () => {
            await streamWriter.initialize();
            mockWriter.releaseLock.mockImplementation(() => {
                throw new Error('Lock already released');
            });

            await expect(streamWriter.release()).resolves.toBeUndefined();
        });

        it('should throw when writableStream getter throws', async () => {
            mockFile.writableStream.mockImplementation(() => {
                throw new Error('Stream unavailable');
            });

            await expect(streamWriter.initialize()).rejects.toThrow('Stream unavailable');
        });

        it('should throw when getWriter throws', async () => {
            mockWritableStream.getWriter.mockImplementation(() => {
                throw new Error('Writer unavailable');
            });

            await expect(streamWriter.initialize()).rejects.toThrow('Writer unavailable');
        });

        it('should handle multiple write failures', async () => {
            await streamWriter.initialize();
            mockWriter.write.mockRejectedValue(new Error('Write error'));

            await expect(streamWriter.write(new Uint8Array([1]))).rejects.toThrow('Write error');
            await expect(streamWriter.write(new Uint8Array([2]))).rejects.toThrow('Write error');
            
            expect(mockWriter.write).toHaveBeenCalledTimes(2);
        });

        it('should not throw when close is called multiple times', async () => {
            await streamWriter.initialize();
            await streamWriter.close();
            
            // Second close will call writer.close() again (implementation doesn't null writer)
            await expect(streamWriter.close()).resolves.toBeUndefined();
            expect(mockWriter.close).toHaveBeenCalledTimes(2);
        });

        it('should not throw when release is called multiple times', async () => {
            await streamWriter.initialize();
            await streamWriter.release();
            
            // Second release will call writer.releaseLock() again (implementation doesn't null writer)
            await expect(streamWriter.release()).resolves.toBeUndefined();
            expect(mockWriter.releaseLock).toHaveBeenCalledTimes(2);
        });
    });

    describe('S - Simple Cases (Lifecycle)', () => {
        it('should complete full lifecycle: initialize -> write -> close -> release', async () => {
            await streamWriter.initialize();
            expect(mockFile.writableStream).toHaveBeenCalled();

            await streamWriter.write(new Uint8Array([1, 2, 3]));
            expect(mockWriter.write).toHaveBeenCalled();

            await streamWriter.close();
            expect(mockWriter.close).toHaveBeenCalled();

            await streamWriter.release();
            expect(mockWriter.releaseLock).toHaveBeenCalled();
        });

        it('should allow release without close', async () => {
            await streamWriter.initialize();
            await streamWriter.write(new Uint8Array([1]));
            await streamWriter.release();

            expect(mockWriter.releaseLock).toHaveBeenCalled();
            expect(mockWriter.close).not.toHaveBeenCalled();
        });

        it('should handle constructor with valid File object', () => {
            const writer = new StreamWriter(mockFile);
            expect(writer).toBeInstanceOf(StreamWriter);
        });
    });
});
