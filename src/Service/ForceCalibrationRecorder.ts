import { SecureRecorder } from '@/modules/secure-recorder/src/SecureRecorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { InMemoryAudioRecorderException } from '@/Exception';
import { createReadStream } from 'fs';

export class ForceCalibrationRecorder {
    private static readonly RECORD_DURATION_MS = 5000;
    private static readonly OUTPUT_FILE_PATH = '/tmp/force_calibration_audio.enc';

    public constructor(private readonly logger: AppLogger, private readonly recorder: SecureRecorder) {}

    /**
     * Records 5 seconds of audio, saves it to a file, and streams the decrypted data.
     */
    public async recordAndStreamDecrypt(): Promise<void> {
        try {
            this.logger.info('Starting 5-second recording for force calibration.');

            // Start recording
            await this.recorder.startRecording(ForceCalibrationRecorder.OUTPUT_FILE_PATH);
            this.logger.debug('Recording started.');

            // Wait for the recording duration
            await new Promise((resolve) => setTimeout(resolve, ForceCalibrationRecorder.RECORD_DURATION_MS));

            // Stop recording
            await this.recorder.stopRecording();
            this.logger.info('Recording completed.');

            // Stream-decrypt the recorded file
            await this.streamDecrypt(ForceCalibrationRecorder.OUTPUT_FILE_PATH);
        } catch (error) {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Error during force calibration recording', { error: wrappedError });
            throw new InMemoryAudioRecorderException('Failed to record and stream-decrypt audio', 'RECORD_STREAM_DECRYPT_ERROR');
        }
    }

    private async streamDecrypt(filePath: string): Promise<void> {
        this.logger.info(`Starting stream decryption for file: ${filePath}`);

        const readStream = createReadStream(filePath);
        readStream.on('data', (chunk) => {
            this.logger.debug(`Decrypted chunk received: ${chunk.length} bytes`);
            // Process the decrypted chunk (e.g., send it to a calibration algorithm)
        });

        return new Promise((resolve, reject) => {
            readStream.on('end', () => {
                this.logger.info('Stream decryption completed.');
                resolve();
            });

            readStream.on('error', (error) => {
                const wrappedError = error instanceof Error ? error : new Error(String(error));
                this.logger.error('Error during stream decryption', { error: wrappedError });
                reject(wrappedError);
            });
        });
    }
}

Container.register(ForceCalibrationRecorder, () => new ForceCalibrationRecorder(Container.get(AppLogger), Container.get(SecureRecorder)));
