import * as Crypto from 'expo-crypto';
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { DevAudioIngest } from './Data/DevAudioIngest';
import { DevAudioSegmentExtractor } from './DevAudioSegmentExtractor';
import { DevEncryptionException } from './DevEncryptionException';
import { DevFile } from './Data/DevFile';

/**
 * DevFileEncryptor – Encrypts raw audio files into the app's native format.
 *
 * WAV files are converted to the standard recording format (16 kHz, mono, 16-bit PCM)
 * via DevAudioSegmentExtractor before encryption. Raw PCM files are encrypted directly.
 * The resulting .dat file is indistinguishable from a recorded file.
 *
 * Uses SecureRecorder.encryptBytes / encryptFile under the hood.
 *
 * DEV ONLY. Not for production use.
 */
export class DevFileEncryptor {
    public constructor(
        private readonly logger: AppLogger,
        private readonly segmentExtractor: DevAudioSegmentExtractor,
    ) {}

    public async encrypt(inputPath: string): Promise<DevAudioIngest> {
        const outputPath = this.buildOutputPath();
        const inputInfo = await getInfoAsync(inputPath);
        if (!inputInfo.exists) {
            throw new DevEncryptionException(`Input file not found: ${inputPath}`, 'INPUT_FILE_MISSING');
        }

        const inputSizeBytes = inputInfo.size ?? 0;
        const isWav = inputPath.toLowerCase().endsWith('.wav');

        try {
            if (isWav) {
                const floatPcm = await this.segmentExtractor.readFullPcm(inputPath);
                const int16Pcm = DevAudioSegmentExtractor.float32ToInt16(floatPcm);
                const pcmBytes = new Uint8Array(int16Pcm.buffer);
                await SecureRecorder.encryptBytes(pcmBytes, outputPath);
            } else {
                await SecureRecorder.encryptFile(inputPath, outputPath);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new DevEncryptionException(
                `Encryption failed: ${message}`,
                'ENCRYPTION_FAILED',
                error instanceof Error ? error : undefined,
            );
        }

        const outputInfo = await getInfoAsync(outputPath);
        const outputSizeBytes = outputInfo.exists ? (outputInfo.size ?? 0) : 0;

        const inputFile = new DevFile(inputPath, inputSizeBytes);
        const outputFile = new DevFile(outputPath, outputSizeBytes);

        this.logger.debug('DevFileEncryptor: encrypted file', {
            inputPath,
            outputPath,
            isWav,
        });

        return new DevAudioIngest(inputFile, outputFile);
    }

    public async encryptAll(paths: string[]): Promise<DevAudioIngest[]> {
        const results: DevAudioIngest[] = [];

        for (const path of paths) {
            const result = await this.encrypt(path);
            results.push(result);
        }

        return results;
    }

    private buildOutputPath(): string {
        const randomSuffix = Crypto.randomUUID().split('-')[0];
        const sessionId = `seed_${randomSuffix}`;
        const docDir = documentDirectory ?? '';

        return `${docDir}${sessionId}.dat`;
    }
}

Container.register(
    DevFileEncryptor,
    () => new DevFileEncryptor(Container.get(AppLogger), Container.get(DevAudioSegmentExtractor)),
);
