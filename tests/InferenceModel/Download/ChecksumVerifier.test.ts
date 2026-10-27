import type { File } from 'expo-file-system';
import { createHash } from 'react-native-quick-crypto';
import { ChecksumVerifier } from '@/InferenceModel/Download/ChecksumVerifier';
import { InferenceModelDownloaderException } from '@/Exception';

const CHUNK_SIZE = 64 * 1024;
const EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex') as string;

type FakeHandle = { readBytes: jest.Mock; close: jest.Mock };

const createFileWithChunks = (chunks: Uint8Array[]): { file: File; readBytes: jest.Mock; close: jest.Mock } => {
    const readBytes = jest.fn();
    for (const chunk of chunks) {
        readBytes.mockResolvedValueOnce(chunk);
    }
    const close = jest.fn();
    const handle = { readBytes, close } as unknown as FakeHandle;
    const file = { uri: 'file:///models/asr.onnx', open: () => handle } as unknown as File;
    return { file, readBytes, close };
};

describe('ChecksumVerifier', () => {
    let verifier: ChecksumVerifier;

    beforeEach(() => {
        verifier = new ChecksumVerifier();
    });

    it('resolves when the chunked content matches the expected sha256', async () => {
        const content = new Uint8Array([1, 2, 3, 4, 5]);
        const { file } = createFileWithChunks([content, new Uint8Array([])]);

        await expect(verifier.verify(file, sha256Hex(content))).resolves.toBeUndefined();
    });

    it('resolves for an empty file when the expected hash is the empty digest', async () => {
        const { file } = createFileWithChunks([new Uint8Array([])]);

        await expect(verifier.verify(file, EMPTY_DIGEST)).resolves.toBeUndefined();
    });

    it('is case-insensitive on the expected hash', async () => {
        const content = new Uint8Array([10, 20, 30]);
        const { file } = createFileWithChunks([content, new Uint8Array([])]);

        await expect(verifier.verify(file, sha256Hex(content).toUpperCase())).resolves.toBeUndefined();
    });

    it('throws InferenceModelDownloaderException when the hash does not match', async () => {
        const content = new Uint8Array([1, 2, 3]);
        const { file } = createFileWithChunks([content, new Uint8Array([])]);

        const unrelated = sha256Hex(new Uint8Array([9, 9, 9]));
        await expect(verifier.verify(file, unrelated)).rejects.toBeInstanceOf(InferenceModelDownloaderException);
    });

    it('closes the file handle even when the hash does not match', async () => {
        const content = new Uint8Array([1, 2, 3]);
        const { file, close } = createFileWithChunks([content, new Uint8Array([])]);

        await expect(verifier.verify(file, 'deadbeef')).rejects.toBeInstanceOf(InferenceModelDownloaderException);
        expect(close).toHaveBeenCalled();
    });

    it('reads the file in fixed-size chunks', async () => {
        const content = new Uint8Array(2 * CHUNK_SIZE);
        const { file, readBytes } = createFileWithChunks([content, new Uint8Array([])]);

        await verifier.verify(file, sha256Hex(content));

        expect(readBytes).toHaveBeenNthCalledWith(1, CHUNK_SIZE);
        expect(readBytes).toHaveBeenNthCalledWith(2, CHUNK_SIZE);
    });

    it('wraps read failures in InferenceModelDownloaderException', async () => {
        const readBytes = jest.fn(() => Promise.reject(new Error('disk error')));
        const close = jest.fn();
        const file = { uri: 'file:///models/asr.onnx', open: () => ({ readBytes, close }) } as unknown as File;

        await expect(verifier.verify(file, sha256Hex(new Uint8Array([1])))).rejects.toMatchObject({
            originalError: expect.objectContaining({ message: 'disk error' }),
        });
        expect(close).toHaveBeenCalled();
    });

    it('closes the file handle when a mid-read failure occurs', async () => {
        const content = new Uint8Array([1, 2, 3]);
        const readBytes = jest.fn()
            .mockResolvedValueOnce(content)
            .mockImplementation(() => Promise.reject(new Error('unexpected EOF')));
        const close = jest.fn();
        const file = { uri: 'file:///models/asr.onnx', open: () => ({ readBytes, close }) } as unknown as File;

        await expect(verifier.verify(file, sha256Hex(content))).rejects.toMatchObject({
            originalError: expect.objectContaining({ message: 'unexpected EOF' }),
        });
        expect(close).toHaveBeenCalledTimes(1);
    });
});
