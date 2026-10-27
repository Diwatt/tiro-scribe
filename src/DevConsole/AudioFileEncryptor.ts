import * as Crypto from 'expo-crypto';
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AudioIngest } from './Data/AudioIngest';
import { AudioSegmentExtractor } from './AudioSegmentExtractor';
import { SourceIngestException } from './SourceIngestException';
import { SourceFile } from './Data/SourceFile';

/**
 * AudioFileEncryptor – Encrypts raw audio files into the app's native format.
 *
 * WAV files are converted to the standard recording format (16 kHz, mono, 16-bit PCM)
 * via AudioSegmentExtractor before encryption. Raw PCM files are encrypted directly.
 * The resulting .dat file is indistinguishable from a recorded file.
 *
 * Uses SecureRecorder.encryptBytes / encryptFile under the hood.
 *
 * DEV ONLY. Not for production use.
 */
export class AudioFileEncryptor {
    /** Raw PCM sources are assumed s16le mono 16 kHz (scanner convention): 16 000 samples/s × 2 bytes. */
    private static readonly PCM_BYTES_PER_MS =
        AudioSegmentExtractor.SAMPLES_PER_MS * AudioSegmentExtractor.BYTES_PER_SAMPLE;

    public constructor(
        private readonly logger: AppLogger,
        private readonly segmentExtractor: AudioSegmentExtractor,
    ) {}

    public static durationFromSamples(sampleCount: number): number {
        return sampleCount / AudioSegmentExtractor.SAMPLES_PER_MS;
    }

    public static durationFromMono16kPcmBytes(byteCount: number): number {
        return byteCount / AudioFileEncryptor.PCM_BYTES_PER_MS;
    }

    /** The native SecureRecorder expects bare POSIX paths, not file:// URIs. */
    public static toNativePath(path: string): string {
        return path.replace(/^file:\/\//, '');
    }

    public async encrypt(inputPath: string): Promise<AudioIngest> {
        const outputPath = this.buildOutputPath();
        const inputInfo = await getInfoAsync(inputPath);
        if (!inputInfo.exists) {
            throw new SourceIngestException(`Input file not found: ${inputPath}`, 'INPUT_FILE_MISSING');
        }

        const inputSizeBytes = inputInfo.size ?? 0;
        const isWav = inputPath.toLowerCase().endsWith('.wav');
        let durationMs: number;

        try {
            if (isWav) {
                const floatPcm = await this.segmentExtractor.readFullPcm(inputPath);
                const int16Pcm = AudioSegmentExtractor.float32ToInt16(floatPcm);
                const pcmBytes = new Uint8Array(int16Pcm.buffer);
                await SecureRecorder.encryptBytes(pcmBytes, outputPath);
                durationMs = AudioFileEncryptor.durationFromSamples(int16Pcm.length);
            } else {
                await SecureRecorder.encryptFile(AudioFileEncryptor.toNativePath(inputPath), outputPath);
                durationMs = AudioFileEncryptor.durationFromMono16kPcmBytes(inputSizeBytes);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new SourceIngestException(
                `Encryption failed: ${message}`,
                'ENCRYPTION_FAILED',
                error instanceof Error ? error : undefined,
            );
        }

        const outputInfo = await getInfoAsync(outputPath);
        const outputSizeBytes = outputInfo.exists ? (outputInfo.size ?? 0) : 0;

        const inputFile = new SourceFile(inputPath, inputSizeBytes);
        const outputFile = new SourceFile(outputPath, outputSizeBytes);

        this.logger.debug('AudioFileEncryptor: encrypted file', {
            inputPath,
            outputPath,
            isWav,
            durationMs,
        });

        return new AudioIngest(inputFile, outputFile, durationMs);
    }

    public async encryptAll(paths: string[]): Promise<AudioIngest[]> {
        const results: AudioIngest[] = [];

        for (const path of paths) {
            const result = await this.encrypt(path);
            results.push(result);
        }

        return results;
    }

    private buildOutputPath(): string {
        const randomSuffix = Crypto.randomUUID().split('-')[0];
        const fixtureId = `fixture_${randomSuffix}`;
        const docDir = documentDirectory ?? '';

        return AudioFileEncryptor.toNativePath(`${docDir}${fixtureId}.dat`);
    }
}

Container.register(
    AudioFileEncryptor,
    () => new AudioFileEncryptor(Container.get(AppLogger), Container.get(AudioSegmentExtractor)),
);
