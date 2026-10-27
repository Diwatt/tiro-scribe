import type { SourceFile } from './SourceFile';

/**
 * AudioIngest – The outcome of ingesting a raw audio file into the app's
 * encrypted format. The source duration is computed at encryption time (the
 * PCM is normalized to 16 kHz mono before it hits the native encryptor).
 *
 * DEV ONLY. Not for production use.
 */
export class AudioIngest {
    public constructor(
        public readonly inputFile: SourceFile,
        public readonly outputFile: SourceFile,
        public readonly durationMs: number,
    ) {}

    public get summary(): string {
        const durationSeconds = Math.round(this.durationMs / 1000);
        return `${this.inputFile.sizeBytes} bytes → ${this.outputFile.sizeBytes} bytes (${durationSeconds}s)`;
    }
}
