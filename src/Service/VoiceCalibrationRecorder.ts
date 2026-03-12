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
import * as Device from 'expo-device';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';
import { Timer } from '@/Util/Timer';

type SecureRecorderFactory = (sessionId: string) => SecureRecorder;

export class VoiceCalibrationRecorder {
    private static readonly SESSION_PREFIX = 'voice-calibration';

    // audio constants
    private static readonly SAMPLE_RATE = 16000; // 16 kHz PCM
    private static readonly MAX_INT16 = 32768.0; // used for normalizing 16‑bit samples

    public constructor(
        private readonly logger: AppLogger,
        private readonly secureRecorderFactory: SecureRecorderFactory,
    ) {}

    public async capture(durationMs: number): Promise<Float32Array> {
        this.logger.info('Starting voice calibration capture.', { durationMs });
        await this.ensureRecordingPermission();

        const sessionId = `${VoiceCalibrationRecorder.SESSION_PREFIX}-${Date.now()}`;
        this.logger.debug('[VoiceCalibrationRecorder] session id', { sessionId });
        const recorder = this.secureRecorderFactory(sessionId);

        // timestamps for diagnostics
        let startTs = 0;
        let stopTs = 0;

        try {
            await recorder.initialize();
            await recorder.start();
            startTs = Date.now();
            this.logger.debug('[VoiceCalibrationRecorder] recording started', { sessionId, startTs });

            // record for the requested duration
            await Timer.sleep(durationMs);
            const afterSleepTs = Date.now();
            this.logger.debug('[VoiceCalibrationRecorder] sleep complete', {
                sessionId,
                duration: afterSleepTs - startTs,
            });

            const encryptedFilePath = await recorder.stop();
            stopTs = Date.now();
            this.logger.info('[VoiceCalibrationRecorder] recording stopped', {
                sessionId,
                stopTs,
                duration: stopTs - startTs,
                encryptedFilePath,
            });

            // prepare buffer for decrypted PCM samples
            const expectedSamples = (VoiceCalibrationRecorder.SAMPLE_RATE * durationMs) / 1000;
            const buffer = new Float32Array(expectedSamples);
            let offset = 0;

            const pcmPromise = new Promise<Float32Array>((resolve, reject) => {
                const subscription = SecureRecorder.addDecryptionListener((event) => {
                    const bytes = event.data as Uint8Array;
                    const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
                    const chunkTs = Date.now();

                    // log chunk info to help debug short recordings
                    this.logger.debug('[VoiceCalibrationRecorder] decryption chunk', {
                        bytes: bytes.length,
                        isLast: event.isLast,
                        offsetBefore: offset,
                        timestamp: chunkTs,
                    });

                    for (const sample of int16Array) {
                        if (offset < expectedSamples) {
                            buffer[offset++] = sample / VoiceCalibrationRecorder.MAX_INT16;
                        }
                    }

                    // log after processing the chunk so we can see growth
                    this.logger.debug('[VoiceCalibrationRecorder] offset updated', { offset });

                    if (event.isLast) {
                        subscription.remove();
                        resolve(buffer);
                    }
                });

                SecureRecorder.stream(encryptedFilePath).then(undefined, (err: unknown) => {
                    subscription.remove();
                    reject(err);
                });
            });

            const pcm = await pcmPromise;

            // determine how many samples we really need; allow a 10% slack
            // because native audio buffers can come back slightly smaller than
            // the theoretical target.  if the recording falls below the tolerance
            // we still consider it a failure, otherwise we can happily hand back
            // a trimmed array to avoid trailing zeros.
            const minRequiredSamples = expectedSamples * 0.9;

            if (offset < minRequiredSamples) {
                this.logger.error('[VoiceCalibrationRecorder] recording shorter than requested', {
                    requestedMs: durationMs,
                    expectedSamples,
                    minRequiredSamples,
                    actualSamples: offset,
                    startTs,
                    stopTs,
                });

                // In simulator the microphone is unreliable; return a silent buffer
                // instead of failing so that developers can proceed with calibration.
                if (!Device.isDevice) {
                    this.logger.warn(
                        '[VoiceCalibrationRecorder] running on simulator, padding silent buffer',
                    );
                    return new Float32Array(expectedSamples);
                }

                throw new RecordingTooShortError(expectedSamples, offset);
            }

            if (offset < expectedSamples) {
                // we have slightly fewer samples than anticipated, but not enough
                // to fail. slice the buffer so callers don't see trailing zeros.
                return pcm.subarray(0, offset);
            }

            return pcm;
        } catch (error: unknown) {
            this.logger.error('Voice calibration capture failed.', {
                sessionId,
                durationMs,
                startTs,
                stopTs,
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
}

// register class with container
Container.register(
    VoiceCalibrationRecorder,
    () => new VoiceCalibrationRecorder(Container.get(AppLogger), (sessionId: string) => new SecureRecorder(sessionId)),
);
