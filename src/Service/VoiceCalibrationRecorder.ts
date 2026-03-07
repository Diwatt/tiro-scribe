import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';

type SecureRecorderFactory = (sessionId: string) => SecureRecorder;

export class VoiceCalibrationRecorder {
    private static readonly RECORD_DURATION_MS = 8000;
    private static readonly SESSION_PREFIX = 'voice-calibration';

    public constructor(
        private readonly logger: AppLogger,
        private readonly secureRecorderFactory: SecureRecorderFactory,
    ) {}

    public async recordAndGenerateBiocode(): Promise<string> {
        this.logger.info('Starting voice calibration recording.');
        await this.ensureRecordingPermission();

        const recorder = this.secureRecorderFactory(this.newSessionId());

        try {
            await recorder.init();
            await recorder.start();
            this.logger.debug('Voice calibration recording started.');

            await this.awaitRecordingWindow(VoiceCalibrationRecorder.RECORD_DURATION_MS);

            const encryptedFilePath = await recorder.stop();
            this.logger.info('Voice calibration recording completed.', { encryptedFilePath });

            const decryptedData = await this.collectDecryptedAudio(encryptedFilePath);
            this.logger.debug('Voice calibration decryption completed.');

            return this.generateBiocode(decryptedData);
        } catch (error) {
            this.logger.error('Voice calibration recording failed.', {
                errorMessage: error instanceof Error ? error.message : String(error),
            });

            throw error;
        } finally {
            recorder.dispose();
        }
    }

    private async awaitRecordingWindow(durationMs: number): Promise<void> {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, durationMs);
        });
    }

    private async collectDecryptedAudio(encryptedFilePath: string): Promise<Uint8Array> {
        const chunks: Uint8Array[] = [];

        await new Promise<void>((resolve, reject) => {
            const subscription = SecureRecorder.addDecryptionListener((event) => {
                chunks.push(event.data);

                if (event.isLast) {
                    subscription.remove();
                    resolve();
                }
            });

            SecureRecorder.stream(encryptedFilePath).then(undefined, (error: unknown) => {
                subscription.remove();
                reject(error);
            });
        });

        if (chunks.length === 0) {
            throw new Error('No decrypted audio chunks were emitted by SecureRecorder.');
        }

        return this.mergeChunks(chunks);
    }

    private async ensureRecordingPermission(): Promise<void> {
        if (await SecureRecorder.hasPermission()) {
            return;
        }

        const granted = await SecureRecorder.requestPermission();

        if (!granted) {
            throw new Error('Microphone permission is required for voice calibration recording.');
        }
    }

    private generateBiocode(data: Uint8Array): string {
        this.logger.info('Generating biocode from voice calibration sample.');

        let rollingChecksum = 0;

        for (const sample of data) {
            rollingChecksum = (rollingChecksum + sample) % 65536;
        }

        return `biocode-${data.length}-${rollingChecksum.toString(16).padStart(4, '0')}`;
    }

    private mergeChunks(chunks: readonly Uint8Array[]): Uint8Array {
        let totalLength = 0;

        for (const chunk of chunks) {
            totalLength += chunk.length;
        }

        const mergedChunks = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
            mergedChunks.set(chunk, offset);
            offset += chunk.length;
        }

        return mergedChunks;
    }

    private newSessionId(): string {
        const timestampMs = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1_000_000);

        return `${VoiceCalibrationRecorder.SESSION_PREFIX}-${timestampMs}-${randomSuffix}`;
    }
}

Container.register(
    VoiceCalibrationRecorder,
    () => new VoiceCalibrationRecorder(Container.get(AppLogger), (sessionId: string) => new SecureRecorder(sessionId)),
);
