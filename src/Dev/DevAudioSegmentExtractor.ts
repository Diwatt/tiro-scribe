import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Buffer } from 'react-native-quick-crypto';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { DevEncryptionException } from './DevEncryptionException';
import { AudioSegment } from './Data/AudioSegment';
import { WavHeader } from './WavHeader';

/**
 * DevAudioSegmentExtractor – Reads a raw audio file (WAV or PCM) and extracts
 * a time-based segment as normalized Float32Array PCM.
 *
 * Supports:
 *   • WAV files with 16-bit PCM data (any sample rate, mono or stereo)
 *   • Raw PCM files (assumed 16-bit, 16kHz, mono)
 *
 * Stereo WAVs are mixed to mono. Non-16kHz WAVs are resampled to 16kHz.
 *
 * DEV ONLY. Not for production use.
 */
export class DevAudioSegmentExtractor {
    public static readonly BYTES_PER_SAMPLE = 2;
    public static readonly MAX_INT16 = 32768.0;
    public static readonly TARGET_SAMPLE_RATE = 16000;
    public static readonly SAMPLES_PER_MS = DevAudioSegmentExtractor.TARGET_SAMPLE_RATE / 1000;

    public constructor(private readonly logger: AppLogger) {}

    public async extract(audioPath: string, segment: AudioSegment): Promise<Float32Array> {
        const fullPcm = await this.readFullPcm(audioPath);

        const startSample = Math.floor(segment.startMs * DevAudioSegmentExtractor.SAMPLES_PER_MS);
        const endSample = Math.floor(segment.endMs * DevAudioSegmentExtractor.SAMPLES_PER_MS);
        const segmentLength = endSample - startSample;

        if (fullPcm.length < startSample) {
            throw new DevEncryptionException(
                `Segment starts at sample ${startSample} but audio only has ${fullPcm.length} samples`,
                'SEGMENT_OUT_OF_BOUNDS',
            );
        }

        const actualEnd = Math.min(endSample, fullPcm.length);
        const actualLength = actualEnd - startSample;

        if (actualLength < segmentLength * 0.5) {
            this.logger.warn('DevAudioSegmentExtractor: segment shorter than requested', {
                requestedLength: segmentLength,
                actualLength,
                totalSamples: fullPcm.length,
            });
        }

        return fullPcm.subarray(startSample, actualEnd);
    }

    public async readFullPcm(audioPath: string): Promise<Float32Array> {
        return this.readFileToPcm(audioPath);
    }

    private async readFileToPcm(path: string): Promise<Float32Array> {
        const base64 = await readAsStringAsync(path, { encoding: EncodingType.Base64 });
        const bytes = Buffer.from(base64, 'base64');
        const uint8Array = new Uint8Array(bytes);

        if (this.isWavFile(uint8Array)) {
            return this.parseWavToPcm(uint8Array);
        }

        if (this.isRawPcmFile(path)) {
            return this.parseRawPcmToFloat32(uint8Array);
        }

        throw new DevEncryptionException(
            `Unsupported audio format: ${path}. Only WAV and raw PCM (.pcm, .raw) are supported.`,
            'UNSUPPORTED_AUDIO_FORMAT',
        );
    }

    private isRawPcmFile(path: string): boolean {
        const lower = path.toLowerCase();
        return lower.endsWith('.pcm') || lower.endsWith('.raw');
    }

    private isWavFile(bytes: Uint8Array): boolean {
        return (
            bytes.length >= 12 &&
            bytes[0] === 0x52 &&
            bytes[1] === 0x49 &&
            bytes[2] === 0x46 &&
            bytes[3] === 0x46 && // "RIFF"
            bytes[8] === 0x57 &&
            bytes[9] === 0x41 &&
            bytes[10] === 0x56 &&
            bytes[11] === 0x45 // "WAVE"
        );
    }

    private parseWavToPcm(bytes: Uint8Array): Float32Array {
        const header = WavHeader.fromBytes(bytes);

        if (!header.isPcm) {
            throw new DevEncryptionException(
                `Unsupported WAV format: ${header.audioFormat} (only PCM format 1 is supported)`,
                'UNSUPPORTED_WAV_FORMAT',
            );
        }

        if (!header.isSupportedBitDepth) {
            throw new DevEncryptionException(
                `Unsupported bit depth: ${header.bitsPerSample} (only 16-bit is supported)`,
                'UNSUPPORTED_BIT_DEPTH',
            );
        }

        if (!header.isSupportedChannels) {
            throw new DevEncryptionException(
                `Unsupported channel count: ${header.channels} (only mono or stereo is supported)`,
                'UNSUPPORTED_CHANNEL_COUNT',
            );
        }

        const pcmData = bytes.subarray(header.dataOffset, header.dataOffset + header.dataSize);
        const int16Array = new Int16Array(
            pcmData.buffer,
            pcmData.byteOffset,
            pcmData.length / DevAudioSegmentExtractor.BYTES_PER_SAMPLE,
        );

        let floatPcm: Float32Array;

        if (header.channels === WavHeader.MONO_CHANNELS) {
            floatPcm = this.int16ToFloat32(int16Array);
        } else {
            floatPcm = this.stereoToMono(int16Array);
        }

        if (header.sampleRate !== DevAudioSegmentExtractor.TARGET_SAMPLE_RATE) {
            this.logger.info('DevAudioSegmentExtractor: resampling WAV', {
                fromRate: header.sampleRate,
                toRate: DevAudioSegmentExtractor.TARGET_SAMPLE_RATE,
            });
            return this.resample(floatPcm, header.sampleRate, DevAudioSegmentExtractor.TARGET_SAMPLE_RATE);
        }

        return floatPcm;
    }

    private parseRawPcmToFloat32(bytes: Uint8Array): Float32Array {
        const int16Array = new Int16Array(
            bytes.buffer,
            bytes.byteOffset,
            bytes.length / DevAudioSegmentExtractor.BYTES_PER_SAMPLE,
        );
        return this.int16ToFloat32(int16Array);
    }

    private int16ToFloat32(int16Array: Int16Array): Float32Array {
        const floatArray = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            floatArray[i] = int16Array[i] / DevAudioSegmentExtractor.MAX_INT16;
        }
        return floatArray;
    }

    private stereoToMono(int16Array: Int16Array): Float32Array {
        const sampleCount = Math.floor(int16Array.length / 2);
        const mono = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            const left = int16Array[i * 2];
            const right = int16Array[i * 2 + 1];
            mono[i] = (left + right) / (2 * DevAudioSegmentExtractor.MAX_INT16);
        }
        return mono;
    }

    public static float32ToInt16(floatArray: Float32Array): Int16Array {
        const int16Array = new Int16Array(floatArray.length);
        for (let i = 0; i < floatArray.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, Math.round(floatArray[i] * 32768)));
        }
        return int16Array;
    }

    private resample(pcm: Float32Array, fromRate: number, toRate: number): Float32Array {
        const ratio = fromRate / toRate;
        const newLength = Math.floor(pcm.length / ratio);
        const resampled = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const sourceIndex = i * ratio;
            const index0 = Math.floor(sourceIndex);
            const index1 = Math.min(index0 + 1, pcm.length - 1);
            const fraction = sourceIndex - index0;

            resampled[i] = pcm[index0] * (1 - fraction) + pcm[index1] * fraction;
        }

        return resampled;
    }
}

Container.register(DevAudioSegmentExtractor, () => new DevAudioSegmentExtractor(Container.get(AppLogger)));
