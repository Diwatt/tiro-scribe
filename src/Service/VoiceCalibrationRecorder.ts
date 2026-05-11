/**
 * VoiceCalibrationRecorder – low‑level capturer used during calibration.
 *
 * This class drives the native `SecureRecorder`: it requests permissions,
 * starts/stops a session and writes an encrypted recording to disk.  Decryption
 * and conversion to normalized Float32Array PCM is handled via `getPcm()`.
 * No model or biocode logic belongs here.
 *
 * This class can be instantiated directly and is the only concrete recorder
 * implementation used in production.
 */

import * as Device from 'expo-device';
import { SecureRecorder } from 'secure-recorder';
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

    // state from last capture (used by getPcm)
    private _lastEncryptedFilePath?: string;
    private _lastDurationMs?: number;

    public constructor(
        private readonly logger: AppLogger,
        private readonly secureRecorderFactory: SecureRecorderFactory,
    ) {}

    public async capture(durationMs: number): Promise<string> {
        this.logger.info('Starting voice calibration capture.', { durationMs });
        await this.ensureRecordingPermission();

        const sessionId = `${VoiceCalibrationRecorder.SESSION_PREFIX}-${Date.now()}`;
        this.logger.debug('[VoiceCalibrationRecorder] session id', { sessionId });
        const recorder = this.secureRecorderFactory(sessionId);

        try {
            await recorder.initialize();
            await recorder.start();
            this.logger.debug('[VoiceCalibrationRecorder] recording started', { sessionId });

            // record for the requested duration
            await Timer.sleep(durationMs);

            const encryptedFilePath = await recorder.stop();
            this.logger.info('[VoiceCalibrationRecorder] recording stopped', { sessionId, encryptedFilePath });

            this._lastEncryptedFilePath = encryptedFilePath;
            this._lastDurationMs = durationMs;

            return encryptedFilePath;
        } catch (error: unknown) {
            this.logger.error('Voice calibration capture failed.', {
                sessionId,
                durationMs,
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        } finally {
            recorder.dispose();
        }
    }

    public async getPcm(durationMs?: number): Promise<Float32Array> {
        const encryptedFilePath = this._lastEncryptedFilePath;
        const duration = durationMs ?? this._lastDurationMs;

        if (!encryptedFilePath || duration == null) {
            throw new Error('No recording available. Call capture() before getPcm().');
        }

        const expectedSamples = (VoiceCalibrationRecorder.SAMPLE_RATE * duration) / 1000;
        const buffer = new Float32Array(expectedSamples);
        let offset = 0;

        try {
            // Create the promise first, then register the listener that can resolve it
            const pcmPromise = new Promise<Float32Array>((resolve, reject) => {
                // Use an async IIFE to handle the async addDecryptionListener
                (async () => {
                    try {
                        let offset = 0;
                        const buffer = new Float32Array(expectedSamples);

                        const subscription = await SecureRecorder.addDecryptionListener((event) => {
                            const bytes = event.data as Uint8Array;
                            const int16Array = new Int16Array(
                                bytes.buffer,
                                bytes.byteOffset,
                                bytes.length / 2,
                            );

                            this.logger.debug('[VoiceCalibrationRecorder] decryption chunk', {
                                bytes: bytes.length,
                                isLast: event.isLast,
                                offsetBefore: offset,
                            });

                            for (const sample of int16Array) {
                                if (offset < expectedSamples) {
                                    buffer[offset++] = sample / VoiceCalibrationRecorder.MAX_INT16;
                                }
                            }

                            this.logger.debug('[VoiceCalibrationRecorder] offset updated', { offset });

                            if (event.isLast) {
                                subscription.remove();
                                resolve(buffer);
                            }
                        });

                        await SecureRecorder.stream(encryptedFilePath);
                    } catch (error) {
                        reject(error);
                    }
                })();
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
                    encryptedFilePath,
                    durationMs: duration,
                    expectedSamples,
                    minRequiredSamples,
                    actualSamples: offset,
                });

                // In simulator the microphone is unreliable; return a silent buffer
                // instead of failing so that developers can proceed with calibration.
                const isDevice = (() => {
                    try {
                        return Boolean(Device.isDevice);
                    } catch {
                        // Some test environments (e.g. vitest module mocks) may not
                        // surface the isDevice export. Assume real device in that case.
                        return true;
                    }
                })();

                if (!isDevice) {
                    this.logger.warn('[VoiceCalibrationRecorder] running on simulator, padding silent buffer');
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
            this.logger.error('Voice calibration decryption failed.', {
                encryptedFilePath,
                durationMs: duration,
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
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
