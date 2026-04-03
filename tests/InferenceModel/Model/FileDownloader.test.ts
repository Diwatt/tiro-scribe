/**
 * FileDownloader tests.
 *
 * Tests the chunked downloader using FileNetworkClient for large files
 * and fetch for small files.
 */

import { FileNetworkClient } from '@/InferenceModel/Download/FileNetworkClient';
import { FileAssembler } from '@/InferenceModel/Download/FileAssembler';
import { FileDownloader } from '@/InferenceModel/Download/FileDownloader';

jest.mock('@/InferenceModel/Download/FileNetworkClient');
jest.mock('@/InferenceModel/Download/FileAssembler');

const MockedFileNetworkClient = FileNetworkClient as jest.MockedClass<typeof FileNetworkClient>;
const MockedFileAssembler = FileAssembler as jest.MockedClass<typeof FileAssembler>;

const makeLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

const makeFile = (exists = true) => ({
    uri: 'file://test/model.onnx',
    exists,
    create: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
});

describe('FileDownloader', () => {
    let mockLogger: ReturnType<typeof makeLogger>;
    let mockFile: ReturnType<typeof makeFile>;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        mockLogger = makeLogger();
        mockFile = makeFile();
    });

    describe('download', () => {
        it('should yield 0 then 1 for invalid totalBytes', async () => {
            MockedFileAssembler.mockImplementation(() => ({
                close: jest.fn(),
                getProgress: jest.fn().mockReturnValue(0),
                getBytesWritten: jest.fn().mockReturnValue(0),
                isComplete: jest.fn().mockReturnValue(true),
                writeChunk: jest.fn(),
            }) as unknown as FileAssembler);

            const downloader = new FileDownloader(mockFile as any, mockLogger);
            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', 0)) {
                progress.push(p);
            }

            expect(progress).toEqual([0, 1]);
        });

        it('should bypass chunking for small files (<= 5MB)', async () => {
            const writeChunk = jest.fn();
            MockedFileAssembler.mockImplementation(() => ({
                close: jest.fn(),
                getProgress: jest.fn().mockReturnValue(1),
                getBytesWritten: jest.fn().mockReturnValue(1024),
                isComplete: jest.fn().mockReturnValue(true),
                writeChunk,
            }) as unknown as FileAssembler);

            MockedFileNetworkClient.prototype.fetch = jest.fn()
                .mockResolvedValue(new Uint8Array(1024));

            const downloader = new FileDownloader(mockFile as any, mockLogger);
            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', 1024)) {
                progress.push(p);
            }

            expect(progress).toEqual([0, 1]);
            expect(writeChunk).toHaveBeenCalledWith(expect.any(Uint8Array));
            expect(MockedFileNetworkClient.prototype.fetch).toHaveBeenCalledWith('https://example.com/model.onnx');
        });

        it('should download large files in chunks', async () => {
            // Use a small chunkSize to make the test complete in 2 iterations
            const downloader = new FileDownloader(mockFile as any, mockLogger, 1024);
            let bytesWritten = 0;
            const totalBytes = 2048;

            const writeChunk = jest.fn().mockImplementation((chunk: Uint8Array) => {
                bytesWritten += chunk.length;
            });
            MockedFileAssembler.mockImplementation(() => ({
                close: jest.fn(),
                getProgress: jest.fn().mockImplementation(() => bytesWritten / totalBytes),
                getBytesWritten: jest.fn().mockImplementation(() => bytesWritten),
                isComplete: jest.fn().mockImplementation(() => bytesWritten >= totalBytes),
                writeChunk,
            }) as unknown as FileAssembler);

            MockedFileNetworkClient.prototype.fetchRange = jest.fn()
                .mockResolvedValueOnce(new Uint8Array(1024))
                .mockResolvedValueOnce(new Uint8Array(1024));

            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', totalBytes)) {
                progress.push(p);
            }

            expect(progress.length).toBeGreaterThanOrEqual(2);
            expect(writeChunk).toHaveBeenCalledTimes(2);
            expect(MockedFileNetworkClient.prototype.fetchRange).toHaveBeenCalledTimes(2);
        });

        it('should close file assembler on completion', async () => {
            const close = jest.fn();
            MockedFileAssembler.mockImplementation(() => ({
                close,
                getProgress: jest.fn().mockReturnValue(1),
                getBytesWritten: jest.fn().mockReturnValue(1024),
                isComplete: jest.fn().mockReturnValue(true),
                writeChunk: jest.fn(),
            }) as unknown as FileAssembler);

            const downloader = new FileDownloader(mockFile as any, mockLogger);
            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', 1024)) {
                progress.push(p);
            }

            expect(close).toHaveBeenCalled();
        });

        it('should close file assembler when FileNetworkClient throws', async () => {
            const close = jest.fn();
            MockedFileAssembler.mockImplementation(() => ({
                close,
                getProgress: jest.fn().mockReturnValue(0),
                getBytesWritten: jest.fn().mockReturnValue(0),
                isComplete: jest.fn().mockReturnValue(false),
                writeChunk: jest.fn(),
            }) as unknown as FileAssembler);

            MockedFileNetworkClient.prototype.fetchRange = jest.fn().mockRejectedValue(new Error('Network error'));

            const downloader = new FileDownloader(mockFile as any, mockLogger);

            try {
                for await (const _ of downloader.download('https://example.com/model.onnx', 2048)) {
                    // consume generator
                }
            } catch {
                // expected
            }

            expect(close).toHaveBeenCalled();
        });

        it('should calculate correct range based on bytes written', async () => {
            let bytesWritten = 0;

            const writeChunk = jest.fn().mockImplementation((chunk: Uint8Array) => {
                bytesWritten += chunk.length;
            });
            MockedFileAssembler.mockImplementation(() => ({
                close: jest.fn(),
                getProgress: jest.fn().mockImplementation(() => bytesWritten / 2048),
                getBytesWritten: jest.fn().mockImplementation(() => bytesWritten),
                isComplete: jest.fn().mockImplementation(() => bytesWritten >= 2048),
                writeChunk,
            }) as unknown as FileAssembler);

            MockedFileNetworkClient.prototype.fetchRange = jest.fn()
                .mockResolvedValueOnce(new Uint8Array(1024))
                .mockResolvedValueOnce(new Uint8Array(1024));

            const downloader = new FileDownloader(mockFile as any, mockLogger, 1024);

            for await (const _ of downloader.download('https://example.com/model.onnx', 2048)) {
                // consume
            }

            expect(MockedFileNetworkClient.prototype.fetchRange).toHaveBeenNthCalledWith(1, 'https://example.com/model.onnx', 0, 1023);
            expect(MockedFileNetworkClient.prototype.fetchRange).toHaveBeenNthCalledWith(2, 'https://example.com/model.onnx', 1024, 2047);
        });
    });
});