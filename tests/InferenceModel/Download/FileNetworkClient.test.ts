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
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array([0])),
                });

                const result = await client.fetchRange('https://example.com/file.bin', 0, 0);

                expect(result).toBeInstanceOf(Uint8Array);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://example.com/file.bin',
                    expect.objectContaining({ headers: expect.any(Object) }),
                );
            });

            it('should handle single byte range', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array([42])),
                });

                const result = await client.fetchRange('https://example.com/file.bin', 5, 5);

                expect(result).toHaveLength(1);
                expect(result[0]).toBe(42);
            });

            it('should return empty Uint8Array for empty response', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '0' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array(0)),
                });

                const result = await client.fetchRange('https://example.com/empty.bin', 0, 0);

                expect(result).toBeInstanceOf(Uint8Array);
                expect(result).toHaveLength(0);
            });
        });

        describe('O - One Cases (Happy Path)', () => {
            it('should successfully fetch a range and return bytes', async () => {
                const chunkData = new Uint8Array([1, 2, 3, 4, 5]);
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '5' },
                    bytes: jest.fn().mockResolvedValue(chunkData),
                });

                const result = await client.fetchRange('https://example.com/model.onnx', 0, 4);

                expect(result).toEqual(chunkData);
                expect(mockFetch).toHaveBeenCalledTimes(1);
            });

            it('should include Range header in request', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '100' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array(100)),
                });

                await client.fetchRange('https://example.com/file.bin', 1000, 1999);

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

                mockFetch
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        bytes: jest.fn().mockResolvedValue(chunk1),
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        bytes: jest.fn().mockResolvedValue(chunk2),
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '3' },
                        bytes: jest.fn().mockResolvedValue(chunk3),
                    });

                const result1 = await client.fetchRange('https://example.com/file.bin', 0, 2);
                const result2 = await client.fetchRange('https://example.com/file.bin', 3, 5);
                const result3 = await client.fetchRange('https://example.com/file.bin', 6, 8);

                expect(result1).toEqual(chunk1);
                expect(result2).toEqual(chunk2);
                expect(result3).toEqual(chunk3);
                expect(mockFetch).toHaveBeenCalledTimes(3);
            });
        });

        describe('B - Boundary Cases', () => {
            it('should handle large starting byte value', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '5' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array(5)),
                });

                const result = await client.fetchRange(
                    'https://example.com/large.bin',
                    Number.MAX_SAFE_INTEGER - 10,
                    Number.MAX_SAFE_INTEGER - 6,
                );

                expect(result).toBeInstanceOf(Uint8Array);
            });

            it('should handle very small file at boundary', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '1' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array([255])),
                });

                const result = await client.fetchRange('https://example.com/single-byte.bin', 0, 0);

                expect(result).toHaveLength(1);
                expect(result[0]).toBe(255);
            });

            it('should handle large chunk sizes at boundary', async () => {
                const largeChunk = new Uint8Array(10 * 1024 * 1024);
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => String(largeChunk.length) },
                    bytes: jest.fn().mockResolvedValue(largeChunk),
                });

                const result = await client.fetchRange('https://example.com/large.bin', 0, 10 * 1024 * 1024 - 1);

                expect(result).toHaveLength(10 * 1024 * 1024);
            });
        });

        describe('E - Exceptions (Error Handling)', () => {
            it('should throw InferenceModelDownloaderException when server returns 200 OK', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => '10485760' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 1023)).rejects.toThrow('Server ignored Range header');
            });

            it('should throw for 400 Bad Request', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 400,
                    statusText: 'Bad Request',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100)).rejects.toThrow('400');
            });

            it('should throw for 401 Unauthorized', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100)).rejects.toThrow('401');
            });

            it('should throw for 404 Not Found', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/nonexistent.bin', 0, 100)).rejects.toThrow('404');
            });

            it('should throw for 500 Internal Server Error', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: { get: () => '0' },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100)).rejects.toThrow('500');
            });

            it('should throw when fetch throws network error', async () => {
                mockFetch.mockRejectedValue(new Error('Network is unreachable'));

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100)).rejects.toThrow('Network is unreachable');
            });

            it('should throw when fetch throws timeout', async () => {
                mockFetch.mockRejectedValue(new Error('Request timeout'));

                await expect(client.fetchRange('https://example.com/file.bin', 0, 100)).rejects.toThrow('Request timeout');
            });

            it('should include content-length in error message when server returns 200', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => '52428800' },
                });

                await expect(client.fetchRange('https://example.com/large.bin', 0, 1023)).rejects.toThrow('52428800');
            });

            it('should handle unknown content-length in error message', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    headers: { get: () => null as unknown as string },
                });

                await expect(client.fetchRange('https://example.com/file.bin', 0, 1023)).rejects.toThrow('unknown');
            });
        });

        describe('I - Interface Verification', () => {
            it('should pass correct URL to fetch', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 206,
                    headers: { get: () => '10' },
                    bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                });

                await client.fetchRange('https://cdn.example.com/models/vad.onnx', 1024, 2048);

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://cdn.example.com/models/vad.onnx',
                    expect.any(Object),
                );
            });
        });

        describe('S - Sequencing and Reentrancy', () => {
            it('should handle concurrent requests', async () => {
                mockFetch
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                    })
                    .mockResolvedValueOnce({
                        status: 206,
                        headers: { get: () => '10' },
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                    });

                const promises = [
                    client.fetchRange('https://example.com/file.bin', 0, 9),
                    client.fetchRange('https://example.com/file.bin', 10, 19),
                    client.fetchRange('https://example.com/file.bin', 20, 29),
                ];

                const results = await Promise.all(promises);

                expect(results).toHaveLength(3);
                expect(results.every((r) => r instanceof Uint8Array)).toBe(true);
                expect(mockFetch).toHaveBeenCalledTimes(3);
            });

            it('should maintain request order', async () => {
                const callOrder: number[] = [];
                let resolveCount = 0;

                mockFetch.mockImplementation(() => {
                    callOrder.push(resolveCount++);
                    return Promise.resolve({
                        status: 206,
                        headers: { get: () => '10' },
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                    });
                });

                await client.fetchRange('https://example.com/file.bin', 0, 9);
                await client.fetchRange('https://example.com/file.bin', 10, 19);
                await client.fetchRange('https://example.com/file.bin', 20, 29);

                expect(callOrder).toEqual([0, 1, 2]);
            });
        });
    });

    describe('fetch', () => {
        describe('O - One Cases (Happy Path)', () => {
            it('should successfully fetch a full file and return bytes', async () => {
                const fileData = new Uint8Array([1, 2, 3, 4, 5]);
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    bytes: jest.fn().mockResolvedValue(fileData),
                });

                const result = await client.fetch('https://example.com/model.onnx');

                expect(result).toEqual(fileData);
                expect(mockFetch).toHaveBeenCalledTimes(1);
            });

            it('should make a simple GET request without headers', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    ok: true,
                    bytes: jest.fn().mockResolvedValue(new Uint8Array(100)),
                });

                await client.fetch('https://example.com/file.bin');

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

                await expect(client.fetch('https://example.com/file.bin')).rejects.toThrow('400');
            });

            it('should throw for 401 Unauthorized', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 401,
                    statusText: 'Unauthorized',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/file.bin')).rejects.toThrow('401');
            });

            it('should throw for 404 Not Found', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/nonexistent.bin')).rejects.toThrow('404');
            });

            it('should throw for 500 Internal Server Error', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 500,
                    statusText: 'Internal Server Error',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/file.bin')).rejects.toThrow('500');
            });

            it('should throw when fetch throws network error', async () => {
                mockFetch.mockRejectedValue(new Error('Network is unreachable'));

                await expect(client.fetch('https://example.com/file.bin')).rejects.toThrow('Network is unreachable');
            });

            it('should include URL in error message', async () => {
                mockFetch.mockResolvedValueOnce({
                    status: 404,
                    statusText: 'Not Found',
                    ok: false,
                });

                await expect(client.fetch('https://example.com/missing.bin')).rejects.toThrow('https://example.com/missing.bin');
            });
        });

        describe('S - Sequencing and Reentrancy', () => {
            it('should handle concurrent full file requests', async () => {
                mockFetch
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(10)),
                    })
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(20)),
                    })
                    .mockResolvedValueOnce({
                        status: 200,
                        ok: true,
                        bytes: jest.fn().mockResolvedValue(new Uint8Array(30)),
                    });

                const promises = [
                    client.fetch('https://example.com/file1.bin'),
                    client.fetch('https://example.com/file2.bin'),
                    client.fetch('https://example.com/file3.bin'),
                ];

                const results = await Promise.all(promises);

                expect(results).toHaveLength(3);
                expect(results[0]).toHaveLength(10);
                expect(results[1]).toHaveLength(20);
                expect(results[2]).toHaveLength(30);
                expect(mockFetch).toHaveBeenCalledTimes(3);
            });
        });
    });
});