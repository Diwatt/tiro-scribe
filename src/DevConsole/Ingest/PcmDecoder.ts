import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AudioResampler } from './AudioResampler';
import { PcmSampleConverter } from './PcmSampleConverter';
import { SourceIngestException } from './SourceIngestException';
import { WavHeader } from './WavHeader';

/**
 * PcmDecoder – Detects the audio byte format (WAV or raw PCM), validates it
 * and decodes it to normalized Float32Array PCM at the target sample rate.
 * Single responsibility: bytes in, mono 16 kHz float PCM out.
 *
 * Stereo WAVs are mixed to mono. Non-16kHz WAVs are resampled.
 *
 * DEV ONLY. Not for production use.
 */
export class PcmDecoder {
    public static readonly TARGET_SAMPLE_RATE = 16000;

    public constructor(
        private readonly logger: AppLogger,
        private readonly sampleConverter: PcmSampleConverter,
    ) {}

    public decode(bytes: Uint8Array, path: string): Float32Array {
        if (this.isWavFile(bytes)) {
            return this.parseWavToPcm(bytes);
        }

        if (this.isRawPcmFile(path)) {
            return this.parseRawPcmToFloat32(bytes);
        }

        throw new SourceIngestException(
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
            throw new SourceIngestException(
                `Unsupported WAV format: ${header.audioFormat} (only PCM format 1 is supported)`,
                'UNSUPPORTED_WAV_FORMAT',
            );
        }

        if (!header.isSupportedBitDepth) {
            throw new SourceIngestException(
                `Unsupported bit depth: ${header.bitsPerSample} (only 16-bit is supported)`,
                'UNSUPPORTED_BIT_DEPTH',
            );
        }

        if (!header.isSupportedChannels) {
            throw new SourceIngestException(
                `Unsupported channel count: ${header.channels} (only mono or stereo is supported)`,
                'UNSUPPORTED_CHANNEL_COUNT',
            );
        }

        const pcmData = bytes.subarray(header.dataOffset, header.dataOffset + header.dataSize);
        const int16Array = new Int16Array(
            pcmData.buffer,
            pcmData.byteOffset,
            pcmData.length / PcmSampleConverter.BYTES_PER_SAMPLE,
        );

        let floatPcm: Float32Array;

        if (header.channels === WavHeader.MONO_CHANNELS) {
            floatPcm = this.sampleConverter.int16ToFloat32(int16Array);
        } else {
            floatPcm = this.sampleConverter.stereoToMono(int16Array);
        }

        if (header.sampleRate !== PcmDecoder.TARGET_SAMPLE_RATE) {
            this.logger.info('PcmDecoder: resampling WAV', {
                fromRate: header.sampleRate,
                toRate: PcmDecoder.TARGET_SAMPLE_RATE,
            });
            return AudioResampler.resample(floatPcm, header.sampleRate, PcmDecoder.TARGET_SAMPLE_RATE);
        }

        return floatPcm;
    }

    private parseRawPcmToFloat32(bytes: Uint8Array): Float32Array {
        const int16Array = new Int16Array(
            bytes.buffer,
            bytes.byteOffset,
            bytes.length / PcmSampleConverter.BYTES_PER_SAMPLE,
        );
        return this.sampleConverter.int16ToFloat32(int16Array);
    }
}

Container.register(PcmDecoder, () => new PcmDecoder(Container.get(AppLogger), Container.get(PcmSampleConverter)));
