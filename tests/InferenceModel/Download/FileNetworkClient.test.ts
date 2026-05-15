/**
 * FileNetworkClient tests.
 *
 * ZOMBIES methodology:
 * Z - Zero: 0 bytes, null responses
 * O - One: Single range fetch success
 * M - Many: Multiple sequential fetches
 * B - Boundary: Start/end byte edge cases
 * I - Interface: Verify headers, URL construction
 * E - Exceptions: Error handling for 200, 4xx, 5xx
 * S - Sequencing: Reentrancy, concurrent calls
 */

import { InferenceModelDownloaderException } from '@/Exception';
import { FileNetworkClient } from '@/InferenceModel/Download/FileNetworkClient';

// Mock fetch module
let mockFetch: jest.Mock;
jest.mock('expo/fetch', () => {
    mockFetch = jest.fn();
    return {
        fetch: mockFetch,
        Headers: jest.fn().mockImplementation(() => ({
            append: jest.fn(),
        })),
    };
});

describe('FileNetworkClient', () => {
    let client: FileNetworkClient;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new FileNetworkClient();
    });

    describe('fetchRange', () => {
        describe('Z - Zero Cases', () => {
            it('should handle zero-length range (start equals end)', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/file.bin', 0, 0, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toEqual([]);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://example.com/file.bin',
                    expect.objectContaining({ headers: expect.any(Object) }),
                );
            });

            it('should handle single byte range', async () => {
                const reader = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: new Uint8Array([42]) })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/file.bin', 5, 5, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toEqual([new Uint8Array([42])]);
                expect(receivedChunks[0]).toHaveLength(1);
                expect(receivedChunks[0][0]).toBe(42);
            });

            it('should return empty Uint8Array for empty response', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '0' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/empty.bin', 0, 0, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toEqual([]);
                expect(receivedChunks).toHaveLength(0);
            });
        });

        describe('O - One Cases (Happy Path)', () => {
            it('should successfully fetch a range and return bytes', async () => {
                const chunkData = new Uint8Array([1, 2, 3, 4, 5]);
                const reader = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2]) })
                        .mockResolvedValueOnce({ done: false, value: new Uint8Array([3, 4, 5]) })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '5' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/model.onnx', 0, 4, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toEqual([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]);
                expect(reader.releaseLock).toHaveBeenCalled();
            });

            it('should include Range header in request', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '100' },
                    body: { getReader: () => reader },
                });

                await client.fetchRange('https://example.com/file.bin', 1000, 1999, () => {});

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://example.com/file.bin',
                    expect.objectContaining({
                        headers: expect.any(Object),
                    }),
                );
            });
        });

        describe('M - Many Cases (Multiple Operations)', () => {
            it('should handle sequential range requests', async () => {
                const chunk1 = new Uint8Array([1, 2, 3]);
                const chunk2 = new Uint8Array([4, 5, 6]);
                const chunk3 = new Uint8Array([7, 8, 9]);

                const reader1 = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: chunk1 })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader2 = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: chunk2 })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader3 = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: chunk3 })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };

                mockFetch
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        body: { getReader: () => reader1 },
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        body: { getReader: () => reader2 },
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        body: { getReader: () => reader3 },
                    });

                const result1: Uint8Array[] = [];
                const result2: Uint8Array[] = [];
                const result3: Uint8Array[] = [];
                await client.fetchRange('https://example.com/file.bin', 0, 2, (chunk) => result1.push(chunk));
                await client.fetchRange('https://example.com/file.bin', 3, 5, (chunk) => result2.push(chunk));
                await client.fetchRange('https://example.com/file.bin', 6, 8, (chunk) => result3.push(chunk));

                expect(result1).toEqual([chunk1]);
                expect(result2).toEqual([chunk2]);
                expect(result3).toEqual([chunk3]);
                expect(mockFetch).toHaveBeenCalledTimes(3);
            });
        });

        describe('B - Boundary Cases', () => {
            it('should handle large starting byte value', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '5' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange(
                    'https://example.com/large.bin',
                    Number.MAX_SAFE_INTEGER - 10,
                    Number.MAX_SAFE_INTEGER - 6,
                    (chunk) => receivedChunks.push(chunk),
                );

                expect(receivedChunks).toEqual([]);
            });

            it('should handle very small file at boundary', async () => {
                const reader = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: new Uint8Array([255]) })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/single-byte.bin', 0, 0, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toHaveLength(1);
                expect(receivedChunks[0]).toHaveLength(1);
                expect(receivedChunks[0][0]).toBe(255);
            });

            it('should handle large chunk sizes at boundary', async () => {
                const largeChunk = new Uint8Array(10 * 1024 * 1024);
                const reader = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: largeChunk })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => String(largeChunk.length) },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetchRange('https://example.com/large.bin', 0, 10 * 1024 * 1024 - 1, (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks[0]).toHaveLength(10 * 1024 * 1024);
            });
        });

        describe('E - Exceptions (Error Handling)', () => {
            it('should throw InferenceModelDownloaderException when server returns 200 OK', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => '10485760' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 1023, () => {})).rejects.toThrow('Server ignored Range header');
            });

            it('should throw for 400 Bad Request', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 400,
                    statusText: 'Bad Request',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100, () => {})).rejects.toThrow('400');
            });

            it('should throw for 401 Unauthorized', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100, () => {})).rejects.toThrow('401');
            });

            it('should throw for 404 Not Found', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/nonexistent.bin', 0, 100, () => {})).rejects.toThrow('404');
            });

            it('should throw for 500 Internal Server Error', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100, () => {})).rejects.toThrow('500');
            });

            it('should throw when fetch throws network error', async () => {
                mockFetch.mockRejectedValue(new Error('Network is unreachable'));

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100, () => {})).rejects.toThrow('Network is unreachable');
            });

            it('should throw when fetch throws timeout', async () => {
                mockFetch.mockRejectedValue(new Error('Request timeout'));

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100, () => {})).rejects.toThrow('Request timeout');
            });

            it('should include content-length in error message when server returns 200', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => '52428800' },
                });

                await expect(client.fetchRange('https://example.com/large.bin', 0, 1023, () => {})).rejects.toThrow('52428800');
            });

            it('should handle unknown content-length in error message', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => null as unknown as string },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 1023, () => {})).rejects.toThrow('unknown');
            });
        });

        describe('I - Interface Verification', () => {
            it('should pass correct URL to fetch', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '10' },
                    body: { getReader: () => reader },
                });

                await client.fetchRange('https://cdn.example.com/models/vad.onnx', 1024, 2048, () => {});

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://cdn.example.com/models/vad.onnx',
                    expect.any(Object),
                );
            });
        });

        describe('S - Sequencing and Reentrancy', () => {
            it('should handle concurrent requests', async () => {
                const reader1 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader2 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader3 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };

                mockFetch
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        body: { getReader: () => reader1 },
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        body: { getReader: () => reader2 },
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        body: { getReader: () => reader3 },
                    });

                const promises = [
                    client.fetchRange('https://example.com/file.bin', 0, 9, () => {}),
                    client.fetchRange('https://example.com/file.bin', 10, 19, () => {}),
                    client.fetchRange('https://example.com/file.bin', 20, 29, () => {}),
                ];

                await Promise.all(promises);

                expect(mockFetch).toHaveBeenCalledTimes(3);
            });

            it('should maintain request order', async () => {
                const callOrder: number[] = [];
                let resolveCount = 0;

                mockFetch.mockImplementation(() => {
                    const idx = resolveCount++;
                    callOrder.push(idx);
                    const reader = {
                        read: jest.fn().mockResolvedValue({ done: true }),
                        releaseLock: jest.fn(),
                    };
                    return Promise.resolve({
                        status: 206,
                        headers: { get: () => '10' },
                        body: { getReader: () => reader },
                    });
                });

                await client.fetchRange('https://example.com/file.bin', 0, 9, () => {});
                await client.fetchRange('https://example.com/file.bin', 10, 19, () => {});
                await client.fetchRange('https://example.com/file.bin', 20, 29, () => {});

                expect(callOrder).toEqual([0, 1, 2]);
            });
        });
    });

    describe('fetch', () => {
        describe('O - One Cases (Happy Path)', () => {
            it('should successfully fetch a full file and return bytes', async () => {
                const fileData = new Uint8Array([1, 2, 3, 4, 5]);
                const reader = {
                    read: jest.fn()
                        .mockResolvedValueOnce({ done: false, value: fileData })
                        .mockResolvedValueOnce({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    headers: { get: jest.fn() },
                    body: { getReader: () => reader },
                });

                const receivedChunks: Uint8Array[] = [];
                await client.fetch('https://example.com/model.onnx', (chunk) => {
                    receivedChunks.push(chunk);
                });

                expect(receivedChunks).toEqual([fileData]);
                expect(mockFetch).toHaveBeenCalledTimes(1);
            });

            it('should make a simple GET request without headers', async () => {
                const reader = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    ok: true,
                    headers: { get: jest.fn() },
                    body: { getReader: () => reader },
                });

                await client.fetch('https://example.com/file.bin', () => {});

                expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.bin');
            });
        });

        describe('E - Exceptions (Error Handling)', () => {
            it('should throw for 400 Bad Request', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 400,
                    statusText: 'Bad Request',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/file.bin', () => {})).rejects.toThrow('400');
            });

            it('should throw for 401 Unauthorized', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 401,
                    statusText: 'Unauthorized',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/file.bin', () => {})).rejects.toThrow('401');
            });

            it('should throw for 404 Not Found', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/nonexistent.bin', () => {})).rejects.toThrow('404');
            });

            it('should throw for 500 Internal Server Error', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 500,
                    statusText: 'Internal Server Error',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/file.bin', () => {})).rejects.toThrow('500');
            });

            it('should throw when fetch throws network error', async () => {
                mockFetch.mockRejectedValue(new Error('Network is unreachable'));

                await expect(client.fetch('https://example.com/file.bin', () => {})).rejects.toThrow('Network is unreachable');
            });

            it('should include URL in error message', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/missing.bin', () => {})).rejects.toThrow('https://example.com/missing.bin');
            });
        });

        describe('S - Sequencing and Reentrancy', () => {
            it('should handle concurrent full file requests', async () => {
                const reader1 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader2 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };
                const reader3 = {
                    read: jest.fn().mockResolvedValue({ done: true }),
                    releaseLock: jest.fn(),
                };

                mockFetch
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        headers: { get: jest.fn() },
                        body: { getReader: () => reader1 },
                    })
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        headers: { get: jest.fn() },
                        body: { getReader: () => reader2 },
                    })
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        headers: { get: jest.fn() },
                        body: { getReader: () => reader3 },
                    });

                const promises = [
                    client.fetch('https://example.com/file1.bin', () => {}),
                    client.fetch('https://example.com/file2.bin', () => {}),
                    client.fetch('https://example.com/file3.bin', () => {}),
                ];

                await Promise.all(promises);

                expect(mockFetch).toHaveBeenCalledTimes(3);
            });
        });
    });
});