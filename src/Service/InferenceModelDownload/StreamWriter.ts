import type { File } from 'expo-file-system';
import { InferenceModelDownloaderException } from '@/Exception';

/**
 * StreamWriter – Wrapper for WritableStreamDefaultWriter with lifecycle management.
 * Single Responsibility: Manage writer initialization, writing, and cleanup.
 */
export class StreamWriter {
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

    public constructor(private readonly file: File) {}

    public async close(): Promise<void> {
        if (!this.writer) {
            return;
        }
        await this.writer.close();
    }

    public async initialize(): Promise<void> {
        // Expect caller to have ensured file exists; this class just opens it.
        const writableStream = this.file.writableStream();
        this.writer = writableStream.getWriter();
    }

    public async release(): Promise<void> {
        if (!this.writer) {
            return;
        }
        try {
            this.writer.releaseLock();
        } catch {
            // Silently ignore lock release errors
        }
    }

    public async write(data: Uint8Array): Promise<void> {
        if (!this.writer) {
            throw new InferenceModelDownloaderException('StreamWriter not initialized');
        }
        await this.writer.write(data);
    }
}
