/**
 * VoiceCalibrationRecorder – low‑level capturer used during calibration.
 *
 * This class drives the native `SecureRecorder`: it requests permissions,
 * starts/stops a session, streams decrypted bytes and converts them to
 * normalized Float32Array PCM.  No model or biocode logic belongs here.
 *
 * This class can be instantiated directly and is the only concrete recorder
 * implementation used in production.
 */
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { Timer } from '@/Util/Timer';

type SecureRecorderFactory = (sessionId: string) => SecureRecorder;

export class VoiceCalibrationRecorder {
    private static readonly SESSION_PREFIX = 'voice-calibration';

    public constructor(
        private readonly logger: AppLogger,
        private readonly secureRecorderFactory: SecureRecorderFactory,
    ) {}

    public async capture(durationMs: number): Promise<Float32Array> {
        this.logger.info('Starting voice calibration capture.', { durationMs });
        await this.ensureRecordingPermission();

        const sessionId = `${VoiceCalibrationRecorder.SESSION_PREFIX}-${Date.now()}`;
        const recorder = this.secureRecorderFactory(sessionId);

        try {
            await recorder.initialize();
            await recorder.start();
            this.logger.debug('Voice calibration recording started.');

            await Timer.sleep(durationMs);

            const encryptedFilePath = await recorder.stop();
            this.logger.info('Voice calibration recording completed.', { encryptedFilePath });

            const decryptedBytes = await this.collectDecryptedAudio(encryptedFilePath);
            this.logger.debug('Voice calibration decryption completed.');

            const pcm = this.uint8ToPcm(decryptedBytes);
            return pcm;
        } catch (error: unknown) {
            this.logger.error('Voice calibration capture failed.', {
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        } finally {
            recorder.dispose();
        }
    }

    private async ensureRecordingPermission(): Promise<void> {
        if (await SecureRecorder.hasPermission()) {
            return;
        }

        const granted = await SecureRecorder.requestPermission();

        if (!granted) {
            throw new RecordingPermissionError('Microphone permission is required for voice calibration capture.');
        }
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

    /**
     * Convert raw 16‑bit PCM bytes to normalized Float32Array PCM.
     */
    private uint8ToPcm(buffer: Uint8Array): Float32Array {
        const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        const pcm = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
            pcm[i] = int16Array[i] / 32768.0;
        }

        return pcm;
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
}

// register class with container
Container.register(
    VoiceCalibrationRecorder,
    () => new VoiceCalibrationRecorder(Container.get(AppLogger), (sessionId: string) => new SecureRecorder(sessionId)),
);
