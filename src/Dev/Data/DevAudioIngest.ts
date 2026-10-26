import type { DevFile } from './DevFile';

/**
 * DevAudioIngest – The outcome of ingesting a raw audio file into the app's
 * encrypted format.
 *
 * DEV ONLY. Not for production use.
 */
export class DevAudioIngest {
    public constructor(
        public readonly inputFile: DevFile,
        public readonly outputFile: DevFile,
    ) {}

    public get summary(): string {
        return `${this.inputFile.sizeBytes} bytes → ${this.outputFile.sizeBytes} bytes`;
    }
}
